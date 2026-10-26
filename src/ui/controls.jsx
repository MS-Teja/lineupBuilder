import { forwardRef, useId } from 'react';
import './controls.css';

export const Button = forwardRef(function Button(
  { variant = 'secondary', size = 'md', icon: Icon, children, className = '', ...props },
  ref,
) {
  return (
    <button ref={ref} type="button" className={`btn btn-${variant} btn-${size} ${className}`} {...props}>
      {Icon && <Icon size={size === 'sm' ? 14 : 16} aria-hidden="true" />}
      {children}
    </button>
  );
});

export const IconButton = forwardRef(function IconButton(
  { icon: Icon, label, size = 'md', variant = 'ghost', active = false, className = '', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={`icon-btn icon-btn-${size} icon-btn-${variant} ${active ? 'is-active' : ''} ${className}`}
      aria-label={label}
      title={label}
      {...props}
    >
      <Icon size={size === 'sm' ? 14 : 17} aria-hidden="true" />
    </button>
  );
});

export function Segmented({ options, value, onChange, label, size = 'md', stretch = false }) {
  return (
    <div className={`segmented segmented-${size} ${stretch ? 'is-stretch' : ''}`} role="radiogroup" aria-label={label}>
      {options.map(({ value: optionValue, label: optionLabel, icon: Icon, title }) => (
        <button
          key={optionValue}
          type="button"
          role="radio"
          aria-checked={value === optionValue}
          className={value === optionValue ? 'is-active' : ''}
          onClick={() => onChange(optionValue)}
          title={title}
        >
          {Icon && <Icon size={14} aria-hidden="true" />}
          {optionLabel && <span>{optionLabel}</span>}
        </button>
      ))}
    </div>
  );
}

export function Slider({ label, value, min, max, step, onChange, format = (v) => v }) {
  const id = useId();
  const percent = ((value - min) / (max - min)) * 100;
  return (
    <div className="slider">
      <div className="control-row">
        <label htmlFor={id} className="control-label">{label}</label>
        <span className="control-value tabular">{format(value)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ '--fill': `${percent}%` }}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

export function Toggle({ label, checked, onChange, hint }) {
  const id = useId();
  return (
    <div className="toggle-row">
      <label htmlFor={id} className="toggle-copy">
        <span className="control-label">{label}</span>
        {hint && <small>{hint}</small>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        className={`switch ${checked ? 'is-on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span />
      </button>
    </div>
  );
}

export function Field({ label, children, className = '' }) {
  return (
    <label className={`field ${className}`}>
      <span className="control-label">{label}</span>
      {children}
    </label>
  );
}

export function Group({ title, action, children }) {
  return (
    <section className="group">
      {(title || action) && (
        <header className="group-header">
          <h3>{title}</h3>
          {action}
        </header>
      )}
      <div className="group-body">{children}</div>
    </section>
  );
}
