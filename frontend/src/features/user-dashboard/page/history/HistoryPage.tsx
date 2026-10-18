import { useRequests, statusLabels } from "../../../flow1/relational/mainBindings";
import {
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import CustomerLayout from "../../../../shared/layouts/CustomerLayout/CustomerLayout";

import {
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
  const { records } = useRequests();
  const transportHistory = records.filter(r => ['COMPLETED', 'CANCELLED', 'REJECTED'].includes(r.status)).map(r => ({ id: r.requestId, horses: r.horses.map(h => h.name), origin: r.departure, destination: r.destination, departureDate: r.departureAt || '', arrivalDate: r.status === 'COMPLETED' ? r.deliveryAt || undefined : undefined, status: statusLabels[r.status] as HistoryStatus }));

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
  }, [records]);

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
      records,
    ]);

  return (
    <CustomerLayout pageTitle="Lịch sử">
      <div className="history-page">
        {/* Header */}
        <div className="history-header">
          <div>
            <h1>
              Lịch sử vận chuyển
            </h1>

            <p>
              Xem lại các chuyến đi đã hoàn thành và yêu cầu vận chuyển trước đây.
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
                placeholder="Tìm theo mã yêu cầu, tên ngựa..."
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
                Tất cả trạng thái
              </option>

              <option value="Completed">
                Đã hoàn thành
              </option>

              <option value="Cancelled">
                Đã hủy
              </option>

              <option value="Rejected">
                Bị từ chối
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
                Tất cả các năm
              </option>

              {years.map((year) => (
                <option
                  key={year}
                  value={year}
                >
                  Năm {year}
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
                      Mã yêu cầu
                    </th>

                    <th>Ngựa</th>

                    <th>Tuyến đường</th>

                    <th>
                      Khởi hành / Đến nơi
                    </th>

                    <th>
                      Trạng thái cuối
                    </th>

                    <th>
                      Thao tác
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
                            Xem chi tiết
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
              Không có yêu cầu vận chuyển cũ nào phù hợp với bộ lọc của bạn.
            </div>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}

export default HistoryPage;