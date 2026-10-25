import { pwRules } from '@/lib/validation';

/** Meter kekuatan 4 segmen (`.pw-meter`) + daftar syarat (`.pw-rules`), seperti prototipe. */
export function PasswordStrength({ value, rulesId }: { value: string; rulesId?: string }) {
  const s = pwRules(value);
  return (
    <>
      <div className="pw-meter" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <i key={i} className={i < s.level ? 'on lv' + s.level : ''} />
        ))}
      </div>
      <p className="help" aria-live="polite">
        Kekuatan: <b>{s.label}</b>
      </p>
      <ul className="pw-rules" id={rulesId}>
        {s.rules.map((r) => (
          <li key={r.text} className={r.ok ? 'ok' : ''}>
            {(r.ok ? '✓' : '○') + ' ' + r.text}
          </li>
        ))}
      </ul>
    </>
  );
}
