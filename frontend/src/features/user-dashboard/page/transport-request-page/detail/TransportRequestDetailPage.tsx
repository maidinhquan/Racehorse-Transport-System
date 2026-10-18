import { useNavigate, useParams } from "react-router-dom";

import CustomerLayout from "../../../../../shared/layouts/CustomerLayout/CustomerLayout";
import RequestFlowStepper from "../components/RequestFlowStepper";
import { getRequestById } from "../../../data/transportRequestStorage";
import { useState, useEffect } from "react";
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
    case "Accepted – Contract Preparation":
      return "detail-status detail-status-green";

    case "Contract Ready":
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
    case "Contract Ready":
      return {
        type: "blue",
        title: "Hợp đồng dịch vụ đã sẵn sàng",
        message:
          "Hợp đồng vận chuyển đã được thiết lập. Quý khách vui lòng xác nhận và ký hợp đồng điện tử để tiến hành thanh toán tiền cọc 30%.",
      };

    case "Awaiting Deposit":
      return {
        type: "yellow",
        title: "Hợp đồng đã ký • Chờ đặt cọc",
        message:
          "Quý khách vui lòng hoàn tất thanh toán tiền cọc 30% qua cổng thanh toán để bắt đầu bước điền thông tin và nộp giấy tờ.",
      };

    case "Information Required":
      return {
        type: "green",
        title: "Đã hoàn tất đặt cọc • Bắt đầu điền giấy tờ",
        message:
          "Quý khách vui lòng hoàn tất thông tin điểm đón, điểm trả, cá thể ngựa và nộp hồ sơ giấy tờ kiểm dịch y tế.",
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

  useEffect(() => {
    const handleSync = () => {
      if (requestId) {
        setStoredRequest(getRequestById(requestId));
      }
    };
    window.addEventListener("storage", handleSync);
    window.addEventListener("cbn_request_updated", handleSync);
    const interval = setInterval(handleSync, 1200);

    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("cbn_request_updated", handleSync);
      clearInterval(interval);
    };
  }, [requestId]);

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

        horses: (storedRequest.horses || ["Thunder Strike"]).map((name, idx) => ({
          id: `HRS-${idx + 1}`,
          name,
          breed: "Thoroughbred",
          sex: "Gelding",
        })),

        documents: [],

        progress: [
          {
            id: 1,
            label: "Request Submitted",
            status: "completed" as const,
          },
          {
            id: 2,
            label: "Service Contract",
            status:
              storedRequest.status === "Contract Ready" ||
              storedRequest.status === "Accepted – Contract Preparation"
                ? ("current" as const)
                : ("completed" as const),
          },
          {
            id: 3,
            label: "Deposit Payment (30%)",
            status:
              storedRequest.status === "Awaiting Deposit"
                ? ("current" as const)
                : storedRequest.status === "Information Required" ||
                  storedRequest.status === "Information Submitted" ||
                  storedRequest.status === "Documents Under Review" ||
                  storedRequest.status === "Scheduled" ||
                  storedRequest.status === "In Transit" ||
                  storedRequest.status === "Completed"
                ? ("completed" as const)
                : ("upcoming" as const),
          },
          {
            id: 4,
            label: "Information & Documents",
            status:
              storedRequest.status === "Information Required"
                ? ("current" as const)
                : storedRequest.status === "Information Submitted" ||
                  storedRequest.status === "Documents Under Review" ||
                  storedRequest.status === "Scheduled" ||
                  storedRequest.status === "In Transit" ||
                  storedRequest.status === "Completed"
                ? ("completed" as const)
                : ("upcoming" as const),
          },
        ],

        contract: {
          number: `CT-${storedRequest.id.replace(/\D/g, "")}`,
          status: storedRequest.contractStatus || "Ready",
          finalPrice: storedRequest.estimatedPrice,
        },

        pickupWindow: undefined,

        eta: undefined,
      }
      : undefined;


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
      case "Accepted – Contract Preparation":
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
      case "Information Submitted":
        navigate(
          `/customer/requests/${request.id}/information`
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
      case "Accepted – Contract Preparation":
      case "Contract Ready":
        return "📄 Xác nhận & Ký hợp đồng ➔";

      case "Awaiting Deposit":
        return "💳 Tiến hành thanh toán tiền cọc (30%) ➔";

      case "Information Required":
        return "📝 Điền thông tin & nộp giấy tờ ➔";

      case "Documents Under Review":
      case "Information Submitted":
        return "🔍 Xem hồ sơ giấy tờ đã nộp";

      case "In Transit":
        return "Xem hành trình vận chuyển";

      default:
        return "";
    }
  };

  const getWorkflowStep = (status: DetailRequestStatus): 1 | 2 | 3 => {
    if (status === "Awaiting Deposit") return 2;
    if (
      status === "Information Required" ||
      status === "Information Submitted" ||
      status === "Documents Under Review" ||
      status === "Scheduled" ||
      status === "In Transit" ||
      status === "Completed"
    ) {
      return 3;
    }
    return 1;
  };

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

        {/* Luồng 3 bước: Hợp đồng -> Thanh toán -> Giấy tờ */}
        <RequestFlowStepper currentStep={getWorkflowStep(request.status)} />

        {/* Status banner */}
        <div
          className={`request-banner request-banner-${banner.type}`}
          style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}
        >
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div className="request-banner-icon">
              {banner.type === 'green' ? '✓' : 'i'}
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

          {actionLabel && (
            <button
              type="button"
              className="request-action-button"
              style={{
                width: 'auto',
                margin: 0,
                padding: '8px 18px',
                background:
                  request.status === "Contract Ready" || request.status === "Accepted – Contract Preparation"
                    ? "#0284c7"
                    : request.status === "Awaiting Deposit"
                    ? "#ea580c"
                    : "#16a34a",
                whiteSpace: 'nowrap',
                fontSize: '13px',
                fontWeight: 700,
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
              onClick={handleCurrentAction}
            >
              {actionLabel}
            </button>
          )}
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