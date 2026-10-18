export function ReferenceIcon({ name }: { name: 'info' | 'check' | 'file' | 'plus' }) {
  return <svg className="i" viewBox="0 0 24 24" aria-hidden="true">
    {name === 'info' && <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>}
    {name === 'check' && <path d="m5 12 5 5 9-10" />}
    {name === 'file' && <><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></>}
    {name === 'plus' && <path d="M12 5v14M5 12h14" />}
  </svg>;
}
