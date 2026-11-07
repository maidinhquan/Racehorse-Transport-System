import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Icon } from '../DriverLayout';
import { AuthImage } from '../../../../shared/components/AuthImage';
import { useAuthFileUrl } from '../../../../shared/api/useAuthFileUrl';
import { fmtDateTime } from '../../hooks/driverRules';
import { apiRequest } from '../../../../shared/api/apiRequest';
import type { Horse, Trip } from '../../types';

interface HorseDetailModalProps {
  horse: Horse | null;
  trip: Trip;
  onClose: () => void;
  onOpenHealth?: () => void;
}

type HorseProfile = {
  dob?: string; value?: string; currency?: string; healthNotes?: string;
  passport?: { number?: string; authority?: string; issueDate?: string; expiryDate?: string; scan?: { name: string; url?: string } };
  photo?: { name: string; url?: string }; ownership?: { name: string; url?: string }; valueProof?: { name: string; url?: string };
  medical?: Array<{ type?: string; status?: string; expiryDate?: string; file?: { name: string; url?: string } }>;
};

const AuthFileLink: React.FC<{ url?: string }> = ({ url }) => {
  const resolved = useAuthFileUrl(url);
  return resolved ? <a href={resolved} target="_blank" rel="noreferrer">Xem tệp</a> : null;
};

export const HorseDetailModal: React.FC<HorseDetailModalProps> = ({ horse, trip, onClose, onOpenHealth }) => {
  const [profile, setProfile] = useState<HorseProfile | null>(null);
  useEffect(() => {
    setProfile(null);
    if (!horse) return;
    let active = true;
    apiRequest<HorseProfile>('get', `/driver/trips/${trip.id}/horses/${horse.id}`)
      .then((data) => { if (active) setProfile(data); })
      .catch(() => {});
    return () => { active = false; };
  }, [horse?.id, trip.id]);
  if (!horse) return null;

  const latestHealth = [...trip.health]
    .reverse()
    .find((h) => h.horseId === horse.id);
  const vaccine = profile?.medical?.find((record) => record.type === 'DT-3' || record.type === 'VACCINATION');
  const healthCertificate = profile?.medical?.find((record) => record.type === 'DT-2' || record.type === 'HEALTH_CERTIFICATE');

  return (
    <Modal
      open={!!horse}
      title={`Thông tin cá thể ngựa: ${horse.name || horse.id}`}
      onClose={onClose}
      okText={onOpenHealth ? 'Nhật ký sức khỏe' : 'Đóng'}
      onOk={onOpenHealth ? onOpenHealth : onClose}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '65vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <span className="drv-horse__thumb" style={{ width: 48, height: 48, fontSize: 18, overflow: 'hidden' }}>
            {profile?.photo?.url ? <AuthImage src={profile.photo.url} alt={horse.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} fallback={(horse.name || horse.id).slice(0, 1)} /> : (horse.name || horse.id).slice(0, 1)}
          </span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{horse.name || horse.id}</div>
            <div style={{ fontSize: 12, color: 'var(--drv-muted)' }}>Mã số: {horse.id}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '10px 0', borderTop: '1px solid var(--drv-line)', borderBottom: '1px solid var(--drv-line)' }}>
          <div>
            <span style={{ fontSize: 11, color: 'var(--drv-muted)', display: 'block' }}>Mã Microchip (ISO)</span>
            <b style={{ userSelect: 'all' }}>{horse.microchip || 'Chưa có'}</b>
          </div>
          <div>
            <span style={{ fontSize: 11, color: 'var(--drv-muted)', display: 'block' }}>Giống loài</span>
            <b>{horse.breed || 'Chưa có'}</b>
          </div>
          <div>
            <span style={{ fontSize: 11, color: 'var(--drv-muted)', display: 'block' }}>Giới tính</span>
            <b>{horse.sex || 'Chưa có'}</b>
          </div>
          <div>
            <span style={{ fontSize: 11, color: 'var(--drv-muted)', display: 'block' }}>Tuổi</span>
            <b>{horse.age ? `${horse.age} tuổi` : 'Chưa có'}</b>
          </div>
          <div>
            <span style={{ fontSize: 11, color: 'var(--drv-muted)', display: 'block' }}>Màu lông</span>
            <b>{horse.color || 'Chưa có'}</b>
          </div>
          <div>
            <span style={{ fontSize: 11, color: 'var(--drv-muted)', display: 'block' }}>Ngày sinh</span>
            <b>{profile?.dob || '—'}</b>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <section className="drv-card">
            <h4 style={{ margin: '0 0 10px' }}>Hộ chiếu ngựa</h4>
            <div>Số hộ chiếu: <b>{profile?.passport?.number || '—'}</b></div>
            <div>Cơ quan cấp: <b>{profile?.passport?.authority || '—'}</b></div>
            <div>Ngày cấp: <b>{profile?.passport?.issueDate || '—'}</b></div>
            <div>Ngày hết hạn: <b>{profile?.passport?.expiryDate || '—'}</b></div>
            <small>{profile?.passport?.scan?.name || 'Chưa có bản scan'}</small> <AuthFileLink url={profile?.passport?.scan?.url} />
          </section>
          <section className="drv-card">
            <h4 style={{ margin: '0 0 10px' }}>Sở hữu & giá trị thương mại</h4>
            <div>Chứng nhận sở hữu: <b>{profile?.ownership?.name || 'Chưa có'}</b> <AuthFileLink url={profile?.ownership?.url} /></div>
            <div>Giá trị khai báo: <b>{profile?.value ? `${Number(profile.value).toLocaleString('en-US')} ${profile.currency || 'VND'}` : '—'}</b></div>
            <div>Bằng chứng định giá: <b>{profile?.valueProof?.name || 'Chưa có'}</b> <AuthFileLink url={profile?.valueProof?.url} /></div>
          </section>
          <section className="drv-card" style={{ gridColumn: '1 / -1' }}>
            <h4 style={{ margin: '0 0 10px' }}>Tiêm ngừa, sức khỏe & bác sĩ thú y</h4>
            <div>Ghi chú sức khỏe: <b>{profile?.healthNotes || 'Không khai báo'}</b></div>
            <div>Bác sĩ thú y: <b>—</b> · Điện thoại: <b>—</b></div>
            <div>Sổ tiêm ngừa: <b>{vaccine?.file?.name || (vaccine?.status ? `Đang xử lý (${vaccine.status})` : 'Còn thiếu')}</b>{vaccine?.expiryDate ? ` · Hạn đến ${vaccine.expiryDate}` : ''} <AuthFileLink url={vaccine?.file?.url} /></div>
            <div>Giấy chứng nhận sức khỏe: <b>{healthCertificate?.file?.name || (healthCertificate?.status ? `Đang xử lý (${healthCertificate.status})` : 'Còn thiếu')}</b>{healthCertificate?.expiryDate ? ` · Hạn đến ${healthCertificate.expiryDate}` : ''} <AuthFileLink url={healthCertificate?.file?.url} /></div>
          </section>
        </div>

        <div>
          <h4 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700 }}>Tình trạng sức khỏe gần nhất</h4>
          {latestHealth ? (
            <div style={{ background: 'var(--drv-card, #f8fafc)', border: '1px solid var(--drv-line, #e2e8f0)', borderRadius: 10, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--drv-muted)' }}>Cập nhật: {fmtDateTime(latestHealth.at)}</span>
                <span
                  className={`drv-badge drv-badge--${
                    latestHealth.condition === 'NORMAL'
                      ? 'ok'
                      : latestHealth.condition === 'MONITOR'
                      ? 'warn'
                      : 'bad'
                  }`}
                >
                  {latestHealth.condition === 'NORMAL' ? 'Bình thường' : latestHealth.condition === 'MONITOR' ? 'Cần theo dõi' : 'Bất thường'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                <div>Thân nhiệt: <b>{latestHealth.temp}°C</b></div>
                <div>Nhịp tim: <b>{latestHealth.hr} bpm</b></div>
              </div>
              {latestHealth.notes && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--drv-muted)' }}>
                  Ghi chú: {latestHealth.notes}
                </div>
              )}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 12, color: 'var(--drv-muted)' }}>Chưa có ghi nhận nhật ký sức khỏe nào cho cá thể này.</p>
          )}
        </div>

        {trip.notes && (
          <div className="drv-note drv-note--yellow" style={{ margin: 0 }}>
            <Icon name="info" />
            <div>
              <b>Chăm sóc đặc biệt trên chuyến:</b> {trip.notes}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default HorseDetailModal;
