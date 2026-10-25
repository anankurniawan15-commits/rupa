'use client';
import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService, maskEmail, OTP_HINT_CODE } from '@/lib/services/auth.service';
import { resetEmailSchema, resetPasswordSchema, fieldErrors } from '@/lib/validation';
import { toast } from '@/lib/store/toast';
import { ErrorText, Input } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { AuthLayout } from './AuthLayout';
import { PasswordInput } from './PasswordInput';
import { PasswordStrength } from './PasswordStrength';
import { OtpInput } from './OtpInput';
import { ResendTimer } from './ResendTimer';
import { focusFirst, focusId, toTop } from './helpers';

export function ForgotPasswordForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [email, setEmail] = useState(() => sp.get('email') || '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpErr, setOtpErr] = useState('');
  const [tries, setTries] = useState(0);
  const [sent, setSent] = useState(0);
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');

  const toLogin = () => router.push('/masuk' + (email.trim() ? '?email=' + encodeURIComponent(email.trim()) : ''));

  const back = () => {
    if (step === 1 || step === 4) { toLogin(); return; }
    setStep((s) => (s - 1) as 1 | 2 | 3);
    setErrors({});
    setOtpErr('');
  };

  async function submitEmail(e: FormEvent) {
    e.preventDefault();
    const er = fieldErrors(resetEmailSchema.safeParse({ email }));
    if (er.email) { setErrors(er); focusId('fp-email'); return; }
    setErrors({});
    setLoading(true);
    await authService.requestReset(email.trim());
    setLoading(false);
    setStep(2);
    setOtp('');
    setOtpErr('');
    setTries(0);
    setSent((n) => n + 1);
    focusId('fp-otp');
  }

  function verify(e: FormEvent) {
    e.preventDefault();
    // Email tak terdaftar gagal seperti kode salah — tidak membocorkan keberadaan akun.
    const r = authService.checkOtp(otp, tries, email.trim());
    if (!r.ok) {
      if (r.tries !== tries) setOtp('');
      setTries(r.tries);
      setOtpErr(r.error);
      return;
    }
    setOtpErr('');
    setPass('');
    setPass2('');
    setStep(3);
    focusId('fp-pass');
  }

  function resend() {
    setSent((n) => n + 1);
    setTries(0);
    setOtp('');
    setOtpErr('');
    toast('Kode baru dikirim ke ' + maskEmail(email.trim()) + ' (simulasi)', { kind: 'info' });
  }

  async function submitPass(e: FormEvent) {
    e.preventDefault();
    const er = fieldErrors(resetPasswordSchema.safeParse({ pass, pass2 }));
    if (!er.pass && authService.isSamePassword(email, pass)) er.pass = 'Kata sandi baru harus berbeda dari kata sandi lama.';
    if (Object.keys(er).length) { setErrors(er); focusFirst('fp', er, ['pass', 'pass2']); return; }
    setErrors({});
    setLoading(true);
    await authService.resetPassword(email.trim(), pass);
    setLoading(false);
    setPass('');
    setPass2('');
    setStep(4);
    toTop();
  }

  return (
    <AuthLayout art="forgot">
      <button type="button" className="linkbtn auth-link" style={{ alignSelf: 'flex-start' }} onClick={back}>
        {'← ' + (step === 1 || step === 4 ? 'Kembali ke halaman masuk' : 'Kembali')}
      </button>

      {step === 1 ? (
        <div className="col gap-16">
          <h1 className="h1">Lupa kata sandi</h1>
          <p className="muted">Masukkan email akunmu. Kami akan mengirim kode untuk membuat kata sandi baru.</p>
          <form className="col gap-16" onSubmit={submitEmail} noValidate>
            <div className="field">
              <label className="lbl" htmlFor="fp-email">Email</label>
              <Input
                id="fp-email"
                type="email"
                invalid={!!errors.email}
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors((x) => ({ ...x, email: '' })); }}
                autoComplete="email"
                placeholder="nama@email.com"
              />
              <ErrorText id="fp-email-err">{errors.email}</ErrorText>
            </div>
            <button className="btn btn-primary btn-lg w100" type="submit" disabled={loading}>
              {loading ? 'Mengirim…' : 'Kirim kode'}
            </button>
          </form>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="col gap-16">
          <h1 className="h1">Cek email kamu</h1>
          <p className="muted">
            Jika <b>{maskEmail(email.trim())}</b> terdaftar, kode 6 digit sudah kami kirim. Kode berlaku 10 menit.
          </p>
          <form className="col gap-16" onSubmit={verify} noValidate>
            <div className="field">
              <label className="lbl" htmlFor="fp-otp">Kode verifikasi</label>
              <OtpInput
                id="fp-otp"
                value={otp}
                onValue={(x) => { setOtp(x); setOtpErr(''); }}
                invalid={!!otpErr}
                describedBy={(otpErr ? 'fp-otp-err ' : '') + 'fp-otp-help'}
              />
              <ErrorText id="fp-otp-err">{otpErr}</ErrorText>
              <p className="help" id="fp-otp-help">Prototipe: gunakan kode <b>{OTP_HINT_CODE}</b>.</p>
            </div>
            <button className="btn btn-primary btn-lg w100" type="submit">Verifikasi kode</button>
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
          <h1 className="h1">Buat kata sandi baru</h1>
          <form className="col gap-16" onSubmit={submitPass} noValidate>
            <div className="field">
              <label className="lbl" htmlFor="fp-pass">Kata sandi baru</label>
              <PasswordInput
                id="fp-pass"
                value={pass}
                onValue={(x) => { setPass(x); setErrors((y) => ({ ...y, pass: '' })); }}
                invalid={!!errors.pass}
                autoComplete="new-password"
                aria-describedby={'fp-pass-rules' + (errors.pass ? ' fp-pass-err' : '')}
              />
              <PasswordStrength value={pass} rulesId="fp-pass-rules" />
              <ErrorText id="fp-pass-err">{errors.pass}</ErrorText>
            </div>
            <div className="field">
              <label className="lbl" htmlFor="fp-pass2">Ulangi kata sandi baru</label>
              <PasswordInput
                id="fp-pass2"
                value={pass2}
                onValue={(x) => { setPass2(x); setErrors((y) => ({ ...y, pass2: '' })); }}
                invalid={!!errors.pass2}
                autoComplete="new-password"
                aria-describedby={errors.pass2 ? 'fp-pass2-err' : undefined}
              />
              <ErrorText id="fp-pass2-err">{errors.pass2}</ErrorText>
            </div>
            <button className="btn btn-primary btn-lg w100" type="submit" disabled={loading}>
              {loading ? 'Menyimpan…' : 'Simpan kata sandi baru'}
            </button>
          </form>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="col gap-16">
          <span className="succ-ic" style={{ width: 64, height: 64 }}>
            <Icon name="check" size="l" />
          </span>
          <h1 className="h1">Kata sandi diperbarui</h1>
          <p className="muted">Demi keamanan, semua sesi di perangkat lain sudah dikeluarkan. Silakan masuk dengan kata sandi baru.</p>
          <button type="button" className="btn btn-primary btn-lg w100" onClick={toLogin}>Masuk sekarang</button>
        </div>
      ) : null}
    </AuthLayout>
  );
}
