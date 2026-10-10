import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { UserRound, Phone, Mail, ShieldCheck, Landmark, Save, RefreshCw, BadgeCheck, AlertCircle, LockKeyhole } from 'lucide-react';
import { API_BASE_URL } from '../config';
import './UserProfile.css';

const API = API_BASE_URL;
type Profile = {
  username: string; email: string; phoneNumber?: string; fullName?: string;
  dateOfBirth?: string; postalAddress?: string; bankAccountName?: string;
  bankAccountLast4?: string; kycStatus?: string; role?: string;
  level?: number; xp?: number; walletBalance?: number;
};
const field = (value?: string) => value || '';

export const UserProfile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({fullName:'', email:'', phoneNumber:'', dateOfBirth:'', postalAddress:'', bankAccountName:'', bankAccountNumber:''});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadProfile = async () => {
    setLoading(true); setError('');
    try {
      const {data} = await axios.get(`${API}/auth/me`);
      setProfile(data);
      setForm({
        fullName: field(data.fullName), email: field(data.email), phoneNumber: field(data.phoneNumber),
        dateOfBirth: field(data.dateOfBirth), postalAddress: field(data.postalAddress),
        bankAccountName: field(data.bankAccountName), bankAccountNumber: ''
      });
    } catch (e:any) {
      setError(e.response?.data?.message || 'Unable to load your profile. Please sign in again.');
    } finally { setLoading(false); }
  };
  useEffect(() => { void loadProfile(); }, []);

  const update = (key: keyof typeof form, value: string) => setForm(prev => ({...prev, [key]:value}));
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setMessage(''); setError('');
    try {
      const payload: Record<string,string> = {
        fullName: form.fullName.trim(), email: form.email.trim(), phoneNumber: form.phoneNumber.trim(),
        dateOfBirth: form.dateOfBirth, postalAddress: form.postalAddress.trim(),
        bankAccountName: form.bankAccountName.trim()
      };
      if (form.bankAccountNumber.trim()) payload.bankAccountNumber = form.bankAccountNumber.trim();
      const {data} = await axios.put(`${API}/auth/me`, payload);
      setProfile(prev => ({...prev, ...data}));
      setForm(prev => ({...prev, bankAccountNumber:''}));
      setMessage('Profile saved. Verification details remain pending until reviewed by an administrator.');
    } catch (e:any) {
      setError(e.response?.data?.message || e.response?.data || 'Could not save profile changes.');
    } finally { setSaving(false); }
  };

  if (loading) return <main className="profile-page"><div className="profile-loading"><RefreshCw className="spin" /> Loading profile…</div></main>;
  if (!profile) return <main className="profile-page"><div className="profile-alert error"><AlertCircle/> {error}</div><button className="profile-btn secondary" onClick={() => void loadProfile()}>Try again</button></main>;

  const status = (profile.kycStatus || 'PENDING').toUpperCase();
  return <main className="profile-page">
    <header className="profile-heading">
      <div><p className="eyebrow">ACCOUNT SETTINGS</p><h1>Profile & verification</h1><p>Keep your contact information and payout details up to date.</p></div>
      <span className={`kyc-pill ${status.toLowerCase()}`}><ShieldCheck size={16}/>{status}</span>
    </header>
    {message && <div className="profile-alert success"><BadgeCheck size={18}/>{message}</div>}
    {error && <div className="profile-alert error"><AlertCircle size={18}/>{String(error)}</div>}
    <div className="profile-layout">
      <aside className="profile-summary">
        <div className="profile-avatar"><UserRound size={30}/></div>
        <h2>{profile.fullName || profile.username}</h2><p className="profile-handle">@{profile.username}</p>
        <div className="summary-line"><Mail size={16}/><span>{profile.email}</span></div>
        <div className="summary-line"><Phone size={16}/><span>{profile.phoneNumber || 'Phone not added'}</span></div>
        <div className="summary-divider"/>
        <div className="summary-meta"><span>Account level</span><strong>{profile.level || 1}</strong></div>
        <div className="summary-meta"><span>Experience points</span><strong>{profile.xp || 0} XP</strong></div>
        <div className="profile-note"><LockKeyhole size={16}/><span>Card numbers and security codes should only be entered in the secure payment provider form. This profile never stores card details.</span></div>
      </aside>
      <form className="profile-form-card" onSubmit={save}>
        <section className="profile-section">
          <div className="profile-section-title"><UserRound/><div><h3>Personal information</h3><p>Edit your name and contact details.</p></div></div>
          <div className="profile-fields">
            <label>Full name<input value={form.fullName} onChange={e=>update('fullName',e.target.value)} maxLength={120} placeholder="Your full name"/></label>
            <label>Username<input value={profile.username} disabled/><small>Username cannot be changed here.</small></label>
            <label>Email address<input type="email" required value={form.email} onChange={e=>update('email',e.target.value)} maxLength={180}/></label>
            <label>Phone number<input type="tel" value={form.phoneNumber} onChange={e=>update('phoneNumber',e.target.value)} maxLength={25} placeholder="+91…"/></label>
          </div>
        </section>
        <section className="profile-section">
          <div className="profile-section-title"><ShieldCheck/><div><h3>Identity verification</h3><p>Submit details for review. Saving does not automatically verify your identity.</p></div></div>
          <div className="profile-fields">
            <label>Date of birth<input type="date" value={form.dateOfBirth} onChange={e=>update('dateOfBirth',e.target.value)} max={new Date().toISOString().slice(0,10)}/></label>
            <label className="wide">Residential address<textarea value={form.postalAddress} onChange={e=>update('postalAddress',e.target.value)} maxLength={500} rows={3} placeholder="Address used for identity review"/></label>
          </div>
          <div className="verification-notice"><ShieldCheck size={18}/><span>Verification status: <strong>{status}</strong>. An administrator must review submitted details. Do not enter government ID numbers in this form.</span></div>
        </section>
        <section className="profile-section">
          <div className="profile-section-title"><Landmark/><div><h3>Payout account</h3><p>For a future approved payout workflow. Only the last four digits are retained.</p></div></div>
          <div className="profile-fields">
            <label>Account holder name<input value={form.bankAccountName} onChange={e=>update('bankAccountName',e.target.value)} maxLength={120} placeholder="Name on bank account"/></label>
            <label>Bank account number<input inputMode="numeric" autoComplete="off" value={form.bankAccountNumber} onChange={e=>update('bankAccountNumber',e.target.value.replace(/\D/g,'').slice(0,24))} placeholder={profile.bankAccountLast4 ? `Linked account •••• ${profile.bankAccountLast4}` : 'Enter account number'} maxLength={24}/><small>Full number is not saved; only its last four digits are retained.</small></label>
          </div>
        </section>
        <footer className="profile-actions"><span className="profile-muted">Changes are saved to your account.</span><button className="profile-btn" type="submit" disabled={saving}><Save size={17}/>{saving ? 'Saving…' : 'Save changes'}</button></footer>
      </form>
    </div>
  </main>;
};
