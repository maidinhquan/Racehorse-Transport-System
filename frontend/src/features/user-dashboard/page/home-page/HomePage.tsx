import { useNavigate } from "react-router-dom";

import CustomerLayout from "../../../../shared/layouts/CustomerLayout/CustomerLayout";
import {
  currentTrip,
  documents,
  recentRequests,
  type DocumentStatus,
  type RequestStatus,
} from "../../data/homeMockData";

import "./HomePage.css";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function getDocumentStatusClass(status: DocumentStatus) {
  switch (status) {
    case "Approved":
      return "status status-success";

    case "Action Required":
      return "status status-danger";

    case "Pending Review":
    case "Processing":
      return "status status-warning";

    default:
      return "status";
  }
}

function getRequestStatusClass(status: RequestStatus) {
  switch (status) {
    case "In Transit":
      return "status status-transit";

    case "Scheduled":
      return "status status-success";

    case "Documents Under Review":
      return "status status-processing";

    case "Waiting for Manager Review":
      return "status status-warning";

    default:
      return "status";
  }
}

function HomePage() {
  const navigate = useNavigate();

  return (
    <CustomerLayout pageTitle="Home">
      <div className="home-page">
        {/* Welcome */}
        <section className="home-card welcome-card">
          <div>
            <h1 className="home-title">Welcome back, Alex</h1>

            <p className="home-subtitle">
              Manage your horses and transport requests in one place.
            </p>
          </div>

          <button
            className="primary-button"
            onClick={() => navigate("/customer/requests/new")}
          >
            <span className="button-plus">+</span>
            Create Transport Request
          </button>
        </section>

        {/* Main dashboard */}
        <section className="home-dashboard-grid">
          {/* Current trip */}
          <article className="home-card current-trip-card">
            <div className="card-header">
              <h2>Current Trip</h2>

              <span className="status status-transit">
                In Transit
              </span>
            </div>

            <div className="trip-information">
              <div className="trip-field">
                <span className="trip-label">Horse</span>
                <strong>{currentTrip.horse}</strong>
              </div>

              <div className="trip-field">
                <span className="trip-label">Route</span>

                <strong>
                  {currentTrip.origin}
                  <span className="route-arrow">→</span>
                  {currentTrip.destination}
                </strong>
              </div>
            </div>

            <div className="progress-information">
              <span>
                Departed: {formatDate(currentTrip.departedDate)}
              </span>

              <strong>
                ETA: {formatDate(currentTrip.eta)}
              </strong>
            </div>

            <div className="trip-progress">
              <div
                className="trip-progress-value"
                style={{
                  width: `${currentTrip.progress}%`,
                }}
              />

              <span
                className="trip-progress-point"
                style={{
                  left: `${currentTrip.progress}%`,
                }}
              />
            </div>

            <p className="current-location">
              Current Location:{" "}
              <strong>{currentTrip.currentLocation}</strong>
            </p>

            <button
              className="secondary-button tracking-button"
              onClick={() =>
                navigate(`/customer/tracking/${currentTrip.id}`)
              }
            >
              View Trip Tracking
            </button>
          </article>

          {/* Documents */}
          <article className="home-card document-card">
            <h2>Document Status</h2>

            <div className="document-list">
              {documents.map((document) => {
                const needAction =
                  document.status === "Action Required";

                return (
                  <button
                    key={document.id}
                    type="button"
                    className={`document-item ${
                      needAction
                        ? "document-item-action"
                        : ""
                    }`}
                    onClick={() => {
                      if (needAction) {
                        navigate(
                          `/customer/requests/${document.requestId}/documents`
                        );
                      }
                    }}
                  >
                    <div
                      className={`document-icon ${
                        document.status === "Approved"
                          ? "document-icon-success"
                          : needAction
                            ? "document-icon-danger"
                            : "document-icon-warning"
                      }`}
                    >
                      {document.status === "Approved"
                        ? "✓"
                        : needAction
                          ? "!"
                          : "◷"}
                    </div>

                    <div className="document-content">
                      <strong>{document.name}</strong>
                      <span>{document.horseName}</span>
                    </div>

                    <span
                      className={getDocumentStatusClass(
                        document.status
                      )}
                    >
                      {document.status}
                    </span>

                    {needAction && (
                      <span className="document-chevron">
                        ›
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </article>
        </section>

        {/* Recent requests */}
        <section className="home-card recent-requests-card">
          <div className="recent-header">
            <h2>My Recent Transport Requests</h2>

            <button
              className="text-button"
              onClick={() =>
                navigate("/customer/requests")
              }
            >
              View All
            </button>
          </div>

          <div className="table-wrapper">
            <table className="request-table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Route</th>
                  <th>Horse</th>
                  <th>Requested Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {recentRequests.map((request) => (
                  <tr key={request.id}>
                    <td className="request-id">
                      {request.id}
                    </td>

                    <td>
                      {request.origin}
                      <span className="table-arrow">
                        →
                      </span>
                      {request.destination}
                    </td>

                    <td>{request.horses}</td>

                    <td>
                      {formatDate(
                        request.requestedDate
                      )}
                    </td>

                    <td>
                      <span
                        className={getRequestStatusClass(
                          request.status
                        )}
                      >
                        {request.status}
                      </span>
                    </td>

                    <td>
                      <button
                        className="text-button"
                        onClick={() =>
                          navigate(
                            `/customer/requests/${request.id}`
                          )
                        }
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </CustomerLayout>
  );
}

export default HomePage;