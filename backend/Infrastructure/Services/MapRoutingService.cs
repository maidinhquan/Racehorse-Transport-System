using System.Globalization;
using System.Text.Json;
using Application.DTOs;
using Application.Interfaces;
using Microsoft.Extensions.Configuration;

namespace Infrastructure.Services
{
    /// <summary>
    /// Dịch vụ chuyên trách tích hợp Map API:
    /// - Định tuyến tải trọng & tĩnh không cho xe chở ngựa chuyên dụng (Geoapify Truck Routing)
    /// - Cập nhật tình trạng ùn tắc giao thông & công trình sửa đường thời gian thực (Mapbox Live Traffic)
    /// - Định tuyến dự phòng OpenStreetMap (OSRM)
    /// - Dự phòng nội suy toán học khi mất mạng hoàn toàn (Haversine Fallback)
    /// - Địa mã hóa tìm kiếm vị trí (Mapbox & Geoapify Geocoding)
    /// </summary>
    public class MapRoutingService : IMapRoutingService
    {
        private readonly IConfiguration? _configuration;
        private readonly IHttpClientFactory? _httpClientFactory;

        public MapRoutingService(
            IConfiguration? configuration = null,
            IHttpClientFactory? httpClientFactory = null)
        {
            _configuration = configuration;
            _httpClientFactory = httpClientFactory;
        }

        // =========================================================================
        // 1. TÍNH TOÁN TUYẾN ĐƯỜNG ĐA TẦNG (MULTI-TIER ROUTING ENGINE)
        // =========================================================================
        public async Task<(decimal distanceKm, int durationMinutes, List<double[]> path, string source, string trafficCondition)> CalculateLegRoutingAsync(
            double fromLat, double fromLng, double toLat, double toLng,
            decimal weightTons = 10.0m, decimal heightMeters = 3.8m,
            CancellationToken ct = default)
        {
            var fromLatStr = fromLat.ToString(CultureInfo.InvariantCulture);
            var fromLngStr = fromLng.ToString(CultureInfo.InvariantCulture);
            var toLatStr = toLat.ToString(CultureInfo.InvariantCulture);
            var toLngStr = toLng.ToString(CultureInfo.InvariantCulture);

            // -------------------------------------------------------------------------
            // LỚP 1: Geoapify Truck Routing API
            // Tuyến đường chuyên dụng cho xe tải/xe chở ngựa lớn & kiểm soát tải trọng cầu, chiều cao hầm
            // -------------------------------------------------------------------------
            var geoapifyKey = _configuration?["Maps:Geoapify:ApiKey"]
                ?? _configuration?["Flow1:Maps:Geoapify:ApiKey"]
                ?? "167c9593184a44aaa2dc377cea7535f6";

            if (!string.IsNullOrWhiteSpace(geoapifyKey) && _httpClientFactory != null)
            {
                try
                {
                    var client = _httpClientFactory.CreateClient("GeoapifyClient");
                    var weightStr = weightTons.ToString("0.#", CultureInfo.InvariantCulture);
                    var heightStr = heightMeters.ToString("0.#", CultureInfo.InvariantCulture);

                    // mode=truck kết hợp truck_weight (tránh cầu yếu quá tải) & truck_height (tránh gầm cầu/hầm thấp)
                    var url = $"https://api.geoapify.com/v1/routing?waypoints={fromLatStr},{fromLngStr}|{toLatStr},{toLngStr}&mode=truck&truck_weight={weightStr}&truck_height={heightStr}&truck_width=2.5&truck_axle_load=6.0&traffic=approximated&apiKey={geoapifyKey}&format=geojson";

                    using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
                    cts.CancelAfter(TimeSpan.FromSeconds(8));

                    var response = await client.GetAsync(url, cts.Token);
                    if (response.IsSuccessStatusCode)
                    {
                        var json = await response.Content.ReadAsStringAsync(cts.Token);
                        using var doc = JsonDocument.Parse(json);
                        if (doc.RootElement.TryGetProperty("features", out var features) && features.GetArrayLength() > 0)
                        {
                            var firstFeature = features[0];
                            var props = firstFeature.GetProperty("properties");
                            var distanceMeters = props.GetProperty("distance").GetDouble();
                            var durationSeconds = props.GetProperty("time").GetDouble();
                            var distKm = Math.Round((decimal)(distanceMeters / 1000.0), 1);
                            var durMin = (int)Math.Ceiling(durationSeconds / 60.0);

                            var path = new List<double[]>();
                            if (firstFeature.TryGetProperty("geometry", out var geom) && geom.TryGetProperty("coordinates", out var coords))
                            {
                                var type = geom.TryGetProperty("type", out var t) ? t.GetString() : "LineString";
                                if (type == "MultiLineString")
                                {
                                    foreach (var line in coords.EnumerateArray())
                                    {
                                        foreach (var pt in line.EnumerateArray())
                                        {
                                            var lng = pt[0].GetDouble();
                                            var lat = pt[1].GetDouble();
                                            path.Add(new double[] { Math.Round(lat, 5), Math.Round(lng, 5) });
                                        }
                                    }
                                }
                                else
                                {
                                    foreach (var pt in coords.EnumerateArray())
                                    {
                                        var lng = pt[0].GetDouble();
                                        var lat = pt[1].GetDouble();
                                        path.Add(new double[] { Math.Round(lat, 5), Math.Round(lng, 5) });
                                    }
                                }
                            }

                            if (path.Count > 0)
                            {
                                // Kết hợp kiểm tra lưu lượng kẹt xe & công trình thời gian thực qua Mapbox Live Traffic
                                string liveTraffic = "FLOWING";
                                try
                                {
                                    var trafficToken = _configuration?["Maps:Mapbox:AccessToken"]
                                        ?? _configuration?["Flow1:Maps:Mapbox:AccessToken"]
                                        ?? "pk.eyJ1IjoiaWNld29ybSIsImEiOiJjbXZhY3RyazQwM3k2MndvbWhsN2Fmb29tIn0.20kPK7DHlQJDDbjXdhAQCw";
                                    if (!string.IsNullOrWhiteSpace(trafficToken))
                                    {
                                        var mapboxClient = _httpClientFactory.CreateClient("MapboxClient");
                                        var trafficUrl = $"https://api.mapbox.com/directions/v5/mapbox/driving-traffic/{fromLngStr},{fromLatStr};{toLngStr},{toLatStr}?overview=simplified&annotations=congestion&access_token={trafficToken}";
                                        using var trafficCts = new CancellationTokenSource(TimeSpan.FromSeconds(4));
                                        var trafficRes = await mapboxClient.GetAsync(trafficUrl, trafficCts.Token);
                                        if (trafficRes.IsSuccessStatusCode)
                                        {
                                            var trafficJson = await trafficRes.Content.ReadAsStringAsync(trafficCts.Token);
                                            using var trafficDoc = JsonDocument.Parse(trafficJson);
                                            if (trafficDoc.RootElement.TryGetProperty("routes", out var tRoutes) && tRoutes.GetArrayLength() > 0)
                                            {
                                                var tr = tRoutes[0];
                                                if (tr.TryGetProperty("duration", out var durVal))
                                                {
                                                    var trafficDurMin = (int)Math.Ceiling(durVal.GetDouble() / 60.0);
                                                    if (trafficDurMin > durMin) durMin = trafficDurMin;
                                                }
                                                if (tr.TryGetProperty("legs", out var legsArr) && legsArr.GetArrayLength() > 0)
                                                {
                                                    var leg0 = legsArr[0];
                                                    if (leg0.TryGetProperty("annotation", out var annot) && annot.TryGetProperty("congestion", out var congArr))
                                                    {
                                                        var severes = congArr.EnumerateArray().Count(c => c.GetString() == "severe");
                                                        var heavies = congArr.EnumerateArray().Count(c => c.GetString() == "heavy");
                                                        if (severes > 2) liveTraffic = "SEVERE_CONGESTION";
                                                        else if (heavies > 3) liveTraffic = "HEAVY_CONGESTION";
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                                catch
                                {
                                    // Bỏ qua lỗi check traffic thời gian thực, giữ nguyên tuyến an toàn xe tải
                                }

                                return (distKm, durMin, path, "GEOAPIFY_TRUCK_ROUTING", liveTraffic);
                            }
                        }
                    }
                }
                catch
                {
                    // Fallback sang Lớp 2 (Mapbox Driving-Traffic)
                }
            }

            // -------------------------------------------------------------------------
            // LỚP 2: Mapbox Directions API (Driving-Traffic: Kẹt xe & đường sửa chữa thời gian thực)
            // -------------------------------------------------------------------------
            var token = _configuration?["Maps:Mapbox:AccessToken"]
                ?? _configuration?["Flow1:Maps:Mapbox:AccessToken"]
                ?? "pk.eyJ1IjoiaWNld29ybSIsImEiOiJjbXZhY3RyazQwM3k2MndvbWhsN2Fmb29tIn0.20kPK7DHlQJDDbjXdhAQCw";

            if (!string.IsNullOrWhiteSpace(token) && _httpClientFactory != null)
            {
                try
                {
                    var client = _httpClientFactory.CreateClient("MapboxClient");

                    // Chuyển sang mapbox/driving-traffic và bổ sung annotations=congestion,duration
                    var url = $"https://api.mapbox.com/directions/v5/mapbox/driving-traffic/{fromLngStr},{fromLatStr};{toLngStr},{toLatStr}?geometries=geojson&overview=full&annotations=congestion,duration&access_token={token}";

                    using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
                    cts.CancelAfter(TimeSpan.FromSeconds(8));

                    var response = await client.GetAsync(url, cts.Token);
                    if (response.IsSuccessStatusCode)
                    {
                        var json = await response.Content.ReadAsStringAsync(cts.Token);
                        using var doc = JsonDocument.Parse(json);
                        if (doc.RootElement.TryGetProperty("routes", out var routes) && routes.GetArrayLength() > 0)
                        {
                            var firstRoute = routes[0];
                            var distanceMeters = firstRoute.GetProperty("distance").GetDouble();
                            var durationSeconds = firstRoute.GetProperty("duration").GetDouble();
                            var distKm = Math.Round((decimal)(distanceMeters / 1000.0), 1);
                            var durMin = (int)Math.Ceiling(durationSeconds / 60.0);

                            string trafficStatus = "FLOWING";
                            if (firstRoute.TryGetProperty("legs", out var legsArr) && legsArr.GetArrayLength() > 0)
                            {
                                var leg0 = legsArr[0];
                                if (leg0.TryGetProperty("annotation", out var annot) && annot.TryGetProperty("congestion", out var congArr))
                                {
                                    var severes = congArr.EnumerateArray().Count(c => c.GetString() == "severe");
                                    var heavies = congArr.EnumerateArray().Count(c => c.GetString() == "heavy");
                                    if (severes > 2) trafficStatus = "SEVERE_CONGESTION";
                                    else if (heavies > 3) trafficStatus = "HEAVY_CONGESTION";
                                }
                            }

                            var path = new List<double[]>();
                            if (firstRoute.TryGetProperty("geometry", out var geom) && geom.TryGetProperty("coordinates", out var coords))
                            {
                                foreach (var pt in coords.EnumerateArray())
                                {
                                    var lng = pt[0].GetDouble();
                                    var lat = pt[1].GetDouble();
                                    path.Add(new double[] { Math.Round(lat, 5), Math.Round(lng, 5) });
                                }
                            }

                            if (path.Count == 0)
                            {
                                path = GenerateInterpolatedPoints(fromLat, fromLng, toLat, toLng, 6);
                            }

                            return (distKm, durMin, path, "MAPBOX_LIVE_TRAFFIC", trafficStatus);
                        }
                    }
                }
                catch
                {
                    // Fallback sang OSRM
                }
            }

            // -------------------------------------------------------------------------
            // LỚP 3: OSRM Routing (OpenStreetMap public router, 100% miễn phí, không cần token)
            // -------------------------------------------------------------------------
            if (_httpClientFactory != null)
            {
                try
                {
                    var client = _httpClientFactory.CreateClient();
                    client.DefaultRequestHeaders.TryAddWithoutValidation("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) RaceHorseTransport/1.0");
                    var url = $"https://router.project-osrm.org/route/v1/driving/{fromLngStr},{fromLatStr};{toLngStr},{toLatStr}?overview=full&geometries=geojson";

                    using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
                    cts.CancelAfter(TimeSpan.FromSeconds(8));

                    var response = await client.GetAsync(url, cts.Token);
                    if (response.IsSuccessStatusCode)
                    {
                        var json = await response.Content.ReadAsStringAsync(cts.Token);
                        using var doc = JsonDocument.Parse(json);
                        if (doc.RootElement.TryGetProperty("routes", out var routes) && routes.GetArrayLength() > 0)
                        {
                            var firstRoute = routes[0];
                            var distanceMeters = firstRoute.GetProperty("distance").GetDouble();
                            var durationSeconds = firstRoute.GetProperty("duration").GetDouble();
                            var distKm = Math.Round((decimal)(distanceMeters / 1000.0), 1);
                            var durMin = (int)Math.Ceiling(durationSeconds / 60.0);

                            var path = new List<double[]>();
                            if (firstRoute.TryGetProperty("geometry", out var geom) && geom.TryGetProperty("coordinates", out var coords))
                            {
                                foreach (var pt in coords.EnumerateArray())
                                {
                                    var lng = pt[0].GetDouble();
                                    var lat = pt[1].GetDouble();
                                    path.Add(new double[] { Math.Round(lat, 5), Math.Round(lng, 5) });
                                }
                            }

                            if (path.Count > 0)
                            {
                                return (distKm, durMin, path, "OSRM_DIRECTIONS", "NORMAL");
                            }
                        }
                    }
                }
                catch
                {
                    // Fallback sang Haversine
                }
            }

            // -------------------------------------------------------------------------
            // LỚP 4: Haversine Fallback (Đường thẳng chỉ dùng khi máy mất hoàn toàn kết nối Internet)
            // -------------------------------------------------------------------------
            var dist = (decimal)CalculateDistance(fromLat, fromLng, toLat, toLng);
            if (dist < 5) dist = 35;
            var driveHours = dist / 50.0m;
            var durMinutes = (int)(driveHours * 60);
            var fallbackPath = GenerateInterpolatedPoints(fromLat, fromLng, toLat, toLng, 6);
            return (Math.Round(dist, 1), durMinutes, fallbackPath, "HAVERSINE_FALLBACK", "UNKNOWN");
        }

        // =========================================================================
        // 2. TÌM KIẾM ĐỊA CHỈ & TỌA ĐỘ (GEOCODING ENGINE)
        // =========================================================================
        public async Task<List<CheckpointDto>> GeocodeAddressAsync(string address, string? country = "VN")
        {
            var result = new List<CheckpointDto>();
            if (string.IsNullOrWhiteSpace(address)) return result;

            int id = 500;
            var cCode = string.IsNullOrWhiteSpace(country) ? "VN" : country.Trim().ToUpper();

            // 1. Try Mapbox Geocoding (high accuracy for Vietnamese and international free-text addresses)
            var mapboxToken = _configuration?["Maps:Mapbox:AccessToken"]
                ?? _configuration?["Flow1:Maps:Mapbox:AccessToken"]
                ?? "pk.eyJ1IjoiaWNld29ybSIsImEiOiJjbXZhY3RyazQwM3k2MndvbWhsN2Fmb29tIn0.20kPK7DHlQJDDbjXdhAQCw";

            if (!string.IsNullOrWhiteSpace(mapboxToken) && _httpClientFactory != null)
            {
                try
                {
                    var client = _httpClientFactory.CreateClient("MapboxClient");
                    var countryParam = !string.IsNullOrWhiteSpace(cCode) ? $"&country={cCode.ToLower()}" : "";
                    var url = $"https://api.mapbox.com/geocoding/v5/mapbox.places/{Uri.EscapeDataString(address)}.json?access_token={mapboxToken}{countryParam}&language=vi,en";

                    using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(8));
                    var response = await client.GetAsync(url, cts.Token);
                    if (response.IsSuccessStatusCode)
                    {
                        var json = await response.Content.ReadAsStringAsync(cts.Token);
                        using var doc = JsonDocument.Parse(json);
                        if (doc.RootElement.TryGetProperty("features", out var features))
                        {
                            foreach (var feat in features.EnumerateArray())
                            {
                                string placeName = feat.TryGetProperty("place_name", out var pn) ? pn.GetString() ?? address : address;
                                decimal lat = 0;
                                decimal lng = 0;

                                if (feat.TryGetProperty("center", out var center) && center.GetArrayLength() >= 2)
                                {
                                    lng = (decimal)center[0].GetDouble();
                                    lat = (decimal)center[1].GetDouble();
                                }
                                else if (feat.TryGetProperty("geometry", out var geom) && geom.TryGetProperty("coordinates", out var coords) && coords.GetArrayLength() >= 2)
                                {
                                    lng = (decimal)coords[0].GetDouble();
                                    lat = (decimal)coords[1].GetDouble();
                                }

                                if (lat != 0 && lng != 0)
                                {
                                    result.Add(new CheckpointDto
                                    {
                                        CheckpointId = ++id,
                                        Name = placeName,
                                        Country = cCode,
                                        Type = "CUSTOM_LOCATION",
                                        Lat = lat,
                                        Lng = lng,
                                        Active = true
                                    });
                                }
                            }
                            if (result.Count > 0) return result;
                        }
                    }
                }
                catch
                {
                    // Fallthrough to Geoapify
                }
            }

            // 2. Try Geoapify Geocoding
            var geoapifyKey = _configuration?["Maps:Geoapify:ApiKey"]
                ?? _configuration?["Flow1:Maps:Geoapify:ApiKey"]
                ?? "167c9593184a44aaa2dc377cea7535f6";

            if (!string.IsNullOrWhiteSpace(geoapifyKey) && _httpClientFactory != null)
            {
                try
                {
                    var client = _httpClientFactory.CreateClient("GeoapifyClient");
                    var countryFilter = !string.IsNullOrWhiteSpace(cCode) ? $"&filter=countrycode:{cCode.ToLower()}" : "";
                    var url = $"https://api.geoapify.com/v1/geocode/search?text={Uri.EscapeDataString(address)}{countryFilter}&apiKey={geoapifyKey}";

                    using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(8));
                    var response = await client.GetAsync(url, cts.Token);
                    if (response.IsSuccessStatusCode)
                    {
                        var json = await response.Content.ReadAsStringAsync(cts.Token);
                        using var doc = JsonDocument.Parse(json);
                        if (doc.RootElement.TryGetProperty("features", out var features))
                        {
                            foreach (var feat in features.EnumerateArray())
                            {
                                var props = feat.GetProperty("properties");
                                var geom = feat.GetProperty("geometry").GetProperty("coordinates");
                                var lng = (decimal)geom[0].GetDouble();
                                var lat = (decimal)geom[1].GetDouble();
                                var formatted = props.TryGetProperty("formatted", out var f) ? f.GetString() : address;
                                var countryCode = props.TryGetProperty("country_code", out var cc) ? cc.GetString()?.ToUpper() : cCode;

                                result.Add(new CheckpointDto
                                {
                                    CheckpointId = ++id,
                                    Name = formatted ?? address,
                                    Country = countryCode ?? cCode,
                                    Type = "CUSTOM_LOCATION",
                                    Lat = lat,
                                    Lng = lng,
                                    Active = true
                                });
                            }
                            if (result.Count > 0) return result;
                        }
                    }
                }
                catch
                {
                    // Fallthrough to heuristics
                }
            }

            // 3. Intelligent Heuristic Fallback for known horse transport hubs
            var lower = address.ToLowerInvariant();
            if (lower.Contains("củ chi") || lower.Contains("cu chi"))
            {
                result.Add(new CheckpointDto { CheckpointId = ++id, Name = $"{address} (Khu vực Củ Chi, TP.HCM)", Country = "VN", Type = "CUSTOM_LOCATION", Lat = 10.9744m, Lng = 106.4949m, Active = true });
                return result;
            }
            if (lower.Contains("ba vì") || lower.Contains("ba vi"))
            {
                result.Add(new CheckpointDto { CheckpointId = ++id, Name = $"{address} (Khu huấn luyện Ba Vì, Hà Nội)", Country = "VN", Type = "CUSTOM_LOCATION", Lat = 21.0820m, Lng = 105.3560m, Active = true });
                return result;
            }
            if (lower.Contains("sóc sơn") || lower.Contains("soc son"))
            {
                result.Add(new CheckpointDto { CheckpointId = ++id, Name = $"{address} (Trang trại Sóc Sơn, Hà Nội)", Country = "VN", Type = "CUSTOM_LOCATION", Lat = 21.2820m, Lng = 105.8500m, Active = true });
                return result;
            }
            if (lower.Contains("tân sơn nhất") || lower.Contains("tan son nhat") || lower.Contains("sgn"))
            {
                result.Add(new CheckpointDto { CheckpointId = ++id, Name = "Sân bay Quốc tế Tân Sơn Nhất (SGN)", Country = "VN", Type = "AIRPORT", Lat = 10.8188m, Lng = 106.6520m, Active = true });
                return result;
            }
            if (lower.Contains("nội bài") || lower.Contains("noi bai") || lower.Contains("han"))
            {
                result.Add(new CheckpointDto { CheckpointId = ++id, Name = "Sân bay Quốc tế Nội Bài (HAN)", Country = "VN", Type = "AIRPORT", Lat = 21.2188m, Lng = 105.8044m, Active = true });
                return result;
            }
            if (lower.Contains("narita") || lower.Contains("nrt"))
            {
                result.Add(new CheckpointDto { CheckpointId = ++id, Name = "Sân bay Quốc tế Narita (NRT)", Country = "JP", Type = "AIRPORT", Lat = 35.7720m, Lng = 140.3929m, Active = true });
                return result;
            }
            if (lower.Contains("tokyo") || lower.Contains("fuchu") || lower.Contains("japan"))
            {
                result.Add(new CheckpointDto { CheckpointId = ++id, Name = $"{address} (Khu vực Tokyo, Nhật Bản)", Country = "JP", Type = "CUSTOM_LOCATION", Lat = 35.6631m, Lng = 139.4828m, Active = true });
                return result;
            }

            // 4. Default coordinate if user typed a custom street name not found in external maps
            decimal defLat = cCode == "JP" ? 35.6762m : 10.8231m;
            decimal defLng = cCode == "JP" ? 139.6503m : 106.6297m;
            result.Add(new CheckpointDto
            {
                CheckpointId = ++id,
                Name = $"{address} (Vị trí tùy chỉnh)",
                Country = cCode,
                Type = "CUSTOM_LOCATION",
                Lat = defLat,
                Lng = defLng,
                Active = true
            });

            return result;
        }

        // =========================================================================
        // 3. TOÁN HỌC ĐỊA LÝ & NỘI SUY TỌA ĐỘ
        // =========================================================================
        public double CalculateDistance(double lat1, double lon1, double lat2, double lon2)
        {
            const double r = 6371; // Earth radius in km
            var dLat = (lat2 - lat1) * Math.PI / 180.0;
            var dLon = (lon2 - lon1) * Math.PI / 180.0;
            var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                    Math.Cos(lat1 * Math.PI / 180.0) * Math.Cos(lat2 * Math.PI / 180.0) *
                    Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
            var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
            return r * c;
        }

        public List<double[]> GenerateInterpolatedPoints(double lat1, double lon1, double lat2, double lon2, int count)
        {
            var list = new List<double[]> { new double[] { lat1, lon1 } };
            for (int i = 1; i <= count; i++)
            {
                double fraction = (double)i / (count + 1);
                double intermediateLat = lat1 + (lat2 - lat1) * fraction;
                double intermediateLng = lon1 + (lon2 - lon1) * fraction;
                list.Add(new double[] { Math.Round(intermediateLat, 4), Math.Round(intermediateLng, 4) });
            }
            list.Add(new double[] { lat2, lon2 });
            return list;
        }
    }
}

