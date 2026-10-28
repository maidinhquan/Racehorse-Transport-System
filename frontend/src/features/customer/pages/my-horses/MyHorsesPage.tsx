import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CustomerLayout, Icon } from '../../components/CustomerLayout';
import { TripStatusBadge } from '../../components/TripStatusBadge/TripStatusBadge';
import { useCustomer } from '../../hooks/useCustomer';
import { useHorseFilter } from '../../hooks/useCustomerFilter';
import { PROFILE_LABEL, fmtDate, horseLine, horseRequests, profileStatus, shortCity } from '../../hooks/customerRules';
import './MyHorsesPage.css';
import { AuthImage } from '../../../../shared/components/AuthImage';

/** Ngựa của tôi: thư viện hồ sơ ngựa riêng của khách hàng (không phải hàng chờ duyệt) */
export const MyHorsesPage: React.FC = () => {
  const navigate = useNavigate();
  const { horses, requests } = useCustomer();
  const usedIds = useMemo(() => new Set(requests.filter((r) => r.status !== 'DRAFT').flatMap((r) => r.horses.filter(Boolean))), [requests]);
  const f = useHorseFilter(horses, usedIds);

  return (
    <CustomerLayout title="Ngựa của tôi">
      <div className="cus-head">
        <div>
          <h2 className="cus-title">Ngựa của tôi</h2>
          <p className="cus-subtitle">Thư viện hồ sơ ngựa riêng. Thêm hoặc sửa ngựa không gửi cho Specialist; kiểm duyệt chỉ bắt đầu với yêu cầu vận chuyển đã kích hoạt.</p>
        </div>
        <button type="button" className="cus-btn cus-btn--solid cus-btn--lg" onClick={() => navigate('/customer/horses/new')}><Icon name="plus" />Thêm ngựa</button>
      </div>

      <div className="cus-toolbar">
        <label className="cus-search">
          <Icon name="search" />
          <input value={f.search} onChange={(e) => f.setSearch(e.target.value)} placeholder="Tìm theo tên, mã, giống hoặc microchip…" />
        </label>
        {([['all', 'Tất cả'], ['submitted', 'Đã dùng trong yêu cầu'], ['notSubmitted', 'Chưa dùng']] as const).map(([k, l]) => (
          <button key={k} type="button" className={`cus-chip ${f.filter === k ? 'on' : ''}`} onClick={() => f.setFilter(k)}>{l}</button>
        ))}
      </div>

      <div className="cus-horse-grid">
        {f.rows.map((h) => {
          const used = horseRequests(h, requests), ps = profileStatus(h);
          return (
            <article key={h.id} className="cus-card cus-horse-card">
              <div className="cus-horse-card__photo">
                <AuthImage framed src={h.photo?.url} alt={h.name} fallback={<Icon name="horse" />} />
                <TripStatusBadge label={used.length ? 'Đã dùng trong yêu cầu' : 'Chưa dùng'} tone={used.length ? 'info' : 'muted'} />
              </div>
              <div className="cus-horse-card__body">
                <div className="cus-horse-card__name"><b>{h.name}</b><span>{h.id}</span></div>
                <p className="cus-muted">{horseLine(h)}</p>
                <div className="cus-horse-card__info">
                  <div><span>Microchip</span><b>{h.microchip || 'Chưa có'}</b></div>
                  <div><span>Hồ sơ</span><TripStatusBadge label={PROFILE_LABEL[ps]} tone={ps === 'COMPLETE' ? 'ok' : ps === 'NEEDS_ATTENTION' ? 'bad' : 'warn'} /></div>
                  <div><span>Bản scan hộ chiếu</span><b>{h.passport.scan ? 'Đã tải lên' : 'Chưa có'}</b></div>
                  <div><span>Tiêm cúm gần nhất</span><b>{h.fluDate ? fmtDate(h.fluDate) : 'Chưa có'}</b></div>
                </div>
                <div className="cus-horse-card__usage">
                  <b>{used.length ? `Đã dùng trong ${used.length} yêu cầu` : 'Chưa dùng trong yêu cầu nào'}</b>
                  {used[0] && <span>Gần nhất: {shortCity(used[0].origin)} → {shortCity(used[0].destination)}</span>}
                </div>
                <div className="cus-btn-row">
                  <button type="button" className="cus-btn cus-btn--solid" onClick={() => navigate(`/customer/horses/${h.id}`)}>Xem chi tiết</button>
                  <button type="button" className="cus-btn" onClick={() => navigate(`/customer/horses/${h.id}/edit`)}>
                    {ps === 'COMPLETE' ? 'Sửa thông tin' : ps === 'NEEDS_ATTENTION' ? 'Xử lý vấn đề' : 'Hoàn thiện hồ sơ'}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
        {!f.rows.length && <p className="cus-empty" style={{ gridColumn: '1 / -1' }}>Không có ngựa nào khớp tìm kiếm.</p>}
      </div>
    </CustomerLayout>
  );
};

export default MyHorsesPage;
