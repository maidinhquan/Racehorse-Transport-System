import React from 'react';
import type { ActionResult } from '../../types';
import './DemoPanel.css';

export interface DemoButton {
  label: string;
  run: () => ActionResult | void;
  primary?: boolean;
  /** Ẩn nút khi không áp dụng được */
  hidden?: boolean;
}

/**
 * Bảng nút demo: giả lập thao tác của khách hàng, Specialist, Coordinator, tổ xe hoặc cổng thanh toán
 * trên dữ liệu dùng chung. Không nút nào thay thế quyết định chính thức của Manager.
 */
export const DemoPanel: React.FC<{ buttons: DemoButton[]; title?: string; hint?: string }> = ({ buttons, title = 'Nút demo', hint }) => {
  const shown = buttons.filter((b) => !b.hidden);
  if (!shown.length) return null;
  return (
    <div className="mgr-demo">
      <div className="mgr-demo__title">{title}</div>
      <p>{hint ?? 'Giả lập thao tác của vai trò khác trên dữ liệu dùng chung để thử tình huống tiếp theo.'}</p>
      {shown.map((b) => (
        <button key={b.label} type="button" className={`mgr-btn mgr-btn--sm mgr-btn--block ${b.primary ? 'mgr-btn--solid' : ''}`} onClick={() => { b.run(); }}>{b.label}</button>
      ))}
    </div>
  );
};

export default DemoPanel;
