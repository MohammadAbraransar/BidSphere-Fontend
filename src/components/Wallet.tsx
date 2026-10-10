import React, { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import axios from 'axios';
import { Wallet as WalletIcon, ArrowDownToLine, ArrowUpFromLine, History, X, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../config';
import './Wallet.css';

const API = API_BASE_URL;
const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
const stripePromise = publishableKey && publishableKey.startsWith('pk_') ? loadStripe(publishableKey) : null;
type Tx = {id:number;type:string;amount:number;status:string;timestamp:string;description?:string};

const DepositForm = ({onSuccess}:{onSuccess:()=>void}) => {
  const stripe=useStripe(); const elements=useElements();
  const [amount,setAmount]=useState('10'); const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
  const submit=async(e:React.FormEvent)=>{
    e.preventDefault(); setError('');
    const value=Number(amount);
    if(!Number.isFinite(value)||value<1||value>10000){setError('Enter an amount between $1 and $10,000.');return;}
    if(!stripe||!elements){setError('Payment provider is not configured. Ask the administrator to configure Stripe.');return;}
    setBusy(true);
    try{
      const {data}=await axios.post(`${API}/payments/create-intent`,{amount:value,currency:'usd'});
      const card=elements.getElement(CardElement);
      if(!card) throw new Error('Secure card form is unavailable.');
      const result=await stripe.confirmCardPayment(data.clientSecret,{payment_method:{card}});
      if(result.error) throw new Error(result.error.message||'Payment failed.');
      if(result.paymentIntent?.status!=='succeeded') throw new Error('Payment is not yet confirmed.');
      await axios.post(`${API}/payments/confirm/${result.paymentIntent.id}`);
      onSuccess();
    }catch(e:any){setError(e.response?.data?.message||e.response?.data?.error||e.message||'Deposit failed.');}
    finally{setBusy(false);}
  };
  return <form onSubmit={submit} className="wallet-form">
    <h3>Deposit funds</h3><p className="wallet-muted">Payments are processed by Stripe. Card data is not stored by this app.</p>
    <label className="wallet-label">Amount (USD)<input type="number" min="1" max="10000" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} required/></label>
    <div className="card-element-container"><CardElement options={{style:{base:{fontSize:'15px',color:'#172033','::placeholder':{color:'#98a2b3'}}}}}/></div>
    {error&&<div className="wallet-error"><AlertCircle size={16}/>{error}</div>}
    <button className="wallet-primary" type="submit" disabled={!stripe||busy}>{busy?'Processing…':`Pay $${Number(amount||0).toFixed(2)}`}</button>
  </form>;
};

export const Wallet = () => {
  const [open,setOpen]=useState(false); const [tab,setTab]=useState<'overview'|'deposit'|'withdraw'|'history'>('overview');
  const [profile,setProfile]=useState<any>(null); const [transactions,setTransactions]=useState<Tx[]>([]);
  const [amount,setAmount]=useState('20'); const [busy,setBusy]=useState(false); const [message,setMessage]=useState(''); const [error,setError]=useState('');
  const money=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n||0));
  const load=async()=>{try{const [p,t]=await Promise.all([axios.get(`${API}/auth/me`),axios.get(`${API}/transactions/my`)]);setProfile(p.data);setTransactions(t.data.filter((x:Tx)=>['DEPOSIT','WITHDRAWAL','REFUND','SETTLEMENT'].includes(x.type)));}catch(e:any){setError(e.response?.data?.message||'Could not load wallet data.');}};
  useEffect(()=>{if(open)void load();},[open]);
  const withdraw=async(e:React.FormEvent)=>{e.preventDefault();setError('');setMessage('');const value=Number(amount);if(!Number.isFinite(value)||value<50){setError('The minimum withdrawal request is $50.00.');return;}setBusy(true);try{const {data}=await axios.post(`${API}/withdrawals/request`,{amount:value});setMessage(data.message||'Request submitted.');await load();setTab('history');}catch(e:any){setError(e.response?.data?.message||e.response?.data?.error||'Withdrawal request failed.');}finally{setBusy(false);}};
  return <div className="wallet-container">
    <button className="wallet-toggle-btn" onClick={()=>{setOpen(true);setTab('overview');setError('');setMessage('');}}><WalletIcon size={15}/> Wallet</button>
    {open&&<div className="wallet-modal-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false);}}>
      <section className="wallet-modal-content" role="dialog" aria-modal="true" aria-label="Wallet">
        <button className="wallet-close" onClick={()=>setOpen(false)} aria-label="Close wallet"><X size={19}/></button>
        <p className="wallet-eyebrow">ACCOUNT FINANCE</p><h2>Wallet</h2>
        <div className="wallet-balance"><span>Available balance</span><strong>{profile?money(profile.walletBalance):'Loading…'}</strong><small>Balance is sourced from your account ledger.</small></div>
        <div className="wallet-tabs">
          <button className={tab==='overview'?'active':''} onClick={()=>setTab('overview')}>Overview</button>
          <button className={tab==='deposit'?'active':''} onClick={()=>setTab('deposit')}>Deposit</button>
          <button className={tab==='withdraw'?'active':''} onClick={()=>setTab('withdraw')}>Withdraw</button>
          <button className={tab==='history'?'active':''} onClick={()=>setTab('history')}>History</button>
        </div>
        {error&&<div className="wallet-error"><AlertCircle size={16}/>{error}</div>}
        {message&&<div className="wallet-success">{message}</div>}
        {tab==='overview'&&<div className="wallet-overview"><div><ArrowDownToLine/><strong>Deposit</strong><span>Add funds using the configured payment provider.</span><button onClick={()=>setTab('deposit')}>Deposit funds</button></div><div><ArrowUpFromLine/><strong>Withdraw</strong><span>Requests require verified identity and a linked payout account.</span><button onClick={()=>setTab('withdraw')}>Request withdrawal</button></div></div>}
        {tab==='deposit'&&(!stripePromise?<div className="wallet-config"><AlertCircle/><strong>Payments are not configured</strong><p>Set <code>VITE_STRIPE_PUBLISHABLE_KEY</code> to a valid Stripe test or live publishable key, and configure the matching secret key on the backend. No card payment will be simulated.</p></div>:<Elements stripe={stripePromise}><DepositForm onSuccess={()=>{setMessage('Deposit confirmed.');setTab('overview');void load();}}/></Elements>)}
        {tab==='withdraw'&&<form className="wallet-form" onSubmit={withdraw}><h3>Request a withdrawal</h3><p className="wallet-muted">Minimum request: $50.00. Requests remain pending until an administrator reviews them; submitting a request does not mean a payout has been sent.</p><label className="wallet-label">Amount (USD)<input type="number" min="50" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} required/></label><button className="wallet-primary" disabled={busy}>{busy?'Submitting…':'Submit withdrawal request'}</button></form>}
        {tab==='history'&&<div className="wallet-history"><h3><History size={17}/> Recent wallet transactions</h3>{transactions.length===0?<p className="wallet-muted">No wallet transactions recorded yet.</p>:transactions.map(t=><div className="wallet-tx" key={t.id}><div><strong>{t.type.replaceAll('_',' ')}</strong><small>{new Date(t.timestamp).toLocaleString()}</small><small>{t.description||''}</small></div><div className="wallet-tx-right"><strong>{money(t.amount)}</strong><span className={`tx-status ${t.status.toLowerCase()}`}>{t.status}</span></div></div>)}</div>}
        <p className="wallet-footnote">Never share your password or one-time codes. Card details are handled only by the payment provider.</p>
      </section>
    </div>}
  </div>;
};
