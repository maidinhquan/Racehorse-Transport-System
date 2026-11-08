import React, { useState } from 'react';

import { useNavigate } from 'react-router-dom';

import type { SpecTrip, TripDocument } from '../../../types';

import { useSpecialist } from '../../../hooks/useSpecialist';

import {

  LEVEL_VI,

  STAGE_VI,

  addDays,

  checklist,

  defaultDocValues,

  fmtDate,

  fmtDateTime,

  horseName,

  itemName,

  latestVersion,

  today,

} from '../../../hooks/specialistRules';

import { DocumentPreviewModal, RecordDocModal } from '../../../components/Modals';

import { Icon } from '../../../components/SpecialistLayout';

import { TripStatusBadge } from '../../../components/TripStatusBadge/TripStatusBadge';
import { useSharedIncidents } from '../../../../../shared/utils/sharedIncidents';



/** Giấy tờ công ty phải làm (giấy phép, kiểm dịch, tờ khai), lịch kiểm dịch, điểm kiểm tra và yêu cầu bổ sung */

export const CompanyDocsTab: React.FC<{ trip: SpecTrip }> = ({ trip: t }) => {

  const navigate = useNavigate();

  const { data, actions } = useSpecialist();
  const [record, setRecord] = useState<{ typeId?: string; horseId?: string | null } | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ doc: TripDocument; title: string } | null>(null);



  const items = checklist(data, t).items.filter((i) => i.provider === 'CBN');

  const done = items.filter((i) => i.counted && i.status === 'APPROVED').length;

  const total = items.filter((i) => i.counted).length;

  const incidents = useSharedIncidents(t.id);
  const hasIncident = (t.status as string) === 'INCIDENT' || incidents.length > 0;
  const isDocsLocked = Boolean(t.docsReady) && !hasIncident;
  const editable = !isDocsLocked && t.status !== 'COMPLETED';



  const handleQuickApproveAll = () => {

    items.forEach((i) => {

      if (i.status !== 'APPROVED') {

        const def = defaultDocValues(i.typeId, t.id);

        const etaDate = (t.eta || '').slice(0, 10) || today();

        const res = actions.recordDocument({

          tripId: t.id,

          typeId: i.typeId,

          horseId: i.horseId,

          number: def.number,

          issuer: def.issuer,

          issuedAt: today(),

          expiry: addDays(etaDate, 30),

          file: def.file,

        });

        if (res.ok && res.id) {

          actions.reviewDocument(res.id, 0, 'APPROVED', 'Đã thẩm định đạt yêu cầu');

          actions.togglePhysicalCopy(res.id, true);

        }

      }

    });

  };



  return (

    <div className="spc-stack">

      <div className="spc-card" style={{ padding: 0 }}>

        <h3 className="spc-card__title" style={{ padding: '16px 18px 0', flexWrap: 'wrap', gap: 10 }}>

          <span>Hồ sơ công ty phải làm <span className="spc-muted">{done}/{total}</span></span>

          {editable && (

            <div className="spc-btn-row" style={{ margin: 0 }}>

              {done < total && (

                <button

                  type="button"

                  className="spc-btn spc-btn--solid spc-btn--sm"

                  onClick={handleQuickApproveAll}

                  title="Tự động ghi nhận và hoàn tất phê duyệt các chứng từ CBN còn thiếu"

                >

                  <Icon name="check" />Duyệt nhanh tất cả mục công ty

                </button>

              )}

              <button type="button" className="spc-btn spc-btn--sm" onClick={() => setRecord({})}>

                <Icon name="plus" />Ghi nhận chứng từ

              </button>

            </div>

          )}

        </h3>

        {isDocsLocked && (
          <div className="spc-ready-locked-alert" style={{ margin: '12px 18px 0' }}>
            <Icon name="lock" />
            <div>
              <b>Hồ sơ công ty đã khoá.</b>
              <div>Chuyến đã được xác nhận Docs READY — không thể ghi nhận, phê duyệt hay chỉnh sửa chứng từ trừ khi có sự cố vận chuyển phát sinh.</div>
            </div>
          </div>
        )}

        {t.docsReady && hasIncident && (
          <div className="spc-incident-unlocked-alert" style={{ margin: '12px 18px 0' }}>
            <Icon name="alert" />
            <div>
              <b>Mở quyền điều chỉnh theo sự cố.</b>
              <div>Chuyến đang có sự cố vận chuyển ({incidents.length} sự cố) — cho phép Chuyên viên ghi nhận và chỉnh sửa chứng từ công ty.</div>
            </div>
          </div>
        )}

        <p className="spc-subtitle" style={{ padding: '0 18px' }}>

          CBN Transport làm thủ tục với cơ quan chức năng: giấy phép xuất/nhập khẩu, kiểm dịch, tờ khai hải quan. Giấy tờ của ngựa do khách cung cấp nằm ở ô “Giấy tờ khách hàng cung cấp”.

        </p>

        <div className="spc-cdoc-list" style={{ padding: '0 18px 18px' }}>
          {items.map((i) => {
            const d = i.doc;
            const v = latestVersion(d);
            const rv = d?.reviews[d.reviews.length - 1];
            const title = itemName(data, t, i);
            const isAlert = i.status === 'REJECTED' || i.status === 'NOT_SUBMITTED' || d?.status === 'REJECTED';

            return (
              <div key={`${i.typeId}-${i.horseId ?? ''}`} className={`spc-cdoc ${isAlert ? 'alert' : ''}`}>
                <div className="spc-cdoc__main">
                  <div className="spc-cdoc__top">
                    <b>{title}</b>
                    <TripStatusBadge kind="check" status={i.status} />
                    {d?.expiry && (
                      <TripStatusBadge
                        label={`Hết hạn ${fmtDate(d.expiry)}`}
                        tone={d.expiry < (t.eta || '').slice(0, 10) ? 'bad' : 'muted'}
                      />
                    )}
                    {d && (
                      <button
                        type="button"
                        className="spc-link"
                        style={{ fontSize: 12, fontWeight: 600 }}
                        onClick={() => setPreviewDoc({ doc: d, title })}
                      >
                        {d.id}
                      </button>
                    )}
                  </div>

                  <div className="spc-cdoc__note" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', alignItems: 'center', marginTop: 6 }}>
                    <span><b>Phạm vi:</b> {horseName(t, i.horseId)}</span>
                    <span className="spc-muted">•</span>
                    <span>{LEVEL_VI[i.level]} • {STAGE_VI[i.stage]}</span>
                    {v && d && (
                      <>
                        <span className="spc-muted">•</span>
                        <span><b>Tệp:</b> <button type="button" className="spc-link" onClick={() => setPreviewDoc({ doc: d, title })}>{v.file}</button> (v{v.v})</span>
                      </>
                    )}
                    {d?.issuedAt && (
                      <>
                        <span className="spc-muted">•</span>
                        <span><b>Cấp:</b> {fmtDate(d.issuedAt)}</span>
                      </>
                    )}
                    {i.condition && (
                      <>
                        <span className="spc-muted">•</span>
                        <span>{i.condition}</span>
                      </>
                    )}
                    {!i.counted && (
                      <>
                        <span className="spc-muted">•</span>
                        <span className="spc-muted">Không tính vào mục bắt buộc</span>
                      </>
                    )}
                  </div>

                  {d?.status === 'REJECTED' && d.rejectReason && (
                    <div className="spc-cdoc__issue">Lý do từ chối: {d.rejectReason}</div>
                  )}

                  {rv?.remark && (
                    <div className="spc-cdoc__note" style={{ color: '#0369a1', marginTop: 4 }}>
                      Ghi chú duyệt: {rv.remark} {rv.by ? `(${rv.by} • ${fmtDateTime(rv.at)})` : ''}
                    </div>
                  )}
                </div>

                <div className="spc-cdoc__actions spc-btn-row">
                  {d && (
                    <button
                      type="button"
                      className={`spc-phys ${d.physicalCopy ? 'on' : ''}`}
                      disabled={isDocsLocked}
                      title={isDocsLocked ? 'Hồ sơ đã khoá — không thể đổi trạng thái bản cứng' : undefined}
                      onClick={() => !isDocsLocked && actions.togglePhysicalCopy(d.id)}
                      style={isDocsLocked ? { cursor: 'not-allowed', opacity: 0.75 } : undefined}
                    >
                      {d.physicalCopy ? '✓ Đã nhận bản cứng' : 'Chưa nhận bản cứng'}
                    </button>
                  )}

                  {d && (
                    <button
                      type="button"
                      className="spc-btn spc-btn--sm"
                      onClick={() => setPreviewDoc({ doc: d, title })}
                    >
                      Xem tệp
                    </button>
                  )}

                  {i.missingRule ? (
                    editable ? (
                      <button type="button" className="spc-btn spc-btn--sm" onClick={() => navigate('/specialist/regulations/sets')}>
                        Bộ yêu cầu
                      </button>
                    ) : null
                  ) : d?.status === 'SUBMITTED' ? (
                    <>
                      {editable && (
                        <button
                          type="button"
                          className="spc-btn spc-btn--solid spc-btn--sm"
                          onClick={() => actions.reviewDocument(d.id, v?.v ?? 1, 'APPROVED', 'Đạt yêu cầu')}
                        >
                          Chấp thuận
                        </button>
                      )}
                    </>
                  ) : editable && i.status !== 'APPROVED' ? (
                    <button
                      type="button"
                      className="spc-btn spc-btn--solid spc-btn--sm"
                      onClick={() => setRecord({ typeId: i.typeId, horseId: i.horseId })}
                    >
                      {d ? 'Ghi nhận bản mới' : 'Ghi nhận'}
                    </button>
                  ) : d && editable ? (
                    <button
                      type="button"
                      className="spc-btn spc-btn--sm"
                      title="Cập nhật bản mới"
                      onClick={() => setRecord({ typeId: i.typeId, horseId: i.horseId })}
                    >
                      Sửa
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
          {items.length === 0 && (
            <p className="spc-muted" style={{ padding: '8px 0', margin: 0 }}>
              Chưa có danh mục chứng từ công ty cho tuyến này.
            </p>
          )}
        </div>

      </div>



      {record && <RecordDocModal open trip={t} typeId={record.typeId} horseId={record.horseId} onClose={() => setRecord(null)} />}

      {previewDoc && (

        <DocumentPreviewModal

          open={!!previewDoc}

          title={previewDoc.title}

          fileName={previewDoc.doc?.versions?.[previewDoc.doc.versions.length - 1]?.file || ''}

          companyDoc={previewDoc.doc}

          trip={t}

          onClose={() => setPreviewDoc(null)}

          onApprove={editable && previewDoc.doc?.status === 'SUBMITTED' ? () => {

            actions.reviewDocument(previewDoc.doc.id, previewDoc.doc.versions.length, 'APPROVED', 'Đạt yêu cầu');

            setPreviewDoc(null);

          } : undefined}

        />

      )}

    </div>

  );

};



export default CompanyDocsTab;

