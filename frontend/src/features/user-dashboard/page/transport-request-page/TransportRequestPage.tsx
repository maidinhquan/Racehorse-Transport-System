import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import CustomerLayout from "../../../../shared/layouts/CustomerLayout/CustomerLayout";

import {
  requestStatuses,
  transportRequests,
  type ContractStatus,
  type RequestStatus,
} from "../../data/transportRequestMockData";

import "./TransportRequestPage.css";

function formatDate(date: string) {
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
  }, [search, statusFilter]);

  return (
    <CustomerLayout pageTitle="Transport Requests">
      <div className="transport-request-page">
        <div className="transport-request-header">
          <div>
            <h1>Transport Requests</h1>

            <p>
              Track and manage your active transport requests.
            </p>
          </div>

          <button
            className="create-request-button"
            onClick={() =>
              navigate("/customer/requests/new")
            }
          >
            <span>+</span>
            Create Transport Request
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
              placeholder="Search by request ID, route, or horse..."
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
            <option value="">All Statuses</option>

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
                    <th>Request ID</th>
                    <th>Route</th>
                    <th>Horse(s)</th>
                    <th>Requested Date</th>
                    <th>Preferred Date</th>
                    <th>Contract</th>
                    <th>Request Status</th>
                    <th>Action</th>
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
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="request-empty">
              No transport requests match your filters.
            </div>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}

export default TransportRequestPage;