import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Activity, Gavel, LayoutDashboard, RefreshCw, ShieldCheck, Trash2, Users, WalletCards, AlertTriangle, FileText, Gamepad2 } from 'lucide-react';
import './AdminDashboard.css';

const API_URL = 'http://localhost:8081/api/admin';
type UserRow = { id:number; username:string; email:string; walletBalance:number; role:string; kycStatus:string; level:number };
type AuctionRow = { id:number; title:string; description:string; startingPrice:number; currentPrice:number; endTime:string; active:boolean; creatorName:string; status?:string };
type BidRow = { id:number; auctionId:number; auctionTitle:string; bidderName:string; amount:number; bidTime:string };
type TransactionRow = { id:number; username:string; type:string; referenceId:number; amount:number; status:string; timestamp:string; description:string };
type GameEntryRow = {id:number;roundId:number;gameType:string;username:string;selection:string;outcome:string;amount:number;timestamp:string;result:string;resultNumber:number};
type WithdrawalRow = { id:number; username:string; amount:number; status:string; requestTime:string; payoutProviderRef?:string; adminNotes?:string };
type Stats = { totalUsers:number; totalItems:number; activeAuctions:number; totalBids:number; totalTransactions:number; totalGameRounds:number };
const money = (v:number) => new Intl.NumberFormat('en-IN',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(Number(v||0));
const stamp = (v:string) => v ? new Date(v).toLocaleString() : '—';

export const AdminDashboard = () => {
  const [users,setUsers] = useState<UserRow[]>([]);
  const [auctions,setAuctions] = useState<AuctionRow[]>([]);
  const [bids,setBids] = useState<BidRow[]>([]);
  const [transactions,setTransactions] = useState<TransactionRow[]>([]);
  const [gameEntries,setGameEntries] = useState<GameEntryRow[]>([]);
  const [withdrawals,setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [stats,setStats] = useState<Stats>({totalUsers:0,totalItems:0,activeAuctions:0,totalBids:0, totalTransactions:0, totalGameRounds:0});
  const [tab,setTab] = useState('overview');
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    const token = localStorage.getItem('token');
    const config = {headers:{Authorization:`Bearer ${token}`}};
    try {
      const [u,a,b,t,s,g,w] = await Promise.all([
        axios.get(`${API_URL}/users`,config), axios.get(`${API_URL}/auctions`,config),
        axios.get(`${API_URL}/bids`,config), axios.get(`${API_URL}/transactions`,config), 
        axios.get(`${API_URL}/stats`,config), axios.get(`${API_URL}/game-entries`,config),
        axios.get(`${API_URL}/withdrawals`,config)
      ]);
      setUsers(u.data); setAuctions(a.data); setBids(b.data); setTransactions(t.data); setStats(s.data); setGameEntries(g.data); setWithdrawals(w.data);
    } catch (e:any) {
      setError(e?.response?.status === 403 ? 'Your account does not have administrator permissions.' : 'Could not load live data. Confirm the backend is running on port 8081 and sign in again.');
    } finally { setLoading(false); }
  },[]);
  useEffect(()=>{void fetchData();},[fetchData]);
  useEffect(()=>{const timer=window.setInterval(()=>{void fetchData();},15000);return ()=>window.clearInterval(timer);},[fetchData]);

  const setAuctionActive = async (auction: AuctionRow, active: boolean) => {
    try {
      await axios.put(`${API_URL}/auctions/${auction.id}/active`, {active}, {headers:{Authorization:`Bearer ${localStorage.getItem('token')}`}});
      await fetchData();
    } catch (e:any) {
      setError(e?.response?.data?.message || 'Could not update auction status.');
    }
  };

  const updateUserRole = async (user: UserRow) => {
    const nextRole = user.role === 'ROLE_AUCTION_MAKER' ? 'USER' : 'AUCTION_MAKER';
    if (!window.confirm(`${nextRole === 'AUCTION_MAKER' ? 'Grant auction-maker access to' : 'Revoke auction-maker access from'} ${user.username}?`)) return;
    try {
      await axios.put(`${API_URL}/users/${user.id}/role`, {role:nextRole}, {headers:{Authorization:`Bearer ${localStorage.getItem('token')}`}});
      await fetchData();
    } catch (e:any) { setError(e?.response?.data?.message || 'Could not update this account role.'); }
  };

  const deleteUser = async (user:UserRow) => {
    if (!window.confirm(`Delete account "${user.username}"? This cannot be undone.`)) return;
    try {
      await axios.delete(`${API_URL}/users/${user.id}`,{headers:{Authorization:`Bearer ${localStorage.getItem('token')}`}});
      await fetchData();
    } catch { setError('User could not be deleted. Check account dependencies and permissions.'); }
  };

  const processKyc = async (user:UserRow, status:string) => {
    if (!window.confirm(`Mark KYC as ${status} for "${user.username}"?`)) return;
    try {
      await axios.put(`${API_URL}/users/${user.id}/kyc`, {status}, {headers:{Authorization:`Bearer ${localStorage.getItem('token')}`}});
      await fetchData();
    } catch(e:any) { setError(e?.response?.data?.message || 'Could not update KYC status.'); }
  };

  const processWithdrawal = async (wd:WithdrawalRow, approve:boolean) => {
    let providerRef = '', notes = '';
    if (approve) {
      providerRef = window.prompt(`Enter Provider Transaction ID to complete payout for $${wd.amount.toFixed(2)} to ${wd.username}:`) || '';
      if (!providerRef) return;
    } else {
      notes = window.prompt(`Reason for rejection for $${wd.amount.toFixed(2)} to ${wd.username}:`) || '';
      if (!notes) return;
    }
    try {
      await axios.put(`${API_URL}/withdrawals/${wd.id}/process`, {approve, providerRef, notes}, {headers:{Authorization:`Bearer ${localStorage.getItem('token')}`}});
      await fetchData();
    } catch(e:any) { setError(e?.response?.data?.message || 'Could not process withdrawal.'); }
  };

  const nav = [
    {id:'overview',label:'Overview',icon:LayoutDashboard},
    {id:'users',label:'User management',icon:Users},
    {id:'auctions',label:'Auctions & hosts',icon:Gavel},
    {id:'bids',label:'Bid activity',icon:Activity},
    {id:'transactions',label:'Transactions',icon:FileText},
    {id:'withdrawals',label:'Withdrawal requests',icon:WalletCards},
    {id:'games',label:'Games & results',icon:Gamepad2},
    {id:'security',label:'Security & audit',icon:ShieldCheck}
  ];
  return <div className="admin-dashboard">
    <aside className="admin-sidebar">
      <div className="admin-brand"><span className="admin-brand-mark"><Gavel size={22} color="white"/></span><span>BIDSPHERE<small>CONTROL CENTER</small></span></div>
      <div className="admin-side-label" style={{marginTop: '10px'}}>WORKSPACE</div>
      <nav className="admin-nav">{nav.map(n=>{const Icon=n.icon;return <button key={n.id} className={`nav-item ${tab===n.id?'active':''}`} onClick={()=>setTab(n.id)}><Icon size={18}/>{n.label}{n.id==='bids'&&<span className="nav-count">{stats.totalBids}</span>}{n.id==='transactions'&&<span className="nav-count">{stats.totalTransactions}</span>}</button>;})}</nav>
      <div className="admin-side-footer"><ShieldCheck size={18}/><span><b>Admin access</b><small>Role-protected workspace</small></span></div>
    </aside>
    <main className="admin-content">
      <header className="admin-topbar"><div><div className="admin-eyebrow">PLATFORM MANAGEMENT / {tab.toUpperCase()}</div><h1>{nav.find(n=>n.id===tab)?.label}</h1><p>Monitor auctions, accounts, and platform activity from one place. Data refreshes every 15 seconds.</p></div><button className="admin-refresh" onClick={()=>void fetchData()} disabled={loading}><RefreshCw size={16}/>{loading?'Refreshing…':'Refresh data'}</button></header>
      {error&&<div className="admin-alert"><AlertTriangle size={18}/>{error}</div>}
      {loading&&<div className="admin-loading">Loading platform data…</div>}
      {tab==='overview'&&<><div className="admin-stat-grid">
        <div className="admin-stat"><span className="admin-stat-icon blue"><Users size={20}/></span><span className="admin-stat-label">Registered accounts</span><strong>{stats.totalUsers}</strong><small>All platform users</small></div>
        <div className="admin-stat"><span className="admin-stat-icon purple"><Gavel size={20}/></span><span className="admin-stat-label">Total auctions</span><strong>{stats.totalItems}</strong><small>{stats.activeAuctions} currently active</small></div>
        <div className="admin-stat"><span className="admin-stat-icon green"><Activity size={20}/></span><span className="admin-stat-label">Recorded bids</span><strong>{stats.totalBids}</strong><small>Persisted bid history</small></div>
        <div className="admin-stat"><span className="admin-stat-icon amber"><WalletCards size={20}/></span><span className="admin-stat-label">Transactions</span><strong>{stats.totalTransactions}</strong><small>Game and bid settlements</small></div>
      </div>
      <div className="admin-panel"><div className="admin-panel-heading"><div><h2>Bid activity · Last 7 days</h2><p>Daily counts calculated from persisted bid records.</p></div><span className="admin-pill" style={{color:'black'}}>Actual bid history</span></div><BidActivityChart bids={bids}/></div>
      <div className="admin-panel"><div className="admin-panel-heading"><div><h2>Recent transactions</h2><p>Latest persisted ledger entries</p></div><button className="admin-text-button" onClick={()=>setTab('transactions')}>View all →</button></div><TransactionTable transactions={transactions.slice(0,6)}/></div>
      <div className="admin-panel"><div className="admin-panel-heading"><div><h2>Accounts</h2><p>Latest user records and access roles</p></div><button className="admin-text-button" onClick={()=>setTab('users')}>Manage users →</button></div><UsersTable users={users.slice(0,6)} onDelete={deleteUser} onRoleChange={updateUserRole} onKyc={processKyc}/></div></>}
      {tab==='users'&&<div className="admin-panel"><div className="admin-panel-heading"><div><h2>Account directory</h2><p>Review registered accounts and their assigned roles.</p></div><span className="admin-pill" style={{color:'black'}}>{users.length} accounts</span></div><UsersTable users={users} onDelete={deleteUser} onRoleChange={updateUserRole} onKyc={processKyc}/></div>}
      {tab==='auctions'&&<div className="admin-panel"><div className="admin-panel-heading"><div><h2>Auction inventory</h2><p>Listings created by auction hosts, prices, and closing times.</p></div><span className="admin-pill" style={{color:'black'}}>{auctions.length} listings</span></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Listing</th><th>Creator</th><th>Starting price</th><th>Current bid</th><th>Ends</th><th>Status</th><th>Admin action</th></tr></thead><tbody>{auctions.map(a=><tr key={a.id}><td><b>{a.title}</b><small className="table-sub">{a.description}</small></td><td>{a.creatorName || 'Unknown'}</td><td>{money(a.startingPrice)}</td><td><b style={{color:'var(--admin-accent-emerald)'}}>{money(a.currentPrice)}</b></td><td>{stamp(a.endTime)}</td><td><span className={`status-chip ${a.active?'is-active':'is-closed'}`}>{a.active?'Active':'Closed'}</span></td><td><button className="admin-action-button" onClick={()=>void setAuctionActive(a,!a.active)}>{a.active?'Close listing':'Reopen listing'}</button></td></tr>)}</tbody></table>{!auctions.length&&<Empty text="No auction listings found."/ >}</div></div>}
      {tab==='bids'&&<div className="admin-panel"><div className="admin-panel-heading"><div><h2>Bid history</h2><p>Each row is a recorded bid event.</p></div><span className="admin-pill" style={{color:'black'}}>{bids.length} events</span></div><ActivityTable bids={bids}/></div>}
      {tab==='transactions'&&<div className="admin-panel"><div className="admin-panel-heading"><div><h2>Context-aware transaction explorer</h2><p>Actual persisted ledger entries for auctions and games.</p></div><span className="admin-pill" style={{color:'black'}}>{transactions.length} records</span></div><TransactionTable transactions={transactions}/></div>}
      {tab==='withdrawals'&&<div className="admin-panel"><div className="admin-panel-heading"><div><h2>Withdrawal Requests</h2><p>Process pending payouts.</p></div><span className="admin-pill" style={{color:'black'}}>{withdrawals.length} requests</span></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>ID</th><th>User</th><th>Amount</th><th>Status</th><th>Request Date</th><th>Notes/Ref</th><th>Actions</th></tr></thead><tbody>{withdrawals.map(w=><tr key={w.id}><td>#{w.id}</td><td>{w.username}</td><td><b style={{color:'var(--admin-accent-cyan)'}}>{money(w.amount)}</b></td><td><span className={`status-chip ${w.status==='COMPLETED'?'is-active':w.status==='REJECTED'?'is-closed':'is-pending'}`}>{w.status}</span></td><td>{stamp(w.requestTime)}</td><td><small>{w.payoutProviderRef || w.adminNotes || '—'}</small></td><td>{w.status==='PENDING' && <div style={{display:'flex',gap:'5px'}}><button className="admin-action-button" onClick={()=>processWithdrawal(w,true)}>Approve</button><button className="admin-delete" style={{background:'#fee2e2',color:'#b91c1c',padding:'4px 8px',borderRadius:'4px',border:'none',cursor:'pointer',fontSize:'12px',fontWeight:600}} onClick={()=>processWithdrawal(w,false)}>Reject</button></div>}</td></tr>)}</tbody></table>{!withdrawals.length&&<Empty text="No withdrawal requests found."/>}</div></div>}
      {tab==='games'&&<div className="admin-panel"><div className="admin-panel-heading"><div><h2>Game entries & results</h2><p>Recorded Small & Big rounds and user entries. No synthetic chart data.</p></div><span className="admin-pill" style={{color:'black'}}>{gameEntries.length} entries</span></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Entry</th><th>Round</th><th>Game</th><th>User</th><th>Selection</th><th>Result</th><th>Outcome</th><th>Stake</th><th>Time</th></tr></thead><tbody>{gameEntries.map(e=><tr key={e.id}><td>#{e.id}</td><td>#{e.roundId}</td><td>{e.gameType}</td><td>{e.username}</td><td>{e.selection}</td><td>{e.resultNumber} · {e.result}</td><td><span className={`status-chip ${e.outcome==='WIN'?'is-active':e.outcome==='LOSE'?'is-closed':'is-pending'}`}>{e.outcome}</span></td><td>{money(e.amount)}</td><td>{stamp(e.timestamp)}</td></tr>)}</tbody></table>{!gameEntries.length&&<Empty text="No game entries have been recorded yet."/>}</div></div>}
      {tab==='security'&&<div className="admin-stat-grid" style={{gridTemplateColumns:'1fr 1fr'}}><div className="admin-panel"><ShieldCheck size={24} color="var(--admin-accent-emerald)"/><h2>Access controls</h2><p style={{marginTop:'10px'}}>Admin API routes require the ADMIN role and a JWT. Keep credentials private and use a unique production secret.</p><span className="status-chip is-active" style={{display:'inline-block',marginTop:'15px'}}>Role checks enabled</span></div><div className="admin-panel"><AlertTriangle size={24} color="#f59e0b"/><h2>Production checklist</h2><ul style={{marginTop:'10px',paddingLeft:'20px',color:'var(--admin-text-muted)'}}><li>Replace demo credentials before deployment.</li><li>Use HTTPS and a secret from environment variables.</li><li>Configure persistent PostgreSQL storage and backups.</li><li>Games in this package use demo credits only.</li></ul></div></div>}
    </main>
  </div>;
};

function BidActivityChart({bids}:{bids:BidRow[]}) {
  const today = new Date();
  const days = Array.from({length:7}, (_, index) => {
    const date = new Date(today); date.setHours(0,0,0,0); date.setDate(today.getDate() - (6-index));
    const next = new Date(date); next.setDate(date.getDate()+1);
    const count = bids.filter(b => { const t = new Date(b.bidTime).getTime(); return Number.isFinite(t) && t >= date.getTime() && t < next.getTime(); }).length;
    return {label:date.toLocaleDateString(undefined,{weekday:'short'}),count};
  });
  const max = Math.max(1, ...days.map(d=>d.count));
  return <div className="admin-activity-chart" role="img" aria-label="Bid counts over the last seven days">{days.map(d=><div className="admin-chart-day" key={d.label}><div className="admin-chart-track"><div className="admin-chart-bar" style={{height:`${Math.max(d.count ? 8 : 2, d.count/max*100)}%`}} title={`${d.count} bids`}/></div><b>{d.count}</b><small>{d.label}</small></div>)}</div>;
}

function Empty({text}:{text:string}) { return <div style={{padding:'20px',textAlign:'center',color:'var(--admin-text-muted)'}}>{text}</div>; }
function UsersTable({users,onDelete,onRoleChange,onKyc}:{users:UserRow[];onDelete:(u:UserRow)=>void;onRoleChange:(u:UserRow)=>void;onKyc:(u:UserRow,s:string)=>void}) {
 return <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Account</th><th>Role</th><th>Wallet balance</th><th>Verification</th><th>Access</th><th>Action</th></tr></thead><tbody>{users.map(u=><tr key={u.id}><td><b>{u.username}</b><small className="table-sub">{u.email}</small></td><td><span className="status-chip is-closed">{(u.role||'ROLE_USER').replace('ROLE_','')}</span></td><td>{money(u.walletBalance)}</td><td><span className={`status-chip ${u.kycStatus==='VERIFIED'?'is-active':'is-pending'}`} style={{cursor:'pointer'}} onClick={()=>onKyc(u, u.kycStatus==='VERIFIED'?'PENDING':'VERIFIED')} title="Click to toggle KYC status">{u.kycStatus||'PENDING'}</span></td><td>{u.role==='ROLE_ADMIN'?<span className="status-chip is-pending">Protected admin</span>:<button className="admin-action-button" onClick={()=>onRoleChange(u)}>{u.role==='ROLE_AUCTION_MAKER'?'Revoke host':'Make auction maker'}</button>}</td><td>{u.role==='ROLE_ADMIN'?<span className="table-sub">Protected</span>:<button className="admin-delete" onClick={()=>onDelete(u)} title="Delete account" aria-label={`Delete ${u.username}`}><Trash2 size={16}/></button>}</td></tr>)}</tbody></table>{!users.length&&<Empty text="No user accounts found."/>}</div>;
}
function ActivityTable({bids}:{bids:BidRow[]}) {
 return <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Auction</th><th>Bidder</th><th>Amount</th><th>Timestamp</th></tr></thead><tbody>{bids.map(b=><tr key={b.id}><td><b>{b.auctionTitle}</b><small className="table-sub">Auction #{b.auctionId}</small></td><td>{b.bidderName}</td><td><b style={{color:'var(--admin-accent-cyan)'}}>{money(b.amount)}</b></td><td>{stamp(b.bidTime)}</td></tr>)}</tbody></table>{!bids.length&&<Empty text="No bid events recorded yet."/ >}</div>;
}
function TransactionTable({transactions}:{transactions:TransactionRow[]}) {
  return <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>ID</th><th>User</th><th>Type</th><th>Ref ID</th><th>Amount</th><th>Status</th><th>Timestamp</th><th>Description</th></tr></thead><tbody>{transactions.map(t=><tr key={t.id}><td>TX-{t.id}</td><td>{t.username}</td><td><span className="status-chip is-closed" style={{color:'black'}}>{t.type}</span></td><td>{t.referenceId || 'N/A'}</td><td><b style={{color:t.amount>0?'var(--admin-accent-emerald)':'var(--admin-accent-cyan)'}}>{money(t.amount)}</b></td><td><span className={`status-chip ${t.status==='COMPLETED'?'is-active':t.status==='FAILED'?'admin-delete':'is-pending'}`}>{t.status}</span></td><td>{stamp(t.timestamp)}</td><td><small>{t.description}</small></td></tr>)}</tbody></table>{!transactions.length&&<Empty text="No transactions recorded yet."/ >}</div>;
}
