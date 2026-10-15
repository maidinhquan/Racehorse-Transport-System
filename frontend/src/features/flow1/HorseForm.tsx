import { useRef, useState } from "react";
import { flow1, flow1Error } from "./api";
import type { Horse } from "./api";

export function HorseForm({ onCreated, horse }: { onCreated: (horse?: Horse) => void; horse?: Horse }) {
  const key = useRef(crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <form className="flow1-horse-form" onChange={() => { key.current = crypto.randomUUID(); }} onSubmit={async e => {
    e.preventDefault(); setBusy(true); setError("");
    const fields = new FormData(e.currentTarget);
    const data = new FormData();
    data.append("photo", fields.get("photo") as File); data.append("passportScan", fields.get("passportScan") as File);
    if (!horse || horse.documentVersion === 0) data.append("payload", JSON.stringify({ name: fields.get("name"), microchipIso: fields.get("microchipIso"),
      feiPassportNo: fields.get("feiPassportNo"), breed: fields.get("breed"), sex: fields.get("sex"),
      weight: Number(fields.get("weight")), dob: fields.get("dob") }));
    try {
      if (horse) {
        data.append("expectedVersion", String(horse.documentVersion));
        await flow1.updateDocuments(horse.horseId, data, key.current); onCreated();
      } else {
        const created = await flow1.createHorse(data, key.current); key.current = crypto.randomUUID(); onCreated(created);
      }
    } catch (e) { setError(flow1Error(e)); } finally { setBusy(false); }
  }}>
    <h3>{horse ? `Cập nhật hồ sơ ${horse.name}` : "Thêm ngựa"}</h3>
    {(!horse || horse.documentVersion === 0) && <>
      <label>Tên ngựa<input required name="name" maxLength={100} defaultValue={horse?.name} /></label>
      <label>Microchip ISO (15 chữ số)<input required name="microchipIso" pattern="[0-9]{15}" defaultValue={horse?.microchipIso} readOnly={!!horse} /></label>
      <label>Số hộ chiếu FEI<input required name="feiPassportNo" maxLength={50} defaultValue={horse?.feiPassportNo} /></label>
      <label>Giống<input required name="breed" maxLength={100} /></label>
      <label>Giới tính<select name="sex"><option value="STALLION">Đực</option><option value="MARE">Cái</option><option value="GELDING">Đực đã thiến</option></select></label>
      <label>Khối lượng (kg)<input required type="number" name="weight" min={1} max={2000} step="0.01" /></label>
      <label>Ngày sinh<input required type="date" name="dob" /></label>
    </>}
    <label>Ảnh ngựa (PNG/JPEG, tối đa 5 MB)<input required type="file" name="photo" accept="image/png,image/jpeg" /></label>
    <label>Scan hộ chiếu (PDF/PNG/JPEG, tối đa 5 MB)<input required type="file" name="passportScan" accept="application/pdf,image/png,image/jpeg" /></label>
    {error && <p role="alert">{error}</p>}
    <button disabled={busy} type="submit">{busy ? "Đang lưu…" : "Lưu hồ sơ ngựa"}</button>
  </form>;
}
