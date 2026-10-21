import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { TransportRequest } from '../../types';
import { Icon } from '../CustomerLayout';
import './WizardStepper.css';

export const WIZARD_STEPS = ['Thông tin chuyến', 'Điểm nhận & giao', 'Ngựa & hồ sơ', 'Xem lại & gửi'];

/** Đường dẫn của từng bước wizard (0 = thông tin chuyến) */
export const wizardPath = (r: Pick<TransportRequest, 'id'> | null, step: number) =>
  !r ? '/customer/requests/new' : step === 0 ? `/customer/requests/${r.id}/edit` : `/customer/requests/${r.id}/wizard/${step}`;

/** Thanh bước của wizard tạo / sửa yêu cầu (bước đã tới bấm được để quay lại) */
export const WizardStepper: React.FC<{ request: TransportRequest | null; current: number }> = ({ request, current }) => {
  const navigate = useNavigate();
  const reached = request ? request.wizardStep : 0;
  return (
    <div className="cus-wiz" role="list">
      {WIZARD_STEPS.map((label, i) => {
        const cls = i < current ? 'done' : i === current ? 'current' : '';
        const can = !!request && i <= reached && i !== current;
        return (
          <button key={label} type="button" role="listitem" className={`cus-wiz__step ${cls}`} disabled={!can}
            onClick={() => navigate(wizardPath(request, i))}>
            <span className="cus-wiz__num">{i < current ? <Icon name="check" /> : i + 1}</span>{label}
          </button>
        );
      })}
    </div>
  );
};

export default WizardStepper;
