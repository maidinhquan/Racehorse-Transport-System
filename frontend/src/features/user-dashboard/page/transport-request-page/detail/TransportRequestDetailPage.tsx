import { useNavigate, useParams } from "react-router-dom";

import CustomerLayout from "../../../../../shared/layouts/CustomerLayout/CustomerLayout";
import { useRequest, requestView } from "../../../../flow1/relational/mainBindings";
import { download } from "../../../../flow1/relational/api";
import { flow1Error } from "../../../../flow1/api";
import type { DetailRequestStatus } from "../../../data/transportRequestDetailMockData";
import "./TransportRequestDetailPage.css";

function formatDate(date: string) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function getStatusClass(status: string) {
  switch (status) {
    case "In Transit":
      return "detail-status detail-status-orange";

    case "Scheduled":
    case "Completed":
      return "detail-status detail-status-green";

    case "Contract Ready":
    case "Accepted – Contract Preparation":
    case "Information Submitted":
    case "Documents Under Review":
      return "detail-status detail-status-blue";

    case "Waiting for Manager Review":
    case "Changes Requested":
    case "Awaiting Deposit":
    case "Information Required":
      return "detail-status detail-status-yellow";

    case "Rejected":
      return "detail-status detail-status-red";

    default:
      return "detail-status detail-status-grey";
  }
}

function getBanner(status: DetailRequestStatus) {
  switch (status) {
    case "Waiting for Manager Review":
      return {
        type: "yellow",
        title: "Waiting for manager review",
        message:
          "CBN Transport is reviewing your initial request. You will be notified of the result.",
      };

    case "Changes Requested":
      return {
        type: "yellow",
        title: "Changes requested",
        message:
          "Please review the manager feedback and update your request.",
      };

    case "Accepted – Contract Preparation":
      return {
        type: "blue",
        title: "Request accepted",
        message:
          "CBN Transport is preparing your service contract.",
      };

    case "Contract Ready":
      return {
        type: "blue",
        title: "Your service contract is ready",
        message:
          "Review and sign the contract to continue.",
      };

    case "Awaiting Deposit":
      return {
        type: "blue",
        title: "Contract signed",
        message:
          "Pay the deposit to continue to transport information.",
      };

    case "Information Required":
      return {
        type: "yellow",
        title: "Transport information required",
        message:
          "Provide pickup, delivery, horse and document information.",
      };

    case "Documents Under Review":
      return {
        type: "blue",
        title: "Documents under review",
        message:
          "CBN Transport is reviewing your submitted documents.",
      };

    case "Scheduled":
      return {
        type: "green",
        title: "Transport scheduled",
        message:
          "Your transport has been scheduled successfully.",
      };

    case "In Transit":
      return {
        type: "blue",
        title: "Your horse is on the way",
        message:
          "The transport is currently in progress.",
      };

    case "Completed":
      return {
        type: "green",
        title: "Transport completed",
        message:
          "The horse has been delivered successfully.",
      };

    case "Rejected":
      return {
        type: "red",
        title: "Request rejected",
        message:
          "This transport request was not accepted.",
      };

    default:
      return {
        type: "grey",
        title: status,
        message:
          "Check the current information for this request.",
      };
  }
}

function TransportRequestDetailPage() {
  const navigate = useNavigate();

  const { requestId } = useParams();

  const record = useRequest(requestId);
  const request = record ? requestView(record) : undefined;
  if (!request) {
    return (
      <CustomerLayout pageTitle="Transport Request">
        <div className="detail-not-found">
          <h2>Transport request not found</h2>

          <button
            onClick={() =>
              navigate("/customer/requests")
            }
          >
            Back to Transport Requests
          </button>
        </div>
      </CustomerLayout>
    );
  }

  const banner = getBanner(request.status as DetailRequestStatus);

  const handleCurrentAction = () => {
    switch (request.status as DetailRequestStatus) {
      case "Contract Ready":
        navigate(
          `/customer/requests/${request.id}/contract`
        );
        break;

      case "Awaiting Deposit":
        navigate(
          `/customer/requests/${request.id}/payment`
        );
        break;

      case "Information Required":
        navigate(
          `/customer/requests/${request.id}/information`
        );
        break;

      case "Documents Under Review":
        navigate(
          `/customer/requests/${request.id}/documents`
        );
        break;

      case "In Transit":
        navigate("/customer/tracking");
        break;

      default:
        break;
    }
  };

  const getActionLabel = () => {
    switch (request.status as DetailRequestStatus) {
      case "Contract Ready":
        return "View Contract";

      case "Awaiting Deposit":
        return "Pay Deposit";

      case "Information Required":
        return "Complete Transport Information";

      case "Documents Under Review":
        return request.documents.some(
          (document) =>
            document.status === "Action Required"
        )
          ? "Review Documents"
          : "";

      case "In Transit":
        return "View Trip Tracking";

      default:
        return "";
    }
  };

  const actionLabel = getActionLabel();

  return (
    <CustomerLayout pageTitle="Transport Request">
      <div className="request-detail-page">
        {/* Back */}
        <button
          type="button"
          className="request-detail-back"
          onClick={() =>
            navigate("/customer/requests")
          }
        >
          ← Back to Transport Requests
        </button>

        {/* Header */}
        <div className="request-detail-header">
          <div>
            <div className="request-detail-title">
              <h1>{request.id}</h1>

              <span
                className={getStatusClass(
                  request.status
                )}
              >
                {request.status}
              </span>
            </div>

            <p>
              Transport Request Detail • Requested{" "}
              {formatDate(
                request.requestedDate
              )}
            </p>
          </div>
        </div>

        {/* Status banner */}
        <div
          className={`request-banner request-banner-${banner.type}`}
        >
          <div className="request-banner-icon">
            i
          </div>

          <div>
            <strong>
              {banner.title}
            </strong>

            <p>
              {banner.message}
            </p>
          </div>
        </div>

        {/* Main */}
        <div className="request-detail-grid">
          {/* LEFT */}
          <div className="request-detail-left">
            {/* Initial request */}
            <section className="request-detail-card">
              <h2>
                Initial Request & Quotation
              </h2>

              <div className="request-info-grid">
                <div>
                  <span>Route</span>

                  <strong>
                    {request.origin}
                    <span className="detail-arrow">
                      →
                    </span>
                    {request.destination}
                  </strong>
                </div>

                <div>
                  <span>
                    Preferred Transport Date
                  </span>

                  <strong>
                    {formatDate(
                      request.preferredDate
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Number of Horses
                  </span>

                  <strong>
                    {request.horseCount}
                  </strong>
                </div>

                <div>
                  <span>
                    Estimated Transport Cost
                  </span>

                  <strong className="detail-price">
                    
                    {request.estimatedPrice?.toLocaleString(
                      "en-US"
                    ) ?? '—'}{" "}
                    {request.estimatedPrice == null ? '' : 'VND'}
                  </strong>
                </div>
              </div>
            </section>

            {/* Contract */}
            {request.contract && (
              <section className="request-detail-card">
                <div className="detail-section-header">
                  <h2>
                    Service Contract
                  </h2>

                  <span className="detail-contract-status">
                    {
                      request.contract
                        .status
                    }
                  </span>
                </div>

                <div className="request-info-grid">
                  <div>
                    <span>
                      Contract Number
                    </span>

                    <strong>
                      {
                        request.contract
                          .number
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Contract Status
                    </span>

                    <strong>
                      {
                        request.contract
                          .status
                      }
                    </strong>
                  </div>

                  {request.contract
                    .finalPrice && (
                      <div>
                        <span>
                          Final Agreed Price
                        </span>

                        <strong className="detail-price">
                          
                          {request.contract.finalPrice.toLocaleString(
                            "en-US"
                          )}{" "}
                          {request.currency}
                        </strong>
                      </div>
                    )}
                </div>
              </section>
            )}

            {/* Horses */}
            {request.horses.length > 0 && (
              <section className="request-detail-card">
                <h2>
                  Horse Information
                </h2>

                <div className="request-horse-list">
                  {request.horses.map(
                    (horse) => (
                      <div
                        key={horse.id}
                        className="request-horse-item"
                      >
                        <div className="request-horse-avatar">
                          H
                        </div>

                        <div className="request-horse-info">
                          <strong>
                            {
                              horse.name
                            }
                          </strong>

                          <span>
                            {horse.breed}
                            {" • "}
                            {horse.sex}
                            {" • "}
                            {horse.id}
                          </span>
                        </div>

                        <button
                          onClick={() =>
                            navigate(
                              `/customer/horses/${horse.id}`
                            )
                          }
                        >
                          View
                        </button>
                      </div>
                    )
                  )}
                </div>
              </section>
            )}

            {/* Documents */}
            {request.documents.length >
              0 && (
                <section className="request-detail-card">
                  <div className="detail-section-header">
                    <h2>
                      Documents
                    </h2>

                    <button
                      className="detail-section-link"
                      onClick={() =>
                        navigate(
                          `/customer/requests/${request.id}/documents`
                        )
                      }
                    >
                      View All
                    </button>
                  </div>

                  <div className="request-document-list">
                    {request.documents.map(
                      (document) => (
                        <div
                          key={
                            document.id
                          }
                          className={`request-document-item ${document.status ===
                            "Action Required"
                            ? "request-document-warning"
                            : ""
                            }`}
                        >
                          <span>
                            {
                              document.name
                            }
                            {document.downloadPath && <button data-flow1-baseline-download type="button" className="detail-section-link" onClick={() => void download(document.downloadPath!, 'baseline-' + document.id).catch(e => window.alert(flow1Error(e)))}>Tải hồ sơ</button>}
                          </span>

                          <strong
                            className={`document-status document-${document.status
                              .toLowerCase()
                              .replaceAll(
                                " ",
                                "-"
                              )}`}
                          >
                            {
                              document.status
                            }
                          </strong>
                        </div>
                      )
                    )}
                  </div>
                </section>
              )}
          </div>

          {/* RIGHT */}
          <aside className="request-detail-right">
            {/* Action */}
            <section className="request-detail-card">
              <h2>
                Current Action
              </h2>

              {actionLabel ? (
                <>
                  <p className="request-action-text">
                    An action is available
                    for this transport
                    request.
                  </p>

                  <button
                    className="request-action-button"
                    onClick={
                      handleCurrentAction
                    }
                  >
                    {actionLabel}
                  </button>
                </>
              ) : (
                <p className="request-action-empty">
                  No action is needed from
                  you right now.
                </p>
              )}
            </section>

            {/* Schedule */}
            {(request.pickupWindow ||
              request.eta) && (
                <section className="request-detail-card">
                  <h2>
                    Transport Schedule
                  </h2>

                  <div className="schedule-info">
                    {request.pickupWindow && (
                      <div>
                        <span>
                          Pickup
                        </span>

                        <strong>
                          {
                            request.pickupWindow
                          }
                        </strong>
                      </div>
                    )}

                    {request.eta && (
                      <div>
                        <span>
                          Estimated Arrival
                        </span>

                        <strong className="schedule-eta">
                          {
                            request.eta
                          }
                        </strong>
                      </div>
                    )}
                  </div>
                </section>
              )}

            {/* Progress */}
            <section className="request-detail-card">
              <h2>
                Request Progress
              </h2>

              <ul className="request-progress-list">
                {request.progress.map(
                  (step) => (
                    <li
                      key={step.id}
                      className={`request-progress-${step.status}`}
                    >
                      <div className="request-progress-marker">
                        {step.status ===
                          "completed"
                          ? "✓"
                          : ""}
                      </div>

                      <span>
                        {
                          step.label
                        }
                      </span>
                    </li>
                  )
                )}
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </CustomerLayout>
  );
}

export default TransportRequestDetailPage;
