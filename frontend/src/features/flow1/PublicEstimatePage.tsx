import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { emptyTrip, estimateSeed, flow1, flow1Error } from "./api";
import type { Estimate } from "./api";
import { TripFields, EstimateSummary } from "./TripFields";
import "./flow1.css";

export function PublicEstimatePage() {
  const navigate = useNavigate();
  const [trip, setTrip] = useState(() => structuredClone(emptyTrip));
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  return <main className="flow1-page"><h1>Dự toán vận chuyển ngựa</h1>
    <form onSubmit={async e => {
      e.preventDefault(); setBusy(true); setError(""); setEstimate(null);
      try { setEstimate(await flow1.estimate(trip, true)); } catch (e) { setError(flow1Error(e)); } finally { setBusy(false); }
    }}>
      <TripFields trip={trip} onChange={value => { setTrip(value); setEstimate(null); }} guest />
      <button disabled={busy || !trip.pickup.lat || !trip.delivery.lat}>Tính dự toán</button>
    </form>
    {error && <p role="alert">{error}</p>}
    {estimate && <><EstimateSummary value={estimate} /><button type="button" onClick={() => {
      sessionStorage.setItem(estimateSeed, JSON.stringify(trip));
      navigate(localStorage.getItem("accessToken") ? "/customer/requests/new" : "/login?returnTo=transport-request");
    }}>Tiếp tục đặt chuyến</button></>}
    <Link to="/login">Đăng nhập</Link>
  </main>;
}
