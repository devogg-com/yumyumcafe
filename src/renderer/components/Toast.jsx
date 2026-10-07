import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export default function Toast() {
  const { toasts } = useApp();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      pointerEvents: 'none'
    }}>
      {toasts.map((t) => {
        const isSuccess = t.type === 'success';
        const isError = t.type === 'error';

        const bg = isSuccess ? '#ecfdf5' : isError ? '#fff1f2' : '#eff6ff';
        const border = isSuccess ? '#a7f3d0' : isError ? '#fecdd3' : '#bfdbfe';
        const color = isSuccess ? '#065f46' : isError ? '#9f1239' : '#1e40af';
        const Icon = isSuccess ? CheckCircle2 : isError ? AlertCircle : Info;

        return (
          <div
            key={t.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 18px',
              backgroundColor: bg,
              border: `1.5px solid ${border}`,
              color: color,
              borderRadius: '10px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
              fontSize: '13.5px',
              fontWeight: '600',
              maxWidth: '380px',
              pointerEvents: 'auto',
              animation: 'fadeIn 0.2s ease'
            }}
          >
            <Icon size={18} style={{ flexShrink: 0 }} />
            <span>{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
