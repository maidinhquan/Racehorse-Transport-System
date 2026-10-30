import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { TransportRequest } from '../../types';
import { Icon } from '../CustomerLayout';
import './WizardStepper.css';

export const WIZARD_STEPS = ['Nhận & giao ngựa', 'Ngựa & hồ sơ', 'Kiểm tra & gửi'];

/** Đường dẫn của từng bước wizard (0 = thông tin chuyến) */
export const wizardPath = (r: Pick<TransportRequest, 'id'> | null, step: number) =>
  !r ? '/customer/requests/new' : step <= 1 ? `/customer/requests/${r.id}/edit` : `/customer/requests/${r.id}/wizard/${step}`;

/** Thanh bước của wizard tạo / sửa yêu cầu (bước đã tới bấm được để quay lại) */
export const WizardStepper: React.FC<{ request: TransportRequest | null; current: number }> = ({ request, current }) => {
  const navigate = useNavigate();
  const reached = request ? request.wizardStep : 0;
  const stages = [0, 2, 3];
  const active = current <= 1 ? 0 : current - 1;
  return (
    <div className="cus-wiz" role="list">
      {WIZARD_STEPS.map((label, i) => {
        const cls = i < active ? 'done' : i === active ? 'current' : '';
        const can = !!request && stages[i] <= reached && i !== active;
        return (
          <button key={label} type="button" role="listitem" className={`cus-wiz__step ${cls}`} disabled={!can} aria-current={i === active ? 'step' : undefined}
            onClick={() => navigate(wizardPath(request, stages[i]))}>
            <span className="cus-wiz__num">{i < active ? <Icon name="check" /> : i + 1}</span>{label}
          </button>
        );
      })}
    </div>
  );
};

export default WizardStepper;
