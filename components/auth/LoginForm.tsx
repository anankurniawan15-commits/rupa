'use client';
import Link from 'next/link';
import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService, LOCKED_MSG, MAX_ATTEMPTS } from '@/lib/services/auth.service';
import { loginSchema, fieldErrors } from '@/lib/validation';
import { toast } from '@/lib/store/toast';
import { Notice, ErrBox } from '@/components/ui/Boxes';
import { ErrorText, Input } from '@/components/ui/Field';
import { AuthLayout } from './AuthLayout';
import { PasswordInput } from './PasswordInput';
import { focusFirst, focusId, safeNext, useRedirectIfSignedIn } from './helpers';

export function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = safeNext(sp.get('next'));
  const note = sp.get('note') || authService.loginNote(next);
  const busyRef = useRedirectIfSignedIn();

  const [email, setEmail] = useState(() => sp.get('email') || '');
  const [pass, setPass] = useState('');
  const [caps, setCaps] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formErr, setFormErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    const c = !!e.getModifierState?.('CapsLock');
    if (c !== caps) setCaps(c);
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (attempts >= MAX_ATTEMPTS) { setFormErr(LOCKED_MSG); return; }
    const er = fieldErrors(loginSchema.safeParse({ email, pass }));
    if (Object.keys(er).length) {
      setErrors(er);
      setFormErr('');
      focusFirst('lg', er, ['email', 'pass']);
      return;
    }
    setErrors({});
    setFormErr('');
    setLoading(true);
    busyRef.current = true;
    const res = await authService.login(email.trim(), pass, attempts);
    if (!res.ok) {
      busyRef.current = false;
      setLoading(false);
      setAttempts(res.attempts);
      setPass('');
      setFormErr(res.error);
      focusId('lg-pass');
      return;
    }
    toast('Selamat datang, ' + res.account.name.split(' ')[0]);
    router.replace(next || (res.account.role === 'admin' ? '/admin' : '/'));
  }

  const forgotHref = '/lupa-sandi' + (email.trim() ? '?email=' + encodeURIComponent(email.trim()) : '');

  return (
    <AuthLayout art="login">
      <p className="eyebrow">Selamat datang kembali</p>
      <h1 className="h1">Masuk ke Rupa</h1>
      {note ? <Notice><span>{note}</span></Notice> : null}
      {formErr ? <ErrBox><span>{formErr}</span></ErrBox> : null}
      <form className="col gap-16" onSubmit={submit} noValidate>
        <div className="field">
          <label className="lbl" htmlFor="lg-email">Email</label>
          <Input
            id="lg-email"
            type="email"
            invalid={!!errors.email}
            value={email}
            onChange={(e) => { setEmail(e.target.value); setErrors((x) => ({ ...x, email: '' })); setFormErr(''); }}
            autoComplete="email"
            placeholder="nama@email.com"
          />
          <ErrorText id="lg-email-err">{errors.email}</ErrorText>
        </div>
        <div className="field">
          <div className="row between center">
            <label className="lbl" htmlFor="lg-pass">Kata sandi</label>
            <Link href={forgotHref} className="linkbtn auth-link">Lupa kata sandi?</Link>
          </div>
          <PasswordInput
            id="lg-pass"
            value={pass}
            onValue={(v) => { setPass(v); setErrors((x) => ({ ...x, pass: '' })); }}
            onKeyUp={onKey}
            onKeyDown={onKey}
            invalid={!!errors.pass}
            autoComplete="current-password"
            placeholder="Minimal 8 karakter"
            aria-describedby={errors.pass ? 'lg-pass-err' : undefined}
          />
          {caps ? <p className="help" style={{ color: '#6B4600' }}>Caps Lock sedang aktif.</p> : null}
          <ErrorText id="lg-pass-err">{errors.pass}</ErrorText>
        </div>
        <label className="check">
          <input type="checkbox" checked={remember} onChange={() => setRemember((r) => !r)} />
          Ingat saya di perangkat ini
        </label>
        <button className="btn btn-primary btn-lg w100" type="submit" disabled={loading}>
          {loading ? 'Memeriksa…' : 'Masuk'}
        </button>
      </form>
      <p className="muted center-t">
        Belum punya akun? <Link href="/daftar" className="linkbtn auth-link">Daftar sekarang</Link>
      </p>
    </AuthLayout>
  );
}
