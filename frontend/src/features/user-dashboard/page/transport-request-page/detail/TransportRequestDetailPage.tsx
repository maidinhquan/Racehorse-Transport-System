import { useNavigate, useParams } from "react-router-dom";

import CustomerLayout from "../../../../../shared/layouts/CustomerLayout/CustomerLayout";
import {
  getRequestById,
  updateRequestStatus,
  type FakeRequestStatus,
} from "../../../data/transportRequestStorage";
import {
  useState,
} from "react";
import {
  transportRequestDetails,
  type DetailRequestStatus,
} from "../../../data/transportRequestDetailMockData";

import "./TransportRequestDetailPage.css";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function getStatusClass(status: DetailRequestStatus) {
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

  // Dữ liệu cơ bản được lưu trong localStorage
  const [storedRequest, setStoredRequest] = useState(() =>
    requestId
      ? getRequestById(requestId)
      : undefined
  );

  // Dữ liệu chi tiết dùng để demo UI
  const detailRequest = transportRequestDetails.find(
    (item) => item.id === requestId
  );

  /*
    Nếu request có trong detail mock:
    - dùng toàn bộ dữ liệu chi tiết
    - status sẽ ưu tiên status trong localStorage

    Nếu là request mới tạo:
    - tạo dữ liệu detail tối thiểu để page vẫn render được
  */
  const request = detailRequest
    ? {
      ...detailRequest,

      status:
        (storedRequest?.status ??
          detailRequest.status) as DetailRequestStatus,
    }
    : storedRequest
      ? {
        ...storedRequest,

        status:
          storedRequest.status as DetailRequestStatus,

        horses: [],

        documents: [],

        progress: [
          {
            id: 1,
            label: "Request Submitted",
            status: "current" as const,
          },
        ],

        contract: undefined,

        pickupWindow: undefined,

        eta: undefined,
      }
      : undefined;

  const changeDemoStatus = (
    status: FakeRequestStatus
  ) => {
    if (!requestId || !request) {
      return;
    }

    updateRequestStatus(
      requestId,
      status
    );

    setStoredRequest((previous) => {
      if (previous) {
        return {
          ...previous,
          status,
        };
      }

      return {
        id: request.id,

        origin: request.origin,

        destination:
          request.destination,

        requestedDate:
          request.requestedDate,

        preferredDate:
          request.preferredDate,

        horseCount:
          request.horseCount,

        estimatedPrice:
          request.estimatedPrice,

        status,
      };
    });
  };

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

  const banner = getBanner(request.status);

  const handleCurrentAction = () => {
    switch (request.status) {
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
    switch (request.status) {
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
                    $
                    {request.estimatedPrice.toLocaleString(
                      "en-US"
                    )}{" "}
                    USD
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
                          $
                          {request.contract.finalPrice.toLocaleString(
                            "en-US"
                          )}{" "}
                          USD
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
            <section className="request-detail-card demo-control-card">
              <h2>Demo Controls</h2>

              <p className="demo-control-description">
                Simulate Manager / Staff actions without backend.
              </p>

              <div className="demo-control-buttons">
                {request.status ===
                  "Waiting for Manager Review" && (
                    <>
                      <button
                        onClick={() =>
                          changeDemoStatus(
                            "Accepted – Contract Preparation"
                          )
                        }
                      >
                        Manager: Accept Request
                      </button>

                      <button
                        onClick={() =>
                          changeDemoStatus(
                            "Changes Requested"
                          )
                        }
                      >
                        Manager: Request Changes
                      </button>

                      <button
                        onClick={() =>
                          changeDemoStatus(
                            "Rejected"
                          )
                        }
                      >
                        Manager: Reject Request
                      </button>
                    </>
                  )}

                {request.status ===
                  "Accepted – Contract Preparation" && (
                    <button
                      onClick={() =>
                        changeDemoStatus(
                          "Contract Ready"
                        )
                      }
                    >
                      Manager: Contract Ready
                    </button>
                  )}

                {request.status ===
                  "Contract Ready" && (
                    <button
                      onClick={() =>
                        changeDemoStatus(
                          "Awaiting Deposit"
                        )
                      }
                    >
                      Customer: Sign Contract
                    </button>
                  )}

                {request.status ===
                  "Awaiting Deposit" && (
                    <button
                      onClick={() =>
                        changeDemoStatus(
                          "Information Required"
                        )
                      }
                    >
                      Customer: Pay Deposit
                    </button>
                  )}

                {request.status ===
                  "Information Required" && (
                    <button
                      onClick={() =>
                        changeDemoStatus(
                          "Information Submitted"
                        )
                      }
                    >
                      Customer: Submit Information
                    </button>
                  )}

                {request.status ===
                  "Information Submitted" && (
                    <button
                      onClick={() =>
                        changeDemoStatus(
                          "Documents Under Review"
                        )
                      }
                    >
                      Staff: Review Documents
                    </button>
                  )}

                {request.status ===
                  "Documents Under Review" && (
                    <button
                      onClick={() =>
                        changeDemoStatus(
                          "Scheduled"
                        )
                      }
                    >
                      Staff: Schedule Transport
                    </button>
                  )}

                {request.status ===
                  "Scheduled" && (
                    <button
                      onClick={() =>
                        changeDemoStatus(
                          "In Transit"
                        )
                      }
                    >
                      Staff: Start Trip
                    </button>
                  )}

                {request.status ===
                  "In Transit" && (
                    <button
                      onClick={() =>
                        changeDemoStatus(
                          "Completed"
                        )
                      }
                    >
                      Staff: Complete Trip
                    </button>
                  )}
              </div>
            </section>
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