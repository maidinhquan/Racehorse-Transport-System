import { useState } from "react";

import CustomerLayout from "../../../../shared/layouts/CustomerLayout/CustomerLayout";

import {
  trackingTrips,
  type TripTracking,
} from "../../data/tripTrackingMockData";

import "./TripTrackingPage.css";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function TripTrackingPage() {
  const [selectedTripId, setSelectedTripId] =
    useState(trackingTrips[0]?.id ?? "");

  const selectedTrip: TripTracking | undefined =
    trackingTrips.find(
      (trip) => trip.id === selectedTripId
    );

  if (!selectedTrip) {
    return (
      <CustomerLayout pageTitle="Trip Tracking">
        <div className="tracking-empty">
          No trips are currently in transit.
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout pageTitle="Trip Tracking">
      <div className="tracking-page">
        {/* Header */}
        <div className="tracking-page-header">
          <div>
            <h1>Trip Tracking</h1>

            <p>
              Track the current status and progress of
              your horse transport.
            </p>
          </div>

          <div className="tracking-selector">
            <label>Select Transport</label>

            <select
              value={selectedTripId}
              onChange={(event) =>
                setSelectedTripId(
                  event.target.value
                )
              }
            >
              {trackingTrips.map((trip) => (
                <option
                  key={trip.id}
                  value={trip.id}
                >
                  {trip.id} - {trip.horseName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Main area */}
        <div className="tracking-main-grid">
          {/* Map */}
          <section className="tracking-card tracking-map-card">
            <div className="tracking-map-header">
              <div>
                <div className="tracking-trip-title">
                  <h2>{selectedTrip.id}</h2>

                  <span className="tracking-status">
                    In Transit
                  </span>
                </div>

                <p>
                  Horse:{" "}
                  <strong>
                    {selectedTrip.horseName}
                  </strong>
                </p>
              </div>

              <div className="tracking-route">
                <span>
                  {selectedTrip.origin}
                </span>

                <span className="tracking-route-arrow">
                  →
                </span>

                <span>
                  {selectedTrip.destination}
                </span>
              </div>
            </div>

            {/* Temporary map */}
            <div className="tracking-map">
              <svg
                className="tracking-route-line"
                viewBox="0 0 1000 420"
                preserveAspectRatio="none"
              >
                <path
                  d="M140 310 C300 280, 330 200, 500 210 C650 220, 700 120, 850 100"
                  fill="none"
                  stroke="#f57c00"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray="10 8"
                />
              </svg>

              {/* Start */}
              <div className="map-location map-origin">
                <div className="map-marker map-marker-start" />

                <span>
                  {selectedTrip.origin}
                </span>
              </div>

              {/* Current */}
              <div className="map-location map-current">
                <div className="current-pulse">
                  <div className="map-marker map-marker-current" />
                </div>

                <span>
                  Current Location
                </span>
              </div>

              {/* Destination */}
              <div className="map-location map-destination">
                <div className="map-marker map-marker-destination" />

                <span>
                  {selectedTrip.destination}
                </span>
              </div>
            </div>

            <div className="map-demo-notice">
              Map preview for UI demonstration. Real map,
              route polyline and vehicle GPS will be
              connected later.
            </div>
          </section>

          {/* Right side */}
          <aside className="tracking-side">
            {/* Current status */}
            <section className="tracking-card tracking-status-card">
              <span className="tracking-eyebrow">
                Current Status
              </span>

              <div className="current-status-header">
                <div className="current-status-icon">
                  ⚡
                </div>

                <div>
                  <strong>
                    {selectedTrip.currentStatus}
                  </strong>

                  <span>
                    {selectedTrip.currentPlace}
                  </span>
                </div>
              </div>

              <div className="tracking-detail-list">
                <div>
                  <span>Current Location</span>

                  <strong>
                    {
                      selectedTrip.currentLocation
                    }
                  </strong>
                </div>

                <div>
                  <span>Last Update</span>

                  <strong>
                    {selectedTrip.lastUpdate}
                  </strong>
                </div>

                <div>
                  <span>Departure</span>

                  <strong>
                    {formatDate(
                      selectedTrip.departureDate
                    )}
                  </strong>
                </div>

                <div className="tracking-detail-highlight">
                  <span>
                    Estimated Arrival
                  </span>

                  <strong>
                    {formatDate(
                      selectedTrip.estimatedArrival
                    )}
                  </strong>
                </div>
              </div>
            </section>

            {/* Updates */}
            <section className="tracking-card tracking-updates-card">
              <h3>Latest Updates</h3>

              <ul className="tracking-timeline">
                {selectedTrip.updates.map(
                  (update) => (
                    <li
                      key={update.id}
                      className={`timeline-${update.status}`}
                    >
                      <strong>
                        {update.title}
                      </strong>

                      <p>
                        {update.description}
                      </p>

                      <span>
                        {update.time}
                      </span>
                    </li>
                  )
                )}
              </ul>
            </section>
          </aside>
        </div>

        {/* Journey Progress */}
        <section className="tracking-card journey-card">
          <div className="journey-header">
            <div>
              <h2>Journey Progress</h2>

              <p>
                Overall progress of the transport
                journey.
              </p>
            </div>

            <strong>
              {selectedTrip.progress}%
            </strong>
          </div>

          <div className="journey-progress-bar">
            <div
              className="journey-progress-value"
              style={{
                width: `${selectedTrip.progress}%`,
              }}
            />
          </div>

          <div className="journey-steps">
            {selectedTrip.journeySteps.map(
              (step, index) => (
                <div
                  className={`journey-step journey-step-${step.status}`}
                  key={step.id}
                >
                  <div className="journey-step-top">
                    <div className="journey-circle">
                      {step.status ===
                      "completed"
                        ? "✓"
                        : index + 1}
                    </div>

                    {index <
                      selectedTrip
                        .journeySteps
                        .length -
                        1 && (
                      <div className="journey-line" />
                    )}
                  </div>

                  <span>
                    {step.name}
                  </span>
                </div>
              )
            )}
          </div>
        </section>
      </div>
    </CustomerLayout>
  );
}

export default TripTrackingPage;