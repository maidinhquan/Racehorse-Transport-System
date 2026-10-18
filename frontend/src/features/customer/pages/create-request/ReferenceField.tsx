import { cloneElement, useId, type ReactElement, type ReactNode } from 'react';

// Keep the reference HTML's .field > label + control structure.
export function ReferenceField({ label, children, full = false }: { label: ReactNode; children: ReactElement<{ id?: string }>; full?: boolean }) {
  const id = useId();
  return <div className={`field${full ? ' full' : ''}`}><label htmlFor={id}>{label}</label>{cloneElement(children, { id })}</div>;
}
