import React, { useEffect, useState } from 'react';
import type { ActionResult, ContractDraft, CustomerInfo, HorseRef, TransportRequest } from '../../types';
import { curVersion, draftError, fmtDateTime, initialDraft } from '../../hooks/managerRules';
import { managerApi, type ContractEditorData } from '../../api/managerApi';
import { apiMessage } from '../../../../shared/api/apiError';
import { PlanStep } from './steps/PlanStep';
import { PricingStep } from './steps/PricingStep';
import { TermsStep } from './steps/TermsStep';
import { ReviewStep } from './steps/ReviewStep';

const LABELS = ['Phương án', 'Chi phí & giá', 'Điều khoản', 'Xem trước & phát hành'];

interface ContractWizardProps {
  request: TransportRequest;
  customer?: CustomerInfo;
  horses: HorseRef[];
  onSave: (d: ContractDraft) => void | ActionResult | Promise<void | ActionResult>;
  onIssue: (d: ContractDraft) => boolean | ActionResult | Promise<boolean | ActionResult>;
  onCancel?: () => void;
}

/** Trình soạn hợp đồng 4 bước: phương án → chi phí & giá → điều khoản → xem trước & phát hành */
export const ContractWizard: React.FC<ContractWizardProps> = ({ request: r, customer, horses, onSave, onIssue, onCancel }) => {
  const [draft, setDraft] = useState<ContractDraft>(() => initialDraft(r));
  const [editorLoaded, setEditorLoaded] = useState(false);
  const [defaults, setDefaults] = useState<ContractEditorData['defaults'] | null>(null);
  const [policyError, setPolicyError] = useState('');
  useEffect(() => {
    let active = true;
    setEditorLoaded(false); setDefaults(null); setError(''); setPolicyError(''); setStep(0);
    managerApi.getContractEditor(r.id).then(editor => {
      if (!active) return;
      const next = initialDraft({ ...editor.request, draft: editor.draft ?? undefined, versions: editor.versions });
      next.mode ??= editor.defaults.selectedRoute?.mode;
      if (!editor.draft && !editor.currentContract) { next.depositPct = editor.defaults.defaultDepositPct; next.terms = editor.defaults.terms; }
      setDraft(next); setDefaults(editor.defaults); setEditorLoaded(true);
    }).catch(error => { if (active) setError(apiMessage(error)); });
    return () => { active = false; };
  }, [r.id]);
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const policyReady = !!draft.mode && defaults?.selectedRoute?.mode === draft.mode;
  useEffect(() => {
    if (!editorLoaded || !draft.mode || defaults?.selectedRoute?.mode === draft.mode) return;
    let active = true;
    setPolicyError('');
    managerApi.getContractEditor(r.id, draft.mode).then(editor => {
      if (active) setDefaults(editor.defaults);
    }).catch(error => { if (active) setPolicyError(apiMessage(error)); });
    return () => { active = false; };
  }, [r.id, editorLoaded, draft.mode, defaults?.selectedRoute?.mode]);
  const set = (patch: Partial<ContractDraft>) => { setDraft((d) => ({ ...d, ...patch })); setError(''); };
  const v = curVersion(r);

  const stepError = (s: number) => {
    // Lỗi kiểm tra có ghi "Bước n" – chỉ chặn khi lỗi thuộc bước đang rời đi
    const e = draftError(draft);
    return Number(e.match(/Bước (\d)/)?.[1]) === s + 1 ? e : '';
  };

  const goTo = (s: number) => {
    if (s > step) {
      for (let i = step; i < s; i += 1) {
        const e = stepError(i);
        if (e) {
          setStep(i);
          setError(e);
          return;
        }
      }
    }
    setError('');
    setStep(s);
  };

  const save = async () => {
    if (!policyReady) return;
    setSaving(true);
    setError('');
    try {
      const res = await onSave(draft);
      if (typeof res === 'object' && res !== null && 'ok' in res && !res.ok) {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi lưu bản nháp');
    } finally {
      setSaving(false);
    }
  };

  const issue = async () => {
    if (!policyReady) return;
    const e = draftError(draft);
    if (e) {
      setError(e);
      return;
    }
    setIssuing(true);
    setError('');
    try {
      const res = await onIssue(draft);
      if (typeof res === 'object' && res !== null && 'ok' in res) {
        if (!res.ok) {
          setError(res.message);
        }
      } else if (res === false) {
        setError('Không thể phát hành hợp đồng. Vui lòng kiểm tra lại dữ liệu.');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi phát hành hợp đồng');
    } finally {
      setIssuing(false);
    }
  };

  if (!editorLoaded) return <p role="status">{error || 'Đang tải dữ liệu soạn hợp đồng…'}</p>;

  return (
    <div className="mgr-ce__wizard">
      <div className="mgr-between">
        <div>
          <h3 className="mgr-card__title" style={{ margin: 0 }}>{v ? `Soạn phiên bản v${v.v + 1} thay cho v${v.v}` : 'Soạn hợp đồng mới'} • {r.id}</h3>
          <p className="mgr-hint" style={{ marginTop: 4 }}>Chi phí dự kiến chỉ Manager xem; khách hàng chỉ nhận giá bán và điều khoản.{r.draft?.savedAt ? ` Bản nháp lưu lúc ${fmtDateTime(r.draft.savedAt)}.` : ''}</p>
        </div>
        {onCancel && <button type="button" className="mgr-btn mgr-btn--sm" onClick={onCancel}>Đóng trình soạn</button>}
      </div>
      <nav className="mgr-stepper" aria-label="Các bước soạn hợp đồng">
        {LABELS.map((l, i) => (
          <button key={l} type="button" className={`${i === step ? 'on' : ''} ${i < step ? 'done' : ''}`} aria-current={i === step ? 'step' : undefined} onClick={() => goTo(i)}>
            <span>{i < step ? '✓' : i + 1}</span>{l}
          </button>
        ))}
      </nav>
      <div className="mgr-ce__panel">
        {step === 0 && <PlanStep request={r} draft={draft} set={set} horses={horses} defaults={defaults!} policyReady={policyReady} />}
        {step === 1 && <PricingStep request={r} draft={draft} set={set} />}
        {step === 2 && <TermsStep draft={draft} set={set} />}
        {step === 3 && <ReviewStep request={r} draft={draft} customer={customer} horses={horses} />}
      </div>
      {policyError && <p className="mgr-modal__error" role="alert">{policyError}</p>}
      {error && <p className="mgr-modal__error" role="alert" style={{ fontSize: 13 }}>{error}</p>}
      <div className="mgr-ce__foot">
        <button type="button" className="mgr-btn" disabled={step === 0 || issuing || saving} onClick={() => goTo(step - 1)}>← Quay lại</button>
        <div className="mgr-btn-row">
          <button type="button" className="mgr-btn" disabled={saving || issuing || !policyReady} onClick={save}>
            {saving ? 'Đang lưu vào DB...' : 'Lưu bản nháp'}
          </button>
          {step < 3
            ? <button type="button" className="mgr-btn mgr-btn--solid" disabled={issuing || saving || !policyReady} onClick={() => goTo(step + 1)}>Tiếp tục →</button>
            : <button type="button" className="mgr-btn mgr-btn--solid" disabled={issuing || saving || !policyReady} onClick={issue}>
                {issuing ? 'Đang lưu & phát hành...' : 'Phát hành hợp đồng'}
              </button>}
        </div>
      </div>
    </div>
  );
};

export default ContractWizard;
