// Hộp thoại dùng chung (openModal của bản HTML): tiêu đề, nội dung form, lỗi, Hủy / Xác nhận
import { useEffect, useState } from 'react';
import type { Any } from '../../store/coordinatorStore';
import { closeModal, modalState, useCoordinatorStore } from '../../store/coordinatorStore';
import { FormCtx } from './ui';

function ModalBody({ spec }: { spec: NonNullable<typeof modalState.spec> }) {
  const [v, setV] = useState<Record<string, Any>>(() => ({ ...(spec.init || {}) }));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (name: string, value: Any) => setV((old) => { const next = { ...old, [name]: value }; spec.onChange?.(name, value, next); return next; });
  const ok = async () => {
    if (busy) return;
    if (!spec.onOk) { closeModal(); return; }
    setBusy(true);
    try {
      const res = await spec.onOk(v);
      if (typeof res === 'string' && res) { setError(res); return; }
      if (modalState.spec === spec) closeModal();
    } finally { setBusy(false); }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div className="modal-wrap">
      <div className="modal-back" onClick={closeModal} />
      <div className={`modal ${spec.wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h3 id="modal-title">{spec.title}</h3>
        <div className="modal-body">
          <FormCtx.Provider value={{ v, set }}>{spec.body ? spec.body({ v, set }) : null}</FormCtx.Provider>
        </div>
        {error ? <p className="au-error" id="modal-error">{error}</p> : null}
        <div className="modal-actions">
          {spec.noCancel ? null : <button type="button" className="btn ghost lg" onClick={closeModal}>{spec.cancel || 'Hủy'}</button>}
          {spec.ok === false ? null : (
            <button type="button" className={`btn ${spec.danger ? 'danger-solid' : 'solid'} lg`} id="modal-ok" disabled={busy} onClick={ok}>{spec.ok || 'Xác nhận'}</button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ModalHost() {
  useCoordinatorStore();
  const spec = modalState.spec;
  return <div id="modal">{spec ? <ModalBody key={modalState.key} spec={spec} /> : null}</div>;
}
