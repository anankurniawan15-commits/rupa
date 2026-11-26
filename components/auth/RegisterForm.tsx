'use client';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { authService, EMAIL_TAKEN_MSG, maskEmail, OTP_HINT_CODE } from '@/lib/services/auth.service';
import { registerSchema, fieldErrors } from '@/lib/validation';
import { toast } from '@/lib/store/toast';
import { ErrorText, Input } from '@/components/ui/Field';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { AuthLayout } from './AuthLayout';
import { PasswordInput } from './PasswordInput';
import { PasswordStrength } from './PasswordStrength';
import { OtpInput } from './OtpInput';
import { ResendTimer } from './ResendTimer';
import { focusFirst, focusId, toTop, useRedirectIfSignedIn } from './helpers';

type Field = 'name' | 'email' | 'phone' | 'pass' | 'pass2';
const init = { name: '', email: '', phone: '', pass: '', pass2: '' };

export function RegisterForm() {
  const busyRef = useRedirectIfSignedIn();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [v, setV] = useState(init);
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpErr, setOtpErr] = useState('');
  const [tries, setTries] = useState(0);
  const [sent, setSent] = useState(0);

  const set = (f: Field, val: string) => {
    setV((x) => ({ ...x, [f]: val }));
    setErrors((x) => ({ ...x, [f]: '' }));
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    const er = fieldErrors(registerSchema.safeParse({ ...v, agree }));
    if (!er.email && authService.isEmailTaken(v.email)) er.email = EMAIL_TAKEN_MSG;
    if (Object.keys(er).length) {
      setErrors(er);
      focusFirst('rg', er, ['name', 'email', 'phone', 'pass', 'pass2']);
      return;
    }
    setErrors({});
    setLoading(true);
    const res = await authService.register({ name: v.name, email: v.email, phone: v.phone, pass: v.pass });
    setLoading(false);
    if (!res.ok) {
      setErrors({ [res.field]: res.error });
      focusId('rg-' + res.field);
      return;
    }
    setStep(2);
    setOtp('');
    setOtpErr('');
    setTries(0);
    setSent((n) => n + 1);
    focusId('rg-otp');
    toast('Kode verifikasi dikirim ke ' + maskEmail(v.email.trim()) + ' (simulasi)', { kind: 'info' });
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    const r = authService.checkOtp(otp, tries);
    if (!r.ok) {
      setTries(r.tries);
      if (r.tries !== tries) setOtp('');
      setOtpErr(r.error);
      return;
    }
    setOtpErr('');
    setLoading(true);
    busyRef.current = true;
    await authService.verifySignupOtp({ name: v.name, email: v.email, phone: v.phone, pass: v.pass });
    setLoading(false);
    setV((x) => ({ ...x, pass: '', pass2: '' }));
    setStep(3);
    toTop();
  }

  function resend() {
    setSent((n) => n + 1);
    setTries(0);
    setOtp('');
    setOtpErr('');
    toast('Kode baru dikirim ke ' + maskEmail(v.email.trim()) + ' (simulasi)', { kind: 'info' });
  }

  const firstName = v.name.trim().split(' ')[0] || 'teman';

  return (
    <AuthLayout art="register">
      {step === 1 ? (
        <div className="col gap-16">
          <p className="eyebrow">Langkah 1 dari 2</p>
          <h1 className="h1">Buat akun Rupa</h1>
          <p className="muted">Satu akun untuk belanja dan berjualan. Kamu bisa membuka toko kapan saja.</p>
          <form className="col gap-16" onSubmit={submit} noValidate>
            <div className="field">
              <label className="lbl" htmlFor="rg-name">Nama lengkap</label>
              <Input id="rg-name" invalid={!!errors.name} value={v.name} onChange={(e) => set('name', e.target.value)} autoComplete="name" />
              <ErrorText id="rg-name-err">{errors.name}</ErrorText>
            </div>
            <div className="field">
              <label className="lbl" htmlFor="rg-email">Email</label>
              <Input id="rg-email" type="email" invalid={!!errors.email} value={v.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" placeholder="nama@email.com" />
              <ErrorText id="rg-email-err">{errors.email}</ErrorText>
            </div>
            <div className="field">
              <label className="lbl" htmlFor="rg-phone">Nomor HP</label>
              <Input id="rg-phone" type="tel" inputMode="tel" invalid={!!errors.phone} value={v.phone} onChange={(e) => set('phone', e.target.value)} autoComplete="tel" placeholder="0812 3456 7890" />
              <ErrorText id="rg-phone-err">{errors.phone}</ErrorText>
            </div>
            <div className="field">
              <label className="lbl" htmlFor="rg-pass">Kata sandi</label>
              <PasswordInput
                id="rg-pass"
                value={v.pass}
                onValue={(x) => set('pass', x)}
                invalid={!!errors.pass}
                autoComplete="new-password"
                aria-describedby={'rg-pass-rules' + (errors.pass ? ' rg-pass-err' : '')}
              />
              <PasswordStrength value={v.pass} rulesId="rg-pass-rules" />
              <ErrorText id="rg-pass-err">{errors.pass}</ErrorText>
            </div>
            <div className="field">
              <label className="lbl" htmlFor="rg-pass2">Ulangi kata sandi</label>
              <PasswordInput
                id="rg-pass2"
                value={v.pass2}
                onValue={(x) => set('pass2', x)}
                invalid={!!errors.pass2}
                autoComplete="new-password"
                aria-describedby={errors.pass2 ? 'rg-pass2-err' : undefined}
              />
              <ErrorText id="rg-pass2-err">{errors.pass2}</ErrorText>
            </div>
            <label className="check" style={{ alignItems: 'flex-start' }}>
              <input
                type="checkbox"
                checked={agree}
                onChange={() => { setAgree((a) => !a); setErrors((x) => ({ ...x, agree: '' })); }}
                style={{ marginTop: 3 }}
              />
              <span>Saya menyetujui Syarat Layanan dan Kebijakan Privasi Rupa.</span>
            </label>
            <ErrorText>{errors.agree}</ErrorText>
            <button className="btn btn-primary btn-lg w100" type="submit" disabled={loading}>
              {loading ? 'Mengirim kode…' : 'Daftar'}
            </button>
          </form>
          <p className="muted center-t">
            Sudah punya akun? <Link href="/masuk" className="linkbtn auth-link">Masuk</Link>
          </p>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="col gap-16">
          <p className="eyebrow">Langkah 2 dari 2</p>
          <h1 className="h1">Verifikasi email</h1>
          <p className="muted">
            Kami mengirim kode 6 digit ke <b>{maskEmail(v.email.trim())}</b>. Kode berlaku 10 menit.
          </p>
          <form className="col gap-16" onSubmit={verify} noValidate>
            <div className="field">
              <label className="lbl" htmlFor="rg-otp">Kode verifikasi</label>
              <OtpInput
                id="rg-otp"
                value={otp}
                onValue={(x) => { setOtp(x); setOtpErr(''); }}
                invalid={!!otpErr}
                describedBy={(otpErr ? 'rg-otp-err ' : '') + 'rg-otp-help'}
              />
              <ErrorText id="rg-otp-err">{otpErr}</ErrorText>
              <p className="help" id="rg-otp-help">Prototipe: gunakan kode <b>{OTP_HINT_CODE}</b>.</p>
            </div>
            <button className="btn btn-primary btn-lg w100" type="submit" disabled={loading}>
              {loading ? 'Memverifikasi…' : 'Verifikasi dan buat akun'}
            </button>
          </form>
          <div className="row between center wrapf gap-8">
            <ResendTimer key={sent} onResend={resend} />
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setStep(1); setOtp(''); setOtpErr(''); }}>
              Ganti email
            </button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="col gap-16">
          <span className="succ-ic" style={{ width: 64, height: 64 }}>
            <Icon name="check" size="l" />
          </span>
          <h1 className="h1">Akun berhasil dibuat</h1>
          <p className="muted">Halo, {firstName}. Kamu sudah masuk. Mau mulai dari mana?</p>
          <ButtonLink href="/" size="lg" block>Mulai belanja</ButtonLink>
          <ButtonLink href="/buka-toko" variant="secondary" size="lg" block>Buka toko dan mulai jualan</ButtonLink>
        </div>
      ) : null}
    </AuthLayout>
  );
}
