import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gamepad2, Coins, TrendingUp, X } from 'lucide-react';
import './GameLobby.css';

export const GameLobby = () => {
    const navigate = useNavigate();
    const [selectedGame, setSelectedGame] = useState<string | null>(null);
    const [wager, setWager] = useState(10);

    const handleJoinGame = (gameType: string, isOffline: boolean = false) => {
        if (isOffline) {
            navigate(`/${gameType}?mode=offline`);
        } else {
            setSelectedGame(gameType);
        }
    };

    const confirmJoin = () => {
        if (selectedGame) {
            navigate(`/${selectedGame}?wager=${wager}&mode=online`);
        }
    };

    const categories = [
        {
            title: "Card Games",
            games: [
                { id: 'uno', title: 'UNO Live', desc: '2-4 Players. Classic card game rules.', class: 'uno-bg' }
            ]
        },
        {
            title: "Board Games",
            games: [
                { id: 'pool', title: '8-Ball Pool', desc: '1v1. Real physics, high stakes.', class: 'pool-bg' },
                { id: 'carroms', title: 'Carroms Live', desc: '1v1. Board game classic.', class: 'carroms-bg' },
                { id: 'ludo', title: 'Ludo Royale', desc: '4 Players. Winner takes all.', class: 'ludo-bg' },
                { id: 'chess', title: 'Grandmaster Chess', desc: '1v1. High intellect, high stakes.', class: 'chess-bg' }
            ]
        },
        {
            title: "Sports Games",
            games: [
                { id: 'rugby', title: 'Fantasy Rugby', desc: '1v1. Real-time sports betting.', class: 'rugby-bg' }
            ]
        }
    ];

    return (
        <div className="game-lobby container" style={{ position: 'relative' }}>
            <header className="lobby-header text-center animate-fade-in" style={{ marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
                   <Gamepad2 size={36} color="var(--accent-primary)" /> Gaming Arena
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>Select a category and choose a game to enter the matchmaking room.</p>
            </header>

            {categories.map((cat, idx) => (
                <div key={idx} className="category-section animate-fade-in" style={{ animationDelay: `${idx * 0.2}s`, marginBottom: '3rem' }}>
                    <h2 className="category-title" style={{ fontSize: '1.75rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>{cat.title}</h2>
                    <div className="games-grid">
                        {cat.games.map(game => (
                            <div key={game.id} className="game-card glass-panel" style={{ background: 'var(--card-bg)' }}>
                                <div className={`game-image ${game.class}`}>
                                    <div className="game-overlay">
                                        <span className="live-badge">Live</span>
                                    </div>
                                </div>
                                <div className="game-info">
                                    <h2 style={{ color: 'var(--text-primary)' }}>{game.title}</h2>
                                    <p style={{ color: 'var(--text-secondary)' }}>{game.desc}</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                                        <button className="btn btn-primary wager-btn" onClick={() => handleJoinGame(game.id, false)}>
                                            <Gamepad2 size={20} /> Play Online (Set Wager)
                                        </button>
                                        <button className="btn btn-secondary" onClick={() => handleJoinGame(game.id, true)}>
                                            Play Offline (Local)
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {/* Wager Modal */}
            {selectedGame && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
                    <div className="glass-panel" style={{ background: 'var(--bg-secondary)', padding: '2.5rem', borderRadius: '1.5rem', width: '90%', maxWidth: '450px', position: 'relative', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-lg)' }}>
                        <button onClick={() => setSelectedGame(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                            <X size={24} />
                        </button>
                        
                        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '1.5rem', color: 'var(--text-primary)', textAlign: 'center' }}>
                            <Coins color="#f59e0b" size={28} /> Room Entry Wager
                        </h3>
                        
                        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '2rem' }}>Set your wager amount before entering the matchmaking queue.</p>

                        <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
                            <input 
                                type="range" 
                                min="5" 
                                max="1000" 
                                step="5" 
                                value={wager} 
                                onChange={(e) => setWager(parseInt(e.target.value))}
                                className="wager-slider"
                                style={{ width: '100%', marginBottom: '1rem' }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Entry Fee:</span>
                                <span style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)' }}>${wager}.00</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0' }}>
                                <span style={{ color: 'var(--text-secondary)' }}><TrendingUp size={16} style={{ verticalAlign: 'middle' }}/> Potential Win:</span>
                                <span style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '1.2rem' }}>${wager * 2}.00</span>
                            </div>
                        </div>

                        <button className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }} onClick={confirmJoin}>
                            Confirm & Enter Room
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
