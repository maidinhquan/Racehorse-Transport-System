import React, { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CustomerLayout, Icon } from '../../components/CustomerLayout';
import { HorseForm } from '../../components/HorseForm/HorseForm';
import { Note } from '../../components/Common/Common';
import { useCustomer } from '../../hooks/useCustomer';
import type { HorseInput } from '../../types';
import { emptyHorse, horseRequests } from '../../hooks/customerRules';
import './HorseFormPage.css';

/** Thêm ngựa mới (/customer/horses/new) hoặc sửa hồ sơ (/customer/horses/:horseId/edit?back=…) */
export const HorseFormPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { horseId } = useParams<{ horseId: string }>();
  const { horses, requests, actions } = useCustomer();
  const h = horseId ? horses.find((x) => x.id === horseId) : undefined;
  const [form, setForm] = useState<HorseInput>(() => {
    if (!h) return emptyHorse();
    const { id: _id, ...rest } = h;
    void _id;
    return JSON.parse(JSON.stringify(rest)) as HorseInput;
  });
  const [invalid, setInvalid] = useState<string[]>([]);
  const back = params.get('back') || (h ? `/customer/horses/${h.id}` : '/customer/horses');

  if (horseId && !h) {
    return <CustomerLayout title="Ngựa của tôi"><Note tone="grey" title="Không tìm thấy ngựa">Ngựa {horseId} không có trong thư viện của bạn.</Note></CustomerLayout>;
  }
  const lockedBy = h ? horseRequests(h, requests).map((r) => r.id) : [];

  const save = async () => {
    const bad: string[] = [];
    if (!form.name.trim()) bad.push('name');
    setInvalid(bad);
    if (bad.length) { actions.showToast('Nhập tên ngựa.'); return; }
    const res = await (h ? actions.updateHorse(h.id, form) : actions.createHorse(form));
    if (res.ok) navigate(h ? back : `/customer/horses/${res.id}`);
  };

  return (
    <CustomerLayout title="Ngựa của tôi">
      <button type="button" className="cus-back" onClick={() => navigate(back)}><Icon name="back" />{h ? `Quay lại` : 'Ngựa của tôi'}</button>
      <h2 className="cus-title">{h ? 'Sửa hồ sơ ngựa' : 'Thêm ngựa mới'}</h2>
      <p className="cus-subtitle" style={{ marginBottom: 16 }}>
        {h ? `${h.name} • ${h.id}` : 'Lưu ngựa vào thư viện riêng. Giấy tờ còn thiếu có thể tải lên sau; Specialist chỉ kiểm duyệt khi ngựa thuộc yêu cầu đã kích hoạt.'}
      </p>
      <div className="cus-horse-form-page">
        <HorseForm value={form} onChange={setForm} lockedBy={lockedBy} invalid={invalid} />
        <div className="cus-btn-row cus-horse-form-page__actions">
          <button type="button" className="cus-btn cus-btn--lg" onClick={() => navigate(back)}>Hủy</button>
          <button type="button" className="cus-btn cus-btn--solid cus-btn--lg" onClick={save}>{h ? 'Lưu thay đổi' : 'Lưu hồ sơ ngựa'}</button>
        </div>
      </div>
    </CustomerLayout>
  );
};

export default HorseFormPage;
