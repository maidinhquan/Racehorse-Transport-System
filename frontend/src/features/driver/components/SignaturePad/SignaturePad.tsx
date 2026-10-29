import React, { useEffect, useRef } from 'react';
import './SignaturePad.css';

interface SignaturePadProps {
  /** Ảnh chữ ký hiện có (data URL) */
  value: string | null;
  onChange: (dataUrl: string | null) => void;
}

/** Ô ký tên bằng ngón tay / chuột cho người nhận ngựa */
export const SignaturePad: React.FC<SignaturePadProps> = ({ value, onChange }) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  // Vẽ lại chữ ký đã lưu và đặt kích thước theo mật độ điểm ảnh
  useEffect(() => {
    const c = canvas.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.clientWidth * ratio;
    c.height = c.clientHeight * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0f172a';
    ctx.clearRect(0, 0, c.clientWidth, c.clientHeight);
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, c.clientWidth, c.clientHeight);
      img.src = value;
    }
  }, [value]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const b = e.currentTarget.getBoundingClientRect();
    return [e.clientX - b.left, e.clientY - b.top] as const;
  };

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = e.currentTarget.getContext('2d'); if (!ctx) return;
    drawing.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    ctx.beginPath();
    ctx.moveTo(...pos(e));
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = e.currentTarget.getContext('2d'); if (!ctx) return;
    ctx.lineTo(...pos(e));
    ctx.stroke();
  };
  const up = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    drawing.current = false;
    onChange(e.currentTarget.toDataURL('image/png'));
  };

  return (
    <div className="drv-sig">
      <canvas ref={canvas} className="drv-sig__pad" aria-label="Ô ký tên của người nhận"
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
      {!value && <span className="drv-sig__placeholder">Người nhận ký tên vào đây</span>}
      <div className="drv-btn-row" style={{ marginTop: 8 }}>
        <button type="button" className="drv-btn drv-btn--sm" onClick={() => onChange(null)} disabled={!value}>Xoá chữ ký</button>
      </div>
    </div>
  );
};

export default SignaturePad;
