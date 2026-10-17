import { useState } from "react";
import { flow1, flow1Error, money } from "./api";
import type { Estimate, Location, Trip } from "./api";

export function MapDataAttribution({ text }: { text?: string | null }) {
  if (!text) return null;
  return text.includes("Geoapify") ? <small>Powered by <a href="https://www.geoapify.com/">Geoapify</a> · © <a
    href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors (ODbL)</a></small> : <small>{text}</small>;
}

function LocationField({ label, value, onChange, guest }: { label: string; value: Location; onChange: (value: Location) => void; guest: boolean }) {
  const [matches, setMatches] = useState<Awaited<ReturnType<typeof flow1.search>>>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function search() {
    setBusy(true); setError(""); setMatches([]);
    try { const result = await flow1.search(value.address, value.country, guest); setMatches(result); if (!result.length) setError("Không tìm thấy địa điểm phù hợp."); }
    catch (e) { setError(flow1Error(e)); } finally { setBusy(false); }
  }
  return <fieldset><legend>{label}</legend>
    <label>Địa chỉ<input required maxLength={255} value={value.address} onChange={e => {
      onChange({ ...value, address: e.target.value, lat: 0, lng: 0, mapProvider: undefined, geocodingProvider: undefined }); setMatches([]);
    }} /></label>
    <button type="button" disabled={busy || !value.address.trim()} onClick={search}>{busy ? "Đang tìm…" : "Tìm địa điểm"}</button>
    {value.lat !== 0 && <p>Đã chọn địa điểm để tính lộ trình.</p>}
    {value.lat !== 0 && value.mapProvider === "MAPBOX" && <img className="flow1-map-preview"
      alt={`Bản đồ Mapbox: ${label}`} src={flow1.mapPreviewUrl(value)} />}
    {value.lat !== 0 && value.geocodingProvider === "GEOAPIFY" && <MapDataAttribution text="Geoapify" />}
    {error && <p role="alert">{error}</p>}
    <ul>{matches.map((m, i) => <li key={i}><button type="button" onClick={() => {
      onChange({ address: m.label.slice(0, 255), lat: m.point.latitude, lng: m.point.longitude, country: m.point.countryCode,
        mapProvider: m.previewProvider ?? m.provider, geocodingProvider: m.provider }); setMatches([]);
    }}>{m.label}</button><MapDataAttribution text={m.attribution} /></li>)}</ul>
  </fieldset>;
}
export function TripFields({ trip, onChange, guest = false, hideDepartureDate = false, fixedHorseCount }: { trip: Trip; onChange: (value: Trip) => void; guest?: boolean; hideDepartureDate?: boolean; fixedHorseCount?: number }) {
  return <>
    <label>Tuyến vận chuyển<select value={trip.delivery.country} onChange={e => onChange({ ...trip,
      delivery: { address: "", lat: 0, lng: 0, country: e.target.value }, preferredTransportMode: e.target.value === "JP" ? "AIR" : "ROAD" })}>
      <option value="VN">Việt Nam → Việt Nam · Đường bộ</option><option value="JP">Việt Nam → Nhật Bản · Hàng không</option>
    </select></label>
    {!hideDepartureDate && <label>Ngày khởi hành mong muốn<input required type="date" value={trip.desiredDepartureDate} onChange={e => onChange({ ...trip, desiredDepartureDate: e.target.value })} /></label>}
    {fixedHorseCount == null ? <label>Số ngựa<input required type="number" min={1} max={100} value={trip.horseCount} onChange={e => onChange({ ...trip, horseCount: Number(e.target.value) })} /></label> : <p>Số ngựa đã chọn: {fixedHorseCount}</p>}
    <LocationField label="Điểm lấy ngựa (Việt Nam)" value={trip.pickup} onChange={pickup => onChange({ ...trip, pickup })} guest={guest} />
    <LocationField label="Điểm giao ngựa" value={trip.delivery} onChange={delivery => onChange({ ...trip, delivery })} guest={guest} />
  </>;
}
export function EstimateSummary({ value }: { value: Estimate }) {
  return <aside className="flow1-estimate"><h2>Giá tham khảo: {money(value.estimatedPrice)}</h2>
    <p>Cọc dự kiến 40%: {money(value.estimatedDeposit)}. Giá chính thức sẽ có trong hợp đồng.</p>
    <p>Chuẩn bị tối thiểu {value.minimumPreparationDays} ngày · ngày sớm nhất {value.earliestDepartureDate}.</p>
    {value.roadDistanceKm != null ? <p>Cự ly đường bộ: {value.roadDistanceKm.toFixed(1)} km.</p> :
      <p>Dự toán chỉ bao gồm chặng sân bay → sân bay; chưa gồm vận chuyển đường bộ hai đầu.</p>}
    <MapDataAttribution text={value.attribution || value.locationAttribution} />
  </aside>;
}
