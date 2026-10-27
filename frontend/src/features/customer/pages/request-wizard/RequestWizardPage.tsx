import React from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { CustomerLayout, Icon } from '../../components/CustomerLayout';
import { WizardStepper } from '../../components/WizardStepper/WizardStepper';
import { Note } from '../../components/Common/Common';
import { useCustomer } from '../../hooks/useCustomer';
import { cityLabel } from '../../hooks/customerRules';
import { HorsesStep } from './steps/HorsesStep';
import { ReviewStep } from './steps/ReviewStep';
import './RequestWizardPage.css';

/** Three logical steps; legacy wizard/1 redirects to the merged address/schedule form. */
export const RequestWizardPage: React.FC = () => {
  const navigate = useNavigate();
  const { requestId = '', step = '1' } = useParams<{ requestId: string; step: string }>();
  const { getRequest } = useCustomer();
  const r = getRequest(requestId);

  if (!r) {
    return (
      <CustomerLayout title="Yêu cầu vận chuyển">
        <Note tone="grey" title="Không tìm thấy yêu cầu">Yêu cầu {requestId} không tồn tại.</Note>
      </CustomerLayout>
    );
  }
  if (!['DRAFT', 'CHANGES_REQUESTED'].includes(r.status)) return <Navigate to={`/customer/requests/${r.id}`} replace />;
  const n = Math.min(Math.max(Number(step) || 1, 1), 3);
  if (n === 1) return <Navigate to={`/customer/requests/${r.id}/edit`} replace />;
  if (n > r.wizardStep) return <Navigate to={`/customer/requests/${r.id}/wizard/${Math.max(1, r.wizardStep)}`} replace />;

  return (
    <CustomerLayout title="Yêu cầu vận chuyển">
      <button type="button" className="cus-back" onClick={() => navigate(`/customer/requests/${r.id}`)}><Icon name="back" />Quay lại {r.id}</button>
      <h2 className="cus-title">{r.status === 'CHANGES_REQUESTED' ? `Sửa yêu cầu ${r.id}` : 'Tạo yêu cầu vận chuyển'}</h2>
      <p className="cus-subtitle">{r.id} • {cityLabel(r.origin)} → {cityLabel(r.destination)} • {r.horseCount} ngựa</p>
      <WizardStepper request={r} current={n} />
      {r.status === 'CHANGES_REQUESTED' && r.feedback && <Note tone="yellow" title="Góp ý của Manager">{r.feedback}</Note>}
      {n === 2 && <HorsesStep request={r} />}
      {n === 3 && <ReviewStep request={r} />}
    </CustomerLayout>
  );
};

export default RequestWizardPage;
