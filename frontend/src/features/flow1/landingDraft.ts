import { emptyTrip, estimateSeed } from "./api";
import type { Trip } from "./api";

// Advisory UI hint only; the server never accepts a client quote or deposit.
export function saveLandingRoute(origin: string, destination: string, country: "VN" | "JP", count: number) {
  const trip: Trip = { ...structuredClone(emptyTrip),
    pickup: { address: origin, country: "VN", lat: 0, lng: 0 },
    delivery: { address: destination, country, lat: 0, lng: 0 },
    preferredTransportMode: country === "JP" ? "AIR" : "ROAD", horseCount: count };
  sessionStorage.setItem(estimateSeed, JSON.stringify(trip));
}
export const demoPrice = (country: string, count: number) => (country === "JP" ? 46250000 : 16250000) * Math.max(1, count);
