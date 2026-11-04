using Application.DTOs;
using Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services
{
    public partial class CoordinatorService
    {
        // =========================================================================
        // PLACES CATALOG CRUD (F3-J43..J47)
        // =========================================================================

        public async Task<List<PlaceDto>> GetPlacesAsync(string? country, string? function, string? status, string? q)
        {
            var query = _context.PartnerFacilities.AsQueryable();

            if (!string.IsNullOrEmpty(country))
            {
                query = query.Where(f => f.CountryCode == country);
            }

            if (!string.IsNullOrEmpty(status))
            {
                query = query.Where(f => f.Status == status);
            }

            if (!string.IsNullOrEmpty(function))
            {
                query = query.Where(f => f.Purposes != null && f.Purposes.Contains(function));
            }

            if (!string.IsNullOrEmpty(q))
            {
                query = query.Where(f => f.Name.Contains(q) || (f.Address != null && f.Address.Contains(q)));
            }

            var facilities = await query.ToListAsync();

            return facilities.Select(f => MapFacilityToPlaceDto(f)).ToList();
        }

        public async Task<PlaceDto?> GetPlaceDetailAsync(string placeId)
        {
            var facility = await _context.PartnerFacilities.FirstOrDefaultAsync(f => f.FacilityId == placeId);
            return facility != null ? MapFacilityToPlaceDto(facility) : null;
        }

        public async Task<PlaceDto> CreatePlaceAsync(PlaceInputDto dto, string userId)
        {
            // Kiểm tra chống trùng toạ độ trong 50m
            if (dto.Geo != null)
            {
                var existing = await _context.PartnerFacilities
                    .Where(f => f.Latitude != null && f.Longitude != null)
                    .ToListAsync();

                foreach (var f in existing)
                {
                    double distM = CalculateHaversineDistanceM(dto.Geo.Lat, dto.Geo.Lng, (double)f.Latitude!.Value, (double)f.Longitude!.Value);
                    if (distM < 50.0)
                    {
                        throw new InvalidOperationException($"DUPLICATE_COORDINATES: Tọa độ nhập vào cách cơ sở '{f.Name}' ({f.FacilityId}) chỉ {distM:F1}m (vi phạm quy tắc chống trùng 50m)!");
                    }
                }
            }

            string newId = "PLACE_" + Guid.NewGuid().ToString("N")[..8].ToUpper();
            var facility = new PartnerFacility
            {
                FacilityId = newId,
                Name = dto.Name,
                CountryCode = dto.Country,
                City = dto.Province,
                Address = dto.Address,
                Purposes = string.Join(",", dto.Functions),
                OperatingHours = dto.Hours,
                ContactPerson = dto.Contact,
                ContactPhone = dto.Phone,
                Status = "ACTIVE",
                SupportsOvernight = dto.Rest?.SupportsOvernight ?? false,
                HasTruckParking = dto.Rest != null,
                HasLoadingArea = true,
                HasStabling = dto.Rest?.HasStabling ?? true,
                HasWaterFeed = dto.Rest?.HasWater ?? true,
                Latitude = dto.Geo != null ? (decimal)dto.Geo.Lat : null,
                Longitude = dto.Geo != null ? (decimal)dto.Geo.Lng : null
            };

            _context.PartnerFacilities.Add(facility);
            await _context.SaveChangesAsync();

            return MapFacilityToPlaceDto(facility);
        }

        public async Task<PlaceDto> UpdatePlaceAsync(string placeId, PlaceUpdateDto dto, string userId)
        {
            var facility = await _context.PartnerFacilities.FirstOrDefaultAsync(f => f.FacilityId == placeId);
            if (facility == null)
            {
                throw new KeyNotFoundException($"Không tìm thấy địa điểm {placeId}");
            }

            facility.Name = dto.Name;
            facility.CountryCode = dto.Country;
            facility.City = dto.Province;
            facility.Address = dto.Address;
            facility.Purposes = string.Join(",", dto.Functions);
            facility.OperatingHours = dto.Hours;
            facility.ContactPerson = dto.Contact;
            facility.ContactPhone = dto.Phone;
            if (dto.Geo != null)
            {
                facility.Latitude = (decimal)dto.Geo.Lat;
                facility.Longitude = (decimal)dto.Geo.Lng;
            }
            if (dto.Rest != null)
            {
                facility.SupportsOvernight = dto.Rest.SupportsOvernight;
                facility.HasStabling = dto.Rest.HasStabling;
                facility.HasWaterFeed = dto.Rest.HasWater;
            }

            await _context.SaveChangesAsync();
            return MapFacilityToPlaceDto(facility);
        }

        public async Task<PlaceDto> UpdatePlaceStatusAsync(string placeId, PlaceStatusDto dto, string userId)
        {
            var facility = await _context.PartnerFacilities.FirstOrDefaultAsync(f => f.FacilityId == placeId);
            if (facility == null)
            {
                throw new KeyNotFoundException($"Không tìm thấy địa điểm {placeId}");
            }

            facility.Status = dto.Status;

            await _context.SaveChangesAsync();
            return MapFacilityToPlaceDto(facility);
        }

        public async Task<DeletedDto> DeletePlaceAsync(string placeId)
        {
            var facility = await _context.PartnerFacilities.FirstOrDefaultAsync(f => f.FacilityId == placeId);
            if (facility == null)
            {
                throw new KeyNotFoundException($"Không tìm thấy địa điểm {placeId}");
            }

            // Kiểm tra địa điểm có đang được tham chiếu trong chuyến đi không
            bool isReferenced = await _context.TripPlans.AnyAsync(t => t.EffectiveOriginPlaceId == placeId);
            if (isReferenced)
            {
                throw new InvalidOperationException($"CANNOT_DELETE_PLACE: Địa điểm '{facility.Name}' đang được sử dụng làm điểm đón trong kế hoạch vận chuyển!");
            }

            _context.PartnerFacilities.Remove(facility);
            await _context.SaveChangesAsync();

            return new DeletedDto { Id = placeId, Deleted = true };
        }

        // =========================================================================
        // PRIVATE HELPERS
        // =========================================================================
        private static PlaceDto MapFacilityToPlaceDto(PartnerFacility f)
        {
            var functions = (f.Purposes ?? "REST").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();

            return new PlaceDto
            {
                Id = f.FacilityId,
                Version = 1,
                Name = f.Name,
                Country = f.CountryCode ?? "VN",
                Province = f.City ?? "TP. Hồ Chí Minh",
                Address = f.Address ?? "Địa chỉ",
                Geo = new GeoDto { Lat = (double)(f.Latitude ?? 10.7769m), Lng = (double)(f.Longitude ?? 106.7009m) },
                Functions = functions,
                Hours = f.OperatingHours ?? "24/7",
                Contact = f.ContactPerson ?? "Người đại diện",
                Phone = f.ContactPhone ?? "+84901234567",
                Notes = f.FacilityType ?? string.Empty,
                Status = f.Status ?? "ACTIVE",
                Sample = true,
                UpdatedAt = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"),
                Rest = functions.Contains("REST") ? new RestFacilitiesDto
                {
                    ParkingStalls = 10,
                    HasWater = f.HasWaterFeed,
                    HasStabling = f.HasStabling,
                    SupportsOvernight = f.SupportsOvernight
                } : null,
                Fuel = functions.Contains("FUEL") ? new FuelFacilitiesDto
                {
                    HasDiesel = true,
                    HasAdBlue = true,
                    TruckLane = true
                } : null,
                Airport = functions.Contains("AIRPORT") ? new AirportFacilitiesDto
                {
                    IataCode = f.FacilityId.Contains("SGN") ? "SGN" : (f.FacilityId.Contains("NRT") ? "NRT" : "HAN"),
                    CargoHandling = true,
                    QuarantineStationAdjacent = true
                } : null,
                Service = functions.Contains("QUARANTINE") ? new PlaceServiceDto
                {
                    QuarantineCapacity = 20,
                    CustomsOfficeHours = "08:00 - 17:00",
                    ContactVet = f.ContactPerson
                } : null
            };
        }

        private static double CalculateHaversineDistanceM(double lat1, double lon1, double lat2, double lon2)
        {
            const double R = 6371000; // Bán kính Trái Đất (mét)
            double dLat = ToRadians(lat2 - lat1);
            double dLon = ToRadians(lon2 - lon1);

            double a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                       Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
                       Math.Sin(dLon / 2) * Math.Sin(dLon / 2);

            double c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
            return R * c;
        }

        private static double ToRadians(double deg) => deg * (Math.PI / 180);
    }
}
