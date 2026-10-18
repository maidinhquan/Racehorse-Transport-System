import { relational } from "../../../flow1/relational/api";
import { flow1Error } from "../../../flow1/api";
import {
  useEffect,
  useMemo,
  useState,
} from "react";



import CustomerLayout from "../../../../shared/layouts/CustomerLayout/CustomerLayout";

import {
  type Horse,
  type PassportStatus,
  type MedicalStatus,
} from "../../data/horseMockData";

import "./MyHorsesPage.css";

type HorseFilter =
  | "all"
  | "complete"
  | "missing";

function getPassportClass(
  status: PassportStatus
) {
  switch (status) {
    case "Valid":
      return "horse-status-text horse-status-green";

    case "Expiring Soon":
      return "horse-status-text horse-status-yellow";

    case "Expired":
    case "Missing":
      return "horse-status-text horse-status-red";

    default:
      return "horse-status-text";
  }
}

function getMedicalClass(
  status: MedicalStatus
) {
  switch (status) {
    case "Complete":
      return "horse-status-text horse-status-green";

    case "Action Needed":
    case "Missing":
      return "horse-status-text horse-status-red";

    default:
      return "horse-status-text";
  }
}

function hasMissingDocuments(
  horse: Horse
) {
  return (
    horse.profileStatus !== "Complete" ||
    horse.passportStatus === "Missing" ||
    horse.passportStatus === "Expired" ||
    horse.medicalStatus !== "Complete"
  );
}

function MyHorsesPage() {

  const [horses, setHorses] = useState<Horse[]>([]);
  useEffect(() => { let active = true; const urls: string[] = [];
    relational.horses().then(async rows => {
      const cards = await Promise.all(rows.map(async h => { let photo: string | undefined; if (h.hasDocuments) { try { photo = await relational.pdfUrl(`/customer/horses/${h.horseId}/files/photo`); urls.push(photo); } catch { /* No public-file fallback. */ } }
        return { id: h.horseId, name: h.name, breed: h.breed || '—', sex: h.sex || '—', age: h.dob ? Math.max(0, new Date().getFullYear() - new Date(h.dob).getFullYear()) : null, microchip: h.microchipIso, photo, profileStatus: 'Needs Attention' as const, passportStatus: h.hasDocuments ? 'Đã có scan' as const : 'Missing' as const, medicalStatus: 'Chưa xác minh' as const, transportCount: 0 };
      })); if (active) setHorses(cards); else urls.forEach(URL.revokeObjectURL);
    }).catch(e => { if (active) window.alert(flow1Error(e)); }); return () => { active = false; urls.forEach(URL.revokeObjectURL); };
  }, []);

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState<HorseFilter>("all");

  const filteredHorses = useMemo(() => {
    const keyword = search
      .trim()
      .toLowerCase();

    return horses.filter((horse) => {
      const searchableText = [
        horse.name,
        horse.id,
        horse.breed,
        horse.microchip,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        keyword === "" ||
        searchableText.includes(keyword);

      let matchesFilter = true;

      if (filter === "complete") {
        matchesFilter =
          horse.profileStatus === "Complete";
      }

      if (filter === "missing") {
        matchesFilter =
          hasMissingDocuments(horse);
      }

      return (
        matchesSearch &&
        matchesFilter
      );
    });
  }, [search, filter, horses]);

  return (
    <CustomerLayout pageTitle="Ngựa của tôi">
      <div className="my-horses-page">
        {/* Header */}
        <div className="my-horses-header">
          <div>
            <h1>Ngựa của tôi</h1>
            <p>
              Hồ sơ ngựa có thể tái sử dụng cho các yêu cầu vận chuyển của bạn.
            </p>
          </div>

          <button
            className="add-horse-button"
            onClick={() => alert("Tính năng thêm ngựa mới sẽ mở form tạo hồ sơ.")}
          >
            <span>+</span>
            Thêm ngựa
          </button>
        </div>

        {/* Toolbar */}
        <div className="horse-toolbar">
          <div className="horse-search">
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
              placeholder="Tìm theo tên, mã ID, giống hoặc microchip..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
            />
          </div>

          <div className="horse-filters">
            <button
              className={`horse-filter-button ${
                filter === "all"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setFilter("all")
              }
            >
              Tất cả ngựa
            </button>

            <button
              className={`horse-filter-button ${
                filter === "complete"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setFilter("complete")
              }
            >
              Hồ sơ đầy đủ
            </button>

            <button
              className={`horse-filter-button ${
                filter === "missing"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setFilter("missing")
              }
            >
              Cần bổ sung
              <span className="filter-red-dot" />
            </button>
          </div>
        </div>

        {/* Horse list */}
        {filteredHorses.length > 0 ? (
          <div className="horse-grid">
            {filteredHorses.map(
              (horse) => {
                const needsAttention =
                  hasMissingDocuments(
                    horse
                  );

                return (
                  <article
                    key={horse.id}
                    className="horse-card"
                  >
                    {/* Photo */}
                    <div className="horse-photo">
                      {horse.photo ? (
                        <img
                          src={horse.photo}
                          alt={horse.name}
                        />
                      ) : (
                        <span>
                          Ảnh ngựa
                        </span>
                      )}

                      {needsAttention && (
                        <span className="horse-warning-badge">
                          Cần bổ sung
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="horse-card-body">
                      <div className="horse-card-title">
                        <span className="horse-name">
                          {horse.name}
                        </span>

                        <span className="horse-id">
                          ID: {horse.id}
                        </span>
                      </div>

                      <p className="horse-meta">
                        {horse.breed}
                        {" • "}
                        {horse.sex}
                        {" • "}
                        {horse.age} Tuổi
                      </p>

                      <div className="horse-info-box">
                        <div className="horse-info-row">
                          <span>
                            Microchip
                          </span>

                          <strong>
                            {horse.microchip ||
                              "Chưa cung cấp"}
                          </strong>
                        </div>

                        <div className="horse-info-row">
                          <span>
                            Hộ chiếu
                          </span>

                          <strong
                            className={getPassportClass(
                              horse.passportStatus
                            )}
                          >
                            {
                              horse.passportStatus
                            }
                          </strong>
                        </div>

                        <div className="horse-info-row">
                          <span>
                            Hồ sơ y tế
                          </span>

                          <strong
                            className={getMedicalClass(
                              horse.medicalStatus
                            )}
                          >
                            {
                              horse.medicalStatus
                            }
                          </strong>
                        </div>

                        <div className="horse-usage">
                          <strong>
                            {horse.transportCount >
                            0
                              ? `Đã dùng trong ${horse.transportCount} chuyến vận chuyển`
                              : "Chưa tham gia chuyến vận chuyển nào"}
                          </strong>

                          {horse.lastRoute && (
                            <span>
                              Gần nhất:{" "}
                              {
                                horse.lastRoute
                              }
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="horse-actions">
                        <button
                          className="horse-primary-action"
                          onClick={() =>
                            window.alert("Main chưa có trang chi tiết hồ sơ ngựa. Cần teammate frontend bổ sung.")
                          }
                        >
                          Xem chi tiết
                        </button>

                        {needsAttention ? (
                          <button
                            className="horse-warning-action"
                            onClick={() =>
                              window.alert("Main chưa có form sửa hồ sơ ngựa. Cần teammate frontend bổ sung.")
                            }
                          >
                            Bổ sung hồ sơ
                          </button>
                        ) : (
                          <button
                            className="horse-secondary-action"
                            onClick={() =>
                              window.alert("Main chưa có form sửa hồ sơ ngựa. Cần teammate frontend bổ sung.")
                            }
                          >
                            Chỉnh sửa
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        ) : (
          <div className="horse-empty">
            Không tìm thấy ngựa nào phù hợp với tìm kiếm của bạn.
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}

export default MyHorsesPage;