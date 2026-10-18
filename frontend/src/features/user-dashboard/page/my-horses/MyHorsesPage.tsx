import {
  useMemo,
  useEffect,
  useState,
} from "react";



import CustomerLayout from "../../../../shared/layouts/CustomerLayout/CustomerLayout";

import { relational } from "../../../flow1/relational/api";
import type { Horse as HorseRecord } from "../../../flow1/relational/api";
import { flow1Error } from "../../../flow1/api";
import { HorseProfileModal } from "../../../flow1/relational/HorseProfileModal";
import "./MyHorsesPage.css";

type HorseFilter =
  | "all"
  | "complete"
  | "missing";

type Horse={id:string;name:string;breed:string;sex:string;age:number|null;microchip:string;hasDocuments:boolean;record:HorseRecord;passportStatus:string;medicalStatus:string;profileStatus:string};
const getPassportClass=(status:string)=>"horse-status-text "+(status==="Đã có scan"?"horse-status-green":"horse-status-red");
const getMedicalClass=()=>"horse-status-text";
const hasMissingDocuments=(horse:Horse)=>!horse.hasDocuments;
function MyHorsesPage() {
  const [rows,setRows]=useState<HorseRecord[]>([]);const [error,setError]=useState("");const [modal,setModal]=useState<{horse?:HorseRecord;edit:boolean}|null>(null);
  const reload=async()=>setRows(await relational.horses());
  useEffect(()=>{let active=true;relational.horses().then(v=>{if(active)setRows(v);}).catch(e=>{if(active)setError(flow1Error(e));});return()=>{active=false;};},[]);
  const horses=useMemo(()=>rows.map(h=>({id:h.horseId,name:h.name,breed:h.breed||"—",sex:h.sex||"—",age:h.dob?Math.max(0,new Date().getFullYear()-new Date(h.dob).getFullYear()):null,microchip:h.microchipIso,hasDocuments:h.hasDocuments,passportStatus:h.hasDocuments?"Đã có scan":"Thiếu scan",medicalStatus:"Chưa xác minh",profileStatus:h.hasDocuments?"Complete":"Incomplete",record:h})),[rows]);

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
  }, [horses, search, filter]);

  return (
    <CustomerLayout pageTitle="Ngựa của tôi">
      <div className="my-horses-page">{error&&<p role="alert">{error}</p>}
        {/* Header */}
        <div className="my-horses-header">
          <div>
            <h1>Ngựa của tôi</h1>
            <p>
              Hồ sơ ngựa có thể tái sử dụng cho các yêu cầu vận chuyển của bạn.
            </p>
          </div>

          <button
            aria-label="Thêm ngựa" className="add-horse-button"
            onClick={()=>setModal({edit:true})}
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
                      <HorsePhoto horse={horse.record}/>

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
                        {horse.age??"—"} Tuổi
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
                            className={getMedicalClass()}
                          >
                            {
                              horse.medicalStatus
                            }
                          </strong>
                        </div>

                        <div className="horse-usage"><strong>{horse.record.selectable?"Có thể chọn khi lịch phù hợp":"Cần bổ sung hồ sơ"}</strong></div>
                      </div>

                      {/* Actions */}
                      <div className="horse-actions">
                        <button
                          className="horse-primary-action"
                          onClick={() =>
                            setModal({horse:horse.record,edit:false})
                          }
                        >
                          Xem chi tiết
                        </button>

                        {needsAttention ? (
                          <button
                            className="horse-warning-action"
                            onClick={() =>
                              setModal({horse:horse.record,edit:true})
                            }
                          >
                            Bổ sung hồ sơ
                          </button>
                        ) : (
                          <button
                            className="horse-secondary-action"
                            onClick={() =>
                              setModal({horse:horse.record,edit:true})
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
      {modal&&<HorseProfileModal horse={modal.horse} edit={modal.edit} close={()=>setModal(null)} reload={reload}/>}
    </CustomerLayout>
  );
}

export default MyHorsesPage;
function HorsePhoto({horse}:{horse:HorseRecord}){const [src,setSrc]=useState("");useEffect(()=>{if(!horse.hasDocuments)return;let active=true;let url="";relational.pdfUrl(`/customer/horses/${horse.horseId}/files/photo`).then(v=>{url=v;if(active)setSrc(v);else URL.revokeObjectURL(v);}).catch(()=>{});return()=>{active=false;if(url)URL.revokeObjectURL(url);};},[horse.horseId,horse.version,horse.hasDocuments]);return src?<img src={src} alt={horse.name}/>:<span>Ảnh ngựa</span>;}
