import { useId } from 'react';

interface Props {
  label: string;
  value: number;
  onChange: (v: number) => void;
  error?: string;
  hint?: string;
  prefix?: string;
  suffix?: string;
  step?: number;
  min?: number;
  max?: number;
  /** 以百分比显示小数：内部 0.03 ⇄ 界面 3 */
  percent?: boolean;
  hideLabel?: boolean;
}

export function NumberField({ label, value, onChange, error, hint, prefix, suffix, step = 1, min, max, percent, hideLabel }: Props) {
  const id = useId();
  const shown = Number.isFinite(value) ? (percent ? +(value * 100).toFixed(6) : value) : '';
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-err` : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div className="field">
      <label htmlFor={id} className={hideLabel ? 'visually-hidden' : undefined}>
        {label}
      </label>
      <div className="input-wrap">
        {prefix && <span className="affix pre" aria-hidden="true">{prefix}</span>}
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          max={max}
          value={shown}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(e) => {
            const raw = e.target.value;
            const n = raw === '' ? NaN : Number(raw);
            onChange(percent ? n / 100 : n);
          }}
        />
        {suffix && <span className="affix post" aria-hidden="true">{suffix}</span>}
      </div>
      {hint && <span id={`${id}-hint`} className="hint">{hint}</span>}
      {error && <span id={`${id}-err`} className="error" role="alert">{error}</span>}
    </div>
  );
}
