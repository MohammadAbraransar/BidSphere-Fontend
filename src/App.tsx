import React, { useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import axios from 'axios';
import type { AuctionItem, BidMessage } from './types';
import { AuctionItemCard } from './components/AuctionItemCard';
import { Login } from './components/Login';
import { Wallet } from './components/Wallet';
import { Gavel, LogOut, Settings, Gamepad2, UserRound } from 'lucide-react';
import { Routes, Route, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AdminDashboard } from './pages/AdminDashboard';
import { GameLobby } from './pages/GameLobby';
import { UnoGame } from './pages/UnoGame';
import { PoolGame } from './pages/PoolGame';
import { CarromsGame } from './pages/CarromsGame';
import { LudoGame } from './pages/LudoGame';
import { RugbyGame } from './pages/RugbyGame';
import { ChessGame } from './pages/ChessGame';
import { UserProfile } from './pages/UserProfile';
import { UserDashboard } from './pages/UserDashboard';
import { AuctionMakers } from './pages/AuctionMakers';
import { BigSmallGame } from './pages/BigSmallGame';
import './index.css';

const API_URL = 'http://localhost:8081/api/auctions';
const WS_URL = 'http://localhost:8081/ws';

const normalizeRole = (value: string | null | undefined) => {
  const role = (value || '').trim().toUpperCase();
  return role.startsWith('ROLE_') ? role : role ? `ROLE_${role}` : null;
};
const homeForRole = (value: string | null | undefined) => {
  const role = normalizeRole(value);
  if (role === 'ROLE_ADMIN') return '/admin';
  if (role === 'ROLE_AUCTION_MAKER') return '/makers';
  return '/dashboard';
};

function App() {
  const [items, setItems] = useState<AuctionItem[]>([]);
  const [messages, setMessages] = useState<Record<number, string>>({});
  const [biddingState, setBiddingState] = useState<Record<number, boolean>>({});
  const stompClient = useRef<Client | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Auth State
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [username, setUsername] = useState<string | null>(localStorage.getItem('username'));
  const [role, setRole] = useState<string | null>(normalizeRole(localStorage.getItem('role')));
  const [authReady, setAuthReady] = useState(!localStorage.getItem('token'));

  const handleLoginSuccess = (newToken: string, newUsername: string, newRole: string) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('username', newUsername);
    const normalizedRole = normalizeRole(newRole) || 'ROLE_USER';
    localStorage.setItem('role', normalizedRole);
    setToken(newToken);
    setUsername(newUsername);
    setRole(normalizedRole);
    setAuthReady(true);
    
    // Fix direct routing after login
    const targetPath = homeForRole(normalizedRole);
    if (location.pathname === '/' || location.pathname === '/login') {
      navigate(targetPath, { replace: true });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    setToken(null);
    setUsername(null);
    setRole(null);
    setAuthReady(true);
    navigate('/', { replace: true });
  };

  // On refresh, trust the backend role rather than a possibly stale browser value.
  useEffect(() => {
    if (!token) { setAuthReady(true); return; }
    let active = true;
    axios.get('http://localhost:8081/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(response => {
        if (!active) return;
        const actualRole = normalizeRole(response.data?.role) || 'ROLE_USER';
        localStorage.setItem('role', actualRole);
        if (response.data?.username) localStorage.setItem('username', response.data.username);
        setRole(actualRole);
        setUsername(response.data?.username || localStorage.getItem('username'));
      })
      .catch(error => {
        if (!active) return;
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          localStorage.removeItem('token'); localStorage.removeItem('username'); localStorage.removeItem('role');
          setToken(null); setUsername(null); setRole(null);
        }
      })
      .finally(() => { if (active) setAuthReady(true); });
    return () => { active = false; };
  }, [token]);

  // Axios interceptor for JWT
  useEffect(() => {
    const interceptor = axios.interceptors.request.use(config => {
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
    return () => axios.interceptors.request.eject(interceptor);
  }, [token]);

  // Fetch initial items
  useEffect(() => {
    if (!token) return;

    const fetchItems = async () => {
      try {
        const response = await axios.get(`${API_URL}/items`);
        setItems(response.data);
      } catch (error) {
        console.error('Failed to fetch items', error);
        if ((error as any).response?.status === 401) {
          handleLogout();
        }
      }
    };
    fetchItems();
  }, [token]);

  // Setup WebSocket connection
  useEffect(() => {
    if (!token) return;

    const client = new Client({
      connectHeaders: { Authorization: `Bearer ${token}` },
      webSocketFactory: () => new SockJS(WS_URL),
      debug: (str) => {
        // console.log(str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    client.onConnect = () => {
      console.log('Connected to WebSocket');
      
      items.forEach(item => {
        client.subscribe(`/topic/bids/${item.id}`, (message) => {
          if (message.body) {
            const bidUpdate: BidMessage = JSON.parse(message.body);
            
            setItems(prevItems => prevItems.map(i => 
              i.id === bidUpdate.itemId 
                ? { ...i, currentPrice: bidUpdate.currentPrice }
                : i
            ));

            setMessages(prev => ({ ...prev, [bidUpdate.itemId]: bidUpdate.message }));
            setBiddingState(prev => ({ ...prev, [bidUpdate.itemId]: false }));

            setTimeout(() => {
              setMessages(prev => {
                const newMessages = { ...prev };
                delete newMessages[bidUpdate.itemId];
                return newMessages;
              });
            }, 3000);
          }
        });
      });
    };

    client.activate();
    stompClient.current = client;

    return () => {
      client.deactivate();
    };
  }, [items.length, token]);

  const handlePlaceBid = async (itemId: number, amount: number) => {
    setBiddingState(prev => ({ ...prev, [itemId]: true }));
    try {
      await axios.post(`${API_URL}/bid`, {
        itemId,
        amount
      });
    } catch (error: any) {
      console.error('Failed to place bid', error);
      alert(error.response?.data || "Failed to place bid");
      setBiddingState(prev => ({ ...prev, [itemId]: false }));
      if (error.response?.status === 401) {
         handleLogout();
      }
    }
  };

  if (!token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }
  if (!authReady) {
    return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#f7f9fc',color:'#475467',fontFamily:'Inter,system-ui,sans-serif'}}>Verifying your account and permissions…</main>;
  }

  const normalizedRole = normalizeRole(role);
  const homePath = homeForRole(normalizedRole);
  const isAdmin = normalizedRole === 'ROLE_ADMIN';
  const isMaker = normalizedRole === 'ROLE_AUCTION_MAKER';
  const isUser = normalizedRole === 'ROLE_USER';

  return (
    <div className="app-wrapper">
      <nav className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
          <Link to="/" className="brand text-gradient" style={{ textDecoration: 'none' }}>
            <Gavel size={28} color="var(--accent-primary)" />
            <span>BidSphere</span>
          </Link>
          {isAdmin ? <Link to="/admin" style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 700 }}>Admin control center</Link> : isMaker ? <Link to="/makers" style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 700 }}>Auction maker studio</Link> : <><Link to="/dashboard" style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: '600' }}>My dashboard</Link><Link to="/auctions" style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: '600' }}>Browse auctions</Link><Link to="/big-small" style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}><Gamepad2 size={20} color="var(--accent-secondary)" /> Small & Big</Link><Link to="/lobby" style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}><Gamepad2 size={18} /> More games</Link></>}
        </div>
         <div className="user-profile">
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
             {!isAdmin && <Wallet />}
             {isAdmin && (
               <Link to="/admin" style={{ color: 'var(--text-secondary)' }} title="Admin Panel">
                  <Settings size={20} />
               </Link>
             )}
             <Link to="/profile" style={{ textDecoration: 'none', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }} title="Profile and verification">
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{username}</span>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#edf2ff', color: '#3559d9', display: 'grid', placeItems: 'center' }}><UserRound size={17}/></div>
             </Link>
             <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }} title="Logout">
               <LogOut size={20} />
             </button>
          </div>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<Navigate to={homePath} replace />} />
        <Route path="/auctions" element={isUser ? <main className="main-content"><div className="container"><header style={{marginBottom:'28px'}}><p style={{color:'var(--accent-primary)',fontWeight:800,fontSize:12,letterSpacing:1.4}}>LIVE MARKETPLACE</p><h1 style={{fontSize:'clamp(28px,4vw,42px)',margin:'8px 0'}}>Find your next <span className="text-gradient">great bid.</span></h1><p style={{color:'var(--text-secondary)'}}>Live listings and current prices from the platform.</p></header><div className="grid grid-cols-3">{items.filter(item => item.active).map(item => <AuctionItemCard key={item.id} item={item} onPlaceBid={handlePlaceBid} lastBidMessage={messages[item.id]} isBidding={biddingState[item.id] || false} />)}</div>{items.filter(item => item.active).length === 0 && <div style={{padding:48,textAlign:'center',background:'#fff',border:'1px solid var(--border-color)',borderRadius:16,color:'var(--text-secondary)'}}>No active auctions are available right now.</div>}</div></main> : <Navigate to={homePath} replace />} />
        <Route path="/dashboard" element={isUser ? <UserDashboard /> : <Navigate to={homePath} replace />} />
        <Route path="/admin" element={isAdmin ? <AdminDashboard /> : <Navigate to={homePath} replace />} />
        <Route path="/makers" element={isMaker ? <AuctionMakers /> : <Navigate to={homePath} replace />} />
        <Route path="/big-small" element={isUser ? <BigSmallGame /> : <Navigate to={homePath} replace />} />
        <Route path="/lobby" element={isUser ? <GameLobby /> : <Navigate to={homePath} replace />} />
        <Route path="/uno" element={isUser ? <UnoGame /> : <Navigate to={homePath} replace />} />
        <Route path="/pool" element={isUser ? <PoolGame /> : <Navigate to={homePath} replace />} />
        <Route path="/carroms" element={isUser ? <CarromsGame /> : <Navigate to={homePath} replace />} />
        <Route path="/ludo" element={isUser ? <LudoGame /> : <Navigate to={homePath} replace />} />
        <Route path="/rugby" element={isUser ? <RugbyGame /> : <Navigate to={homePath} replace />} />
        <Route path="/chess" element={isUser ? <ChessGame /> : <Navigate to={homePath} replace />} />
        <Route path="/profile" element={<UserProfile />} />
        <Route path="*" element={<Navigate to={homePath} replace />} />
      </Routes>
    </div>
  );
}

export default App;
