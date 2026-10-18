import { useRequests, statusLabels, selectedContract } from "../../../../flow1/relational/mainBindings";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import CustomerLayout from "../../../../../shared/layouts/CustomerLayout/CustomerLayout";

import {
  requestStatuses,
  type ContractStatus,
  type RequestStatus,
} from "../../../data/transportRequestMockData";

import "./TransportRequestPage.css";

function formatDate(date: string) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function getRequestStatusClass(status: RequestStatus) {
  switch (status) {
    case "In Transit":
      return "request-status request-status-orange";

    case "Scheduled":
      return "request-status request-status-green";

    case "Contract Ready":
    case "Accepted – Contract Preparation":
    case "Information Submitted":
    case "Documents Under Review":
      return "request-status request-status-blue";

    case "Waiting for Manager Review":
    case "Changes Requested":
    case "Awaiting Deposit":
    case "Information Required":
      return "request-status request-status-yellow";

    case "Completed":
      return "request-status request-status-green";

    case "Cancelled":
      return "request-status request-status-grey";

    case "Rejected":
      return "request-status request-status-red";

    default:
      return "request-status";
  }
}

function getContractStatusClass(status: ContractStatus) {
  switch (status) {
    case "Signed":
      return "contract-status contract-signed";

    case "Ready":
      return "contract-status contract-ready";

    case "Preparing":
      return "contract-status contract-preparing";

    case "Not Available":
      return "contract-status contract-empty";

    default:
      return "contract-status";
  }
}

function TransportRequestPage() {
  const navigate = useNavigate();
  const { records } = useRequests();
  const transportRequests = records.map(r => ({ id: r.requestId, origin: r.departure, destination: r.destination, horses: r.horses.map(h => h.name), requestedDate: "", preferredDate: r.departureAt || "", status: (statusLabels[r.status] || r.status) as RequestStatus, contractStatus: (selectedContract(r)?.signedAt ? "Signed" : selectedContract(r)?.pdfSha256 ? "Ready" : selectedContract(r) ? "Preparing" : "Not Available") as ContractStatus }));

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filteredRequests = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return transportRequests.filter((request) => {
      const searchableText = [
        request.id,
        request.origin,
        request.destination,
        ...request.horses,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        keyword === "" || searchableText.includes(keyword);

      const matchesStatus =
        statusFilter === "" || request.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, records]);

  return (
    <CustomerLayout pageTitle="Yêu cầu vận chuyển">
      <div className="transport-request-page">
        <div className="transport-request-header">
          <div>
            <h1>Yêu cầu vận chuyển</h1>
            <p>
              Theo dõi và quản lý các yêu cầu vận chuyển đang hoạt động của bạn.
            </p>
          </div>

          <button
            className="create-request-button"
            onClick={() =>
              navigate("/customer/requests/new")
            }
          >
            <span>+</span>
            Tạo yêu cầu vận chuyển
          </button>
        </div>

        <div className="transport-request-toolbar">
          <div className="request-search">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>

            <input
              type="text"
              placeholder="Tìm kiếm theo mã yêu cầu, tuyến đường hoặc tên ngựa..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

          <select
            className="request-status-filter"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
          >
            <option value="">Tất cả trạng thái</option>

            {requestStatuses.map((status) => (
              <option
                key={status}
                value={status}
              >
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className="transport-request-table-card">
          {filteredRequests.length > 0 ? (
            <div className="transport-request-table-wrapper">
              <table className="transport-request-table">
                <thead>
                  <tr>
                    <th>Mã yêu cầu</th>
                    <th>Tuyến đường</th>
                    <th>Ngựa</th>
                    <th>Ngày yêu cầu</th>
                    <th>Ngày mong muốn</th>
                    <th>Hợp đồng</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRequests.map((request) => (
                    <tr key={request.id}>
                      <td className="request-id">
                        {request.id}
                      </td>

                      <td>
                        <div className="route-cell">
                          <span>{request.origin}</span>

                          <span className="route-arrow">
                            →
                          </span>

                          <span>
                            {request.destination}
                          </span>
                        </div>
                      </td>

                      <td>
                        {request.horses.join(", ")}
                      </td>

                      <td>
                        {formatDate(
                          request.requestedDate
                        )}
                      </td>

                      <td>
                        {formatDate(
                          request.preferredDate
                        )}
                      </td>

                      <td>
                        <span
                          className={getContractStatusClass(
                            request.contractStatus
                          )}
                        >
                          {request.contractStatus}
                        </span>
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
                          className="view-details-button"
                          onClick={() =>
                            navigate(
                              `/customer/requests/${request.id}`
                            )
                          }
                        >
                          Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="request-empty">
              Không tìm thấy yêu cầu vận chuyển nào phù hợp với bộ lọc của bạn.
            </div>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}

export default TransportRequestPage;