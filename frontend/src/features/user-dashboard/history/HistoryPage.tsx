import "./TripHistoryPage.css";

type HistoryItem = {
  id: string;
  horseName: string;
  from: string;
  to: string;
  date: string;
  status: "Completed" | "In Transit" | "Cancelled";
};

const historyData: HistoryItem[] = [
  {
    id: "TRP-001",
    horseName: "Thunder",
    from: "Ho Chi Minh City",
    to: "Singapore",
    date: "02/10/2026",
    status: "Completed",
  },
  {
    id: "TRP-002",
    horseName: "Silver Star",
    from: "Hanoi",
    to: "Bangkok",
    date: "25/09/2026",
    status: "Completed",
  },
  {
    id: "TRP-003",
    horseName: "Black Wind",
    from: "Da Nang",
    to: "Kuala Lumpur",
    date: "15/09/2026",
    status: "Cancelled",
  },
];

function TripHistoryPage() {
  const getStatusClass = (status: HistoryItem["status"]) => {
    switch (status) {
      case "Completed":
        return "status-completed";

      case "In Transit":
        return "status-transit";

      case "Cancelled":
        return "status-cancelled";

      default:
        return "";
    }
  };

  return (
    <div className="trip-history-page">
      <div className="trip-history-header">
        <div>
          <p className="trip-history-label">
            TRIP TRACKING
          </p>

          <h1>Lịch sử hành trình</h1>

          <p className="trip-history-description">
            Xem lại các chuyến vận chuyển và trạng thái
            hành trình trước đây.
          </p>
        </div>

        <div className="trip-history-search">
          <input
            type="text"
            placeholder="Tìm theo mã chuyến hoặc tên ngựa..."
          />
        </div>
      </div>

      <div className="trip-history-filter">
        <button
          type="button"
          className="filter-button active"
        >
          Tất cả
        </button>

        <button
          type="button"
          className="filter-button"
        >
          Hoàn thành
        </button>

        <button
          type="button"
          className="filter-button"
        >
          Đang vận chuyển
        </button>

        <button
          type="button"
          className="filter-button"
        >
          Đã hủy
        </button>
      </div>

      <div className="trip-history-table-wrapper">
        <table className="trip-history-table">
          <thead>
            <tr>
              <th>Mã chuyến</th>
              <th>Ngựa</th>
              <th>Điểm đi</th>
              <th>Điểm đến</th>
              <th>Ngày vận chuyển</th>
              <th>Trạng thái</th>
              <th />
            </tr>
          </thead>

          <tbody>
            {historyData.map((item) => (
              <tr key={item.id}>
                <td>
                  <span className="trip-code">
                    {item.id}
                  </span>
                </td>

                <td>
                  <div className="horse-info">
                    <div className="horse-avatar">
                      ♞
                    </div>

                    <span>{item.horseName}</span>
                  </div>
                </td>

                <td>{item.from}</td>

                <td>{item.to}</td>

                <td>{item.date}</td>

                <td>
                  <span
                    className={`history-status ${getStatusClass(
                      item.status
                    )}`}
                  >
                    {item.status}
                  </span>
                </td>

                <td>
                  <button
                    type="button"
                    className="view-history-button"
                  >
                    Xem chi tiết
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TripHistoryPage;