import React, { useState, useEffect, useRef } from 'react';
import { Dice5, History, ShieldCheck } from 'lucide-react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { API_BASE_URL, WS_BASE_URL } from '../config';

type Round = { id: number; pick: 'SMALL' | 'BIG'; roll: number; result: 'SMALL' | 'BIG'; won: boolean; stake: number };

export const BigSmallGame = () => {
  const [credits, setCredits] = useState(0); // Fetched from backend
  const [stake, setStake] = useState('25');
  const [pick, setPick] = useState<'SMALL' | 'BIG'>('SMALL');
  const [rounds, setRounds] = useState<Round[]>([]);
  const [rolling, setRolling] = useState(false);
  const [note, setNote] = useState('Choose a side and play with virtual credits.');
  const [lastRoll, setLastRoll] = useState<string | number>('?');
  
  const stompClient = useRef<Client | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    if (!token || !username) return;

    // Fetch the authoritative balance and this user's persisted game history.
    fetch(`${API_BASE_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => { if (!res.ok) throw new Error('Could not load account balance.'); return res.json(); })
      .then(data => setCredits(Number(data.walletBalance || 0)))
      .catch(console.error);
    fetch(`${API_BASE_URL}/games/my-entries`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => { if (!res.ok) throw new Error('Could not load game history.'); return res.json(); })
      .then((entries: any[]) => setRounds(entries.map(entry => ({
        id: Number(entry.id), pick: entry.selection, roll: Number(entry.resultNumber || 0),
        result: entry.result, won: entry.outcome === 'WIN', stake: Number(entry.amount)
      })).slice(0, 10)))
      .catch(console.error);

    const client = new Client({
      connectHeaders: { Authorization: `Bearer ${token}` },
      webSocketFactory: () => new SockJS(WS_BASE_URL),
      reconnectDelay: 5000,
    });

    client.onConnect = () => {
      client.subscribe('/user/queue/games', (message) => {
        const data = JSON.parse(message.body);
        if (data.type === 'RESULT' && data.gameType === 'SMALL_BIG') {
          const { outcome, won, amount, number } = data.payload;
          setCredits(Number(data.payload.balance ?? 0)); // Server-authoritative balance
          setLastRoll(number);
          setRounds(r => [{
            id: Number(data.payload.roundId || Date.now()), pick: pick, roll: number, result: outcome, won, stake: Number(stake)
          }, ...r].slice(0, 10));
          setNote(`Number ${number} — ${outcome}. ${won ? `You won ${amount} credits.` : `You lost.`}`);
          setRolling(false);
        } else if (data.type === 'ERROR') {
          setNote(`Error: ${data.payload}`);
          setRolling(false);
        }
      });
    };
    client.activate();
    stompClient.current = client;

    return () => { client.deactivate(); };
  }, [pick, stake]);

  const play = () => {
    const amount = Math.floor(Number(stake));
    if (rolling) return;
    if (!Number.isFinite(amount) || amount < 1 || amount > credits) {
      setNote('Enter a valid stake within your available demo credits.');
      return;
    }
    setRolling(true);
    setLastRoll('…');
    setNote('Rolling...');
    
    if (stompClient.current?.connected) {
        stompClient.current.publish({
            destination: '/app/game.join',
            body: JSON.stringify({
                gameType: 'SMALL_BIG',
                wager: amount,
                payload: { selection: pick }
            })
        });
    } else {
        setNote('Disconnected from server.');
        setRolling(false);
    }
  };

  return <main className="bs-page"><header><span className="bs-kicker">ARCADE / NUMBER GAME</span><h1>Small <em>or</em> Big</h1><p>Pick a side, reveal a number and test your luck. Demo credits only.</p></header><div className="bs-layout"><section className="bs-card"><div className="bs-credit"><div><small>VIRTUAL CREDIT BALANCE</small><strong>{credits.toLocaleString()}</strong></div><span><Dice5 size={24}/></span></div><div className="bs-number">{lastRoll}</div><p className="bs-range">1–50 = SMALL <span>51–100 = BIG</span></p><div className="bs-choices"><button className={pick==='SMALL'?'chosen':''} onClick={()=>setPick('SMALL')}><small>01—50</small><b>SMALL</b></button><button className={pick==='BIG'?'chosen':''} onClick={()=>setPick('BIG')}><small>51—100</small><b>BIG</b></button></div><label className="bs-stake">Demo stake<input type="number" min="1" max={credits} value={stake} onChange={e=>setStake(e.target.value)}/></label><button className="bs-play" disabled={rolling||credits<1} onClick={play}>{rolling?'Rolling…':'Reveal number'}</button><p className="bs-note" role="status">{note}</p><div className="bs-disclaimer"><ShieldCheck size={17}/> No deposits, withdrawals, cash prizes or real-money betting. Results are random demo gameplay.</div></section><section className="bs-card bs-history"><h2><History size={19}/> Recent rounds</h2>{rounds.length?rounds.map(r=><div className="bs-round" key={r.id}><div><b>#{r.roll} · {r.result}</b><small>Picked {r.pick} · stake {r.stake}</small></div><strong className={r.won?'win':'loss'}>{r.won?'+':'−'}{r.stake}</strong></div>):<div className="bs-empty">Your rounds will appear here after you play.</div>}</section></div><style>{`.bs-page{max-width:1000px;margin:0 auto;padding:42px 20px 70px;color:#101828}.bs-page>header{text-align:center;margin-bottom:28px}.bs-kicker{font-size:10px;letter-spacing:1.8px;font-weight:850;color:#2563eb}.bs-page h1{font-size:clamp(35px,5vw,48px);letter-spacing:-1.5px;margin:10px 0}.bs-page h1 em{font-style:normal;color:#2563eb}.bs-page header p{color:#667085;font-size:14px}.bs-layout{display:grid;grid-template-columns:1.2fr .8fr;gap:18px;align-items:start}.bs-card{background:#fff;border:1px solid #eaecf0;border-radius:18px;padding:23px;box-shadow:0 5px 20px #10182808}.bs-credit{display:flex;align-items:center;justify-content:space-between}.bs-credit small,.bs-stake{font-size:11px;font-weight:800;color:#667085;letter-spacing:.4px}.bs-credit strong{display:block;font-size:25px;margin-top:5px}.bs-credit>span{display:grid;place-items:center;background:#eff6ff;color:#2563eb;border-radius:12px;width:45px;height:45px}.bs-number{display:grid;place-items:center;width:112px;height:112px;border-radius:50%;margin:25px auto 12px;background:radial-gradient(circle at 30% 20%,#fff,#dbeafe);border:7px solid #bfdbfe;box-shadow:0 8px 20px #2563eb20;font-size:42px;font-weight:900;color:#1d4ed8}.bs-range{text-align:center;color:#667085;font-size:10px;font-weight:800}.bs-range span{margin-left:14px}.bs-choices{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:22px 0}.bs-choices button{background:#f9fafb;border:2px solid #eaecf0;border-radius:12px;padding:15px;color:#344054;cursor:pointer}.bs-choices button.chosen{background:#eff6ff;border-color:#3b82f6;color:#1d4ed8}.bs-choices small,.bs-choices b{display:block}.bs-choices small{font-size:10px;margin-bottom:5px}.bs-choices b{font-size:17px}.bs-stake{display:block}.bs-stake input{display:block;box-sizing:border-box;width:100%;margin-top:7px;border:1px solid #d0d5dd;border-radius:9px;padding:12px;font-size:14px}.bs-play{width:100%;margin-top:13px;padding:13px;border:0;border-radius:9px;background:#175cd3;color:#fff;font-weight:850;cursor:pointer}.bs-play:disabled{opacity:.5}.bs-note{text-align:center;min-height:18px;font-size:12px;color:#475467}.bs-disclaimer{display:flex;gap:8px;align-items:flex-start;background:#f0fdf4;color:#166534;padding:12px;border-radius:9px;font-size:10px;line-height:1.5}.bs-disclaimer svg{flex-shrink:0}.bs-history h2{display:flex;gap:9px;align-items:center;font-size:16px;margin:0 0 16px}.bs-history h2 svg{color:#2563eb}.bs-round{display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-top:1px solid #f2f4f7}.bs-round b,.bs-round small{display:block}.bs-round b{font-size:12px}.bs-round small{font-size:10px;color:#667085;margin-top:5px}.bs-round strong{font-size:13px}.bs-round .win{color:#039855}.bs-round .loss{color:#d92d20}.bs-empty{padding:30px 0;text-align:center;color:#98a2b3;font-size:12px}@media(max-width:680px){.bs-layout{grid-template-columns:1fr}.bs-page{padding:25px 13px}}`}</style></main>;
};
