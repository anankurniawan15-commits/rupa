'use client';
import { useState, type FormEvent } from 'react';
import { ErrorText } from '@/components/ui/Field';
import { toast } from '@/lib/store/toast';
import { cx, initialsOf } from '@/lib/format';
import { fieldErrors, profileSchema } from '@/lib/validation';
import { profileService, useProfile } from '@/lib/services/profile.service';

type F = 'name' | 'email' | 'phone' | 'city' | 'bio';

export function ProfileForm() {
  const profile = useProfile();
  const [v, setV] = useState({ name: profile.name, email: profile.email, phone: profile.phone, city: profile.city, bio: profile.bio });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const on = (f: F) => (e: { target: { value: string } }) => { setV((x) => ({ ...x, [f]: e.target.value })); setErrors((x) => ({ ...x, [f]: '' })); };
  const save = (e: FormEvent) => {
    e.preventDefault();
    const er = fieldErrors(profileSchema.safeParse(v));
    if (Object.keys(er).length) { setErrors(er); return; }
    void profileService.save(v);
    toast('Profil disimpan');
  };
  return (
    <form className="col gap-24" onSubmit={save} noValidate>
      <div className="row gap-16 center">
        <span className="av av-l" style={{ width: 64, height: 64, fontSize: 20 }} aria-hidden="true">{initialsOf(v.name || profile.name)}</span>
        <div className="col"><b>{v.name}</b><span className="fine">Pembeli sejak 2024 · Penjual sejak Maret 2025</span></div>
      </div>
      <div className="form-grid">
        <div className="field">
          <label className="lbl" htmlFor="pf-name">Nama</label>
          <input id="pf-name" className={cx('input', !!errors.name && 'has-err')} aria-invalid={!!errors.name || undefined} value={v.name} onChange={on('name')} />
          <ErrorText>{errors.name}</ErrorText>
        </div>
        <div className="field">
          <label className="lbl" htmlFor="pf-email">Email</label>
          <input id="pf-email" type="email" className={cx('input', !!errors.email && 'has-err')} aria-invalid={!!errors.email || undefined} value={v.email} onChange={on('email')} />
          <ErrorText>{errors.email}</ErrorText>
        </div>
        <div className="field"><label className="lbl" htmlFor="pf-phone">Nomor HP</label><input id="pf-phone" type="tel" className="input" value={v.phone} onChange={on('phone')} /></div>
        <div className="field"><label className="lbl" htmlFor="pf-city">Kota</label><input id="pf-city" className="input" value={v.city} onChange={on('city')} /></div>
        <div className="field span2"><label className="lbl" htmlFor="pf-bio">Bio singkat <span className="opt">(tampil di profil penjual)</span></label><textarea id="pf-bio" className="input" value={v.bio} onChange={on('bio')} /></div>
      </div>
      <div><button className="btn btn-primary" type="submit">Simpan perubahan</button></div>
    </form>
  );
}
