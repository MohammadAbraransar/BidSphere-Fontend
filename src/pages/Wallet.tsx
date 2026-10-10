import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Landmark, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { API_BASE_URL } from '../config';
import './Wallet.css';

const API = API_BASE_URL;

type Transaction = {
  id: number; amount: number; type: string; status: string;
  description: string; timestamp: string;
};

type Withdrawal = {
  id: number; amount: number; status: string; requestTime: string;
};

export const Wallet = () => {
  const [balance, setBalance] = useState(0);
  const [kycStatus, setKycStatus] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [profileRes, txRes, wdRes] = await Promise.all([
        axios.get(`${API}/auth/me`),
        axios.get(`${API}/transactions/my`),
        axios.get(`${API}/withdrawals/my`)
      ]);
      setBalance(profileRes.data.walletBalance);
      setKycStatus(profileRes.data.kycStatus);
      setTransactions(txRes.data);
      setWithdrawals(wdRes.data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, []);

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(''); setError('');
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt < 50) {
      setError('Minimum withdrawal is $50.00'); return;
    }
    if (kycStatus !== 'VERIFIED') {
      setError('Your KYC status must be VERIFIED to request a withdrawal.'); return;
    }
    try {
      await axios.post(`${API}/withdrawals/request`, { amount: amt });
      setMessage(`Withdrawal request for $${amt.toFixed(2)} submitted.`);
      setWithdrawAmount('');
      await loadData();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Could not process withdrawal request.');
    }
  };

  if (loading) return <main className="wallet-page"><div className="loading"><RefreshCw className="spin"/> Loading wallet...</div></main>;

  return (
    <main className="wallet-page">
      <header className="wallet-header">
        <div>
          <p className="eyebrow">MY WALLET</p>
          <h1>Wallet & Ledger</h1>
          <p>Manage your virtual credits and track transactions.</p>
        </div>
        <div className="balance-card">
          <p>Available Balance</p>
          <h2>${balance.toFixed(2)}</h2>
        </div>
      </header>
      
      {message && <div className="wallet-alert success"><CheckCircle2/> {message}</div>}
      {error && <div className="wallet-alert error"><AlertCircle/> {error}</div>}

      <div className="wallet-layout">
        <aside className="wallet-actions">
          <section className="wallet-card">
            <h3><Landmark/> Request Withdrawal</h3>
            <p className="muted">Withdrawal requests require administrator review. Minimum $50.00.</p>
            <form onSubmit={handleWithdrawal} className="withdrawal-form">
              <input type="number" min="50" step="0.01" placeholder="Amount to withdraw" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} required />
              <button type="submit" className="wallet-btn" disabled={kycStatus !== 'VERIFIED'}>Request Payout</button>
            </form>
            {kycStatus !== 'VERIFIED' && <div className="wallet-note">
              <AlertCircle size={14}/> KYC is {kycStatus}. Verification required.
            </div>}
          </section>

          {withdrawals.length > 0 && (
            <section className="wallet-card">
              <h3>Recent Withdrawals</h3>
              <ul className="withdrawal-list">
                {withdrawals.slice(0, 5).map(w => (
                  <li key={w.id} className={`wd-status-${w.status.toLowerCase()}`}>
                    <div className="wd-info">
                      <strong>${w.amount.toFixed(2)}</strong>
                      <span>{new Date(w.requestTime).toLocaleDateString()}</span>
                    </div>
                    <span className="wd-badge">{w.status}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>

        <section className="wallet-card transaction-ledger">
          <h3>Transaction History</h3>
          {transactions.length === 0 ? (
            <div className="empty-state">No transactions found.</div>
          ) : (
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.id}>
                    <td>
                      {tx.amount >= 0 ? <ArrowDownLeft className="tx-in" size={16}/> : <ArrowUpRight className="tx-out" size={16}/>}
                      {tx.type}
                    </td>
                    <td className={tx.amount >= 0 ? 'text-green' : 'text-red'}>
                      {tx.amount >= 0 ? '+' : ''}{tx.amount.toFixed(2)}
                    </td>
                    <td>
                      {tx.status === 'COMPLETED' ? <CheckCircle2 size={16} className="text-green"/> : <Clock size={16} className="text-orange"/>}
                      {tx.status}
                    </td>
                    <td>{new Date(tx.timestamp).toLocaleString()}</td>
                    <td className="tx-desc">{tx.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </main>
  );
};
