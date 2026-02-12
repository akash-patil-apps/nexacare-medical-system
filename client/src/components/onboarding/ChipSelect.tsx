import React from 'react';
import { CheckOutlined, PlusOutlined } from '@ant-design/icons';

const NONE = 'None';

export type ChipSelectOption = { label: string; value: string };

const chipBase = {
  padding: '10px 16px',
  borderRadius: 12,
  border: '1.5px solid #D1D5DB',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  marginRight: 8,
  marginBottom: 8,
  fontSize: 14,
  fontWeight: 500,
  transition: 'all 0.2s',
};
const chipUnselected = { background: '#F9FAFB', color: '#6B7280' };
const chipSelected = { background: '#ECFDF5', borderColor: '#059669', color: '#059669' };

interface ChipSelectProps {
  options: ChipSelectOption[];
  value?: string | string[]; // form may pass comma-separated string or array
  onChange?: (value: string[]) => void;
}

export function ChipSelect({ options, value, onChange }: ChipSelectProps) {
  const normalized = Array.isArray(value) ? value : (typeof value === 'string' && value ? value.split(',').map((s) => s.trim()).filter(Boolean) : []);
  const selectedSet = new Set(normalized);
  const hasNone = selectedSet.has(NONE);

  const toggle = (optValue: string) => {
    let next: string[];
    if (optValue === NONE) {
      next = hasNone ? [] : [NONE];
    } else {
      const nextSet = new Set(selectedSet);
      if (nextSet.has(NONE)) nextSet.delete(NONE);
      if (nextSet.has(optValue)) nextSet.delete(optValue);
      else nextSet.add(optValue);
      next = Array.from(nextSet);
    }
    onChange?.(next);
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0 }}>
      {options.map((opt) => {
        const isSelected = selectedSet.has(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            style={{
              ...chipBase,
              ...(isSelected ? chipSelected : chipUnselected),
            }}
          >
            {isSelected ? <CheckOutlined style={{ fontSize: 14 }} /> : <PlusOutlined style={{ fontSize: 12 }} />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** Wrapper for Form.Item: form stores string (comma-separated); ChipSelect uses array internally */
export function ChipSelectFormField({ value, onChange, ...rest }: Omit<ChipSelectProps, 'onChange'> & { onChange?: (v: string) => void }) {
  const arr = typeof value === 'string' && value ? value.split(',').map((s) => s.trim()).filter(Boolean) : [];
  const handleChange = (next: string[]) => {
    onChange?.(next.length ? next.join(', ') : '');
  };
  return <ChipSelect {...rest} value={arr} onChange={handleChange} />;
}
