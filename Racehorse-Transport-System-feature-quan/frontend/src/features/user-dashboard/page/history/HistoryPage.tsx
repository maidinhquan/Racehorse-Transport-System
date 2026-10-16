import {
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import CustomerLayout from "../../../../shared/layouts/CustomerLayout/CustomerLayout";

import {
  transportHistory,
  type HistoryStatus,
} from "../../data/historyMockData";

import "./HistoryPage.css";

function formatDate(date?: string) {
  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(new Date(date));
}

function getStatusClass(
  status: HistoryStatus
) {
  switch (status) {
    case "Completed":
      return "history-status history-status-completed";

    case "Cancelled":
      return "history-status history-status-cancelled";

    case "Rejected":
      return "history-status history-status-rejected";

    default:
      return "history-status";
  }
}

function HistoryPage() {
  const navigate = useNavigate();

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("");

  const [yearFilter, setYearFilter] =
    useState("");

  const years = useMemo(() => {
    return Array.from(
      new Set(
        transportHistory.map(
          (item) =>
            item.departureDate.slice(
              0,
              4
            )
        )
      )
    ).sort(
      (a, b) =>
        Number(b) - Number(a)
    );
  }, []);

  const filteredHistory =
    useMemo(() => {
      const keyword = search
        .trim()
        .toLowerCase();

      return transportHistory.filter(
        (item) => {
          const searchableText = [
            item.id,
            item.origin,
            item.destination,
            ...item.horses,
          ]
            .join(" ")
            .toLowerCase();

          const matchesSearch =
            keyword === "" ||
            searchableText.includes(
              keyword
            );

          const matchesStatus =
            statusFilter === "" ||
            item.status ===
              statusFilter;

          const matchesYear =
            yearFilter === "" ||
            item.departureDate.startsWith(
              yearFilter
            );

          return (
            matchesSearch &&
            matchesStatus &&
            matchesYear
          );
        }
      );
    }, [
      search,
      statusFilter,
      yearFilter,
    ]);

  return (
    <CustomerLayout pageTitle="History">
      <div className="history-page">
        {/* Header */}
        <div className="history-header">
          <div>
            <h1>
              Transport History
            </h1>

            <p>
              Review your previous transport
              requests and completed journeys.
            </p>
          </div>

          {/* Filters */}
          <div className="history-tools">
            <div className="history-search">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle
                  cx="11"
                  cy="11"
                  r="7"
                />

                <path d="m20 20-3.5-3.5" />
              </svg>

              <input
                type="text"
                placeholder="Search Request ID, Horse..."
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
            >
              <option value="">
                All Statuses
              </option>

              <option value="Completed">
                Completed
              </option>

              <option value="Cancelled">
                Cancelled
              </option>

              <option value="Rejected">
                Rejected
              </option>
            </select>

            <select
              value={yearFilter}
              onChange={(event) =>
                setYearFilter(
                  event.target.value
                )
              }
            >
              <option value="">
                All Years
              </option>

              {years.map((year) => (
                <option
                  key={year}
                  value={year}
                >
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="history-table-card">
          {filteredHistory.length >
          0 ? (
            <div className="history-table-wrapper">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>
                      Request ID
                    </th>

                    <th>Horse</th>

                    <th>Route</th>

                    <th>
                      Departure /
                      Arrival
                    </th>

                    <th>
                      Final Status
                    </th>

                    <th>
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredHistory.map(
                    (item) => (
                      <tr
                        key={item.id}
                      >
                        <td className="history-request-id">
                          {item.id}
                        </td>

                        <td>
                          <div className="history-horse-cell">
                            <div className="history-horse-icon">
                              →
                            </div>

                            <span>
                              {item.horses.join(
                                ", "
                              )}
                            </span>
                          </div>
                        </td>

                        <td>
                          <div className="history-route">
                            <span>
                              {
                                item.origin
                              }
                            </span>

                            <span className="history-route-arrow">
                              →
                            </span>

                            <span>
                              {
                                item.destination
                              }
                            </span>
                          </div>
                        </td>

                        <td>
                          <div className="history-dates">
                            <strong>
                              {formatDate(
                                item.departureDate
                              )}
                            </strong>

                            <span>
                              Arr:{" "}
                              {formatDate(
                                item.arrivalDate
                              )}
                            </span>
                          </div>
                        </td>

                        <td>
                          <span
                            className={getStatusClass(
                              item.status
                            )}
                          >
                            {
                              item.status
                            }
                          </span>
                        </td>

                        <td>
                          <button
                            className="history-view-button"
                            onClick={() =>
                              navigate(
                                `/customer/requests/${item.id}`
                              )
                            }
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="history-empty">
              No past transport requests
              match your filters.
            </div>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}

export default HistoryPage;