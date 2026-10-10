import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Dices } from 'lucide-react';
import './Games.css';

type Color = 'red' | 'green' | 'yellow' | 'blue';

interface Token {
    id: string;
    color: Color;
    position: number; // -1 means base, 0-51 means path, 52-56 means home straight, 57 means home
}

const LUDO_PATH = Array.from({length: 52}, (_, i) => i);

export const LudoGame = () => {
    const [searchParams] = useSearchParams();
    const wager = searchParams.get('wager');
    const mode = searchParams.get('mode');
    const navigate = useNavigate();

    const [tokens, setTokens] = useState<Token[]>([]);
    const [turn, setTurn] = useState<Color>('red');
    const [diceValue, setDiceValue] = useState<number>(0);
    const [diceRolled, setDiceRolled] = useState(false);
    const [status, setStatus] = useState('Red to Roll');

    const initGame = () => {
        const initialTokens: Token[] = [];
        ['red', 'green', 'yellow', 'blue'].forEach(color => {
            for (let i = 0; i < 4; i++) {
                initialTokens.push({ id: `${color}_${i}`, color: color as Color, position: -1 });
            }
        });
        setTokens(initialTokens);
        setTurn('red');
        setDiceValue(0);
        setDiceRolled(false);
        setStatus('Red to Roll');
    };

    useEffect(() => {
        if (mode === 'offline') {
            initGame();
        }
    }, [mode]);

    const rollDice = () => {
        if (diceRolled || mode !== 'offline') return;
        const val = Math.floor(Math.random() * 6) + 1;
        setDiceValue(val);
        setDiceRolled(true);
        setStatus(`${turn.charAt(0).toUpperCase() + turn.slice(1)} Rolled a ${val}. Select a token to move.`);

        // Check if player has valid moves
        const validTokens = tokens.filter(t => t.color === turn && (t.position !== -1 || val === 6));
        if (validTokens.length === 0) {
            setStatus(`${turn.charAt(0).toUpperCase() + turn.slice(1)} Rolled a ${val}. No valid moves.`);
            setTimeout(() => nextTurn(val === 6), 1500);
        }
    };

    const nextTurn = (gotSix: boolean) => {
        if (gotSix) {
            setDiceRolled(false);
            setStatus(`${turn.charAt(0).toUpperCase() + turn.slice(1)} to Roll again (Rolled a 6)`);
            return;
        }

        const colors: Color[] = ['red', 'green', 'yellow', 'blue'];
        const nextColor = colors[(colors.indexOf(turn) + 1) % 4];
        setTurn(nextColor);
        setDiceRolled(false);
        setStatus(`${nextColor.charAt(0).toUpperCase() + nextColor.slice(1)} to Roll`);
    };

    const moveToken = (tokenId: string) => {
        if (!diceRolled || mode !== 'offline') return;
        
        const token = tokens.find(t => t.id === tokenId);
        if (!token || token.color !== turn) return;

        let newPos = token.position;

        // From base
        if (token.position === -1) {
            if (diceValue !== 6) return; // Must roll 6 to exit base
            // Start positions based on color (simplified logic for 1D array)
            if (turn === 'red') newPos = 0;
            else if (turn === 'green') newPos = 13;
            else if (turn === 'yellow') newPos = 26;
            else if (turn === 'blue') newPos = 39;
        } else {
            // Move forward
            newPos = token.position + diceValue;
            if (newPos > 51) newPos = newPos - 52; // Wrap around (simplified, no home path implemented for UI brevity)
        }

        const updatedTokens = tokens.map(t => {
            if (t.id === tokenId) return { ...t, position: newPos };
            
            // Check capture
            if (t.color !== turn && t.position === newPos && newPos !== -1) {
                // Sent back to base
                return { ...t, position: -1 };
            }
            return t;
        });

        setTokens(updatedTokens);
        nextTurn(diceValue === 6);
    };

    const renderBoard = () => {
        // Create a 15x15 grid
        const cells = [];
        for (let y = 0; y < 15; y++) {
            for (let x = 0; x < 15; x++) {
                // Determine base areas
                let cellClass = 'ludo-cell';
                if (x < 6 && y < 6) cellClass += ' base-red';
                else if (x > 8 && y < 6) cellClass += ' base-green';
                else if (x > 8 && y > 8) cellClass += ' base-yellow';
                else if (x < 6 && y > 8) cellClass += ' base-blue';
                
                // Determine path mapping (simplified rendering logic)
                const isPath = (x >= 6 && x <= 8) || (y >= 6 && y <= 8);
                if (isPath && cellClass === 'ludo-cell') cellClass += ' path';

                cells.push(
                    <div key={`${x}-${y}`} className={cellClass}>
                        {/* Token rendering based on simple 1D to 2D mapping would go here, 
                            but for visual representation we will just show the grid */}
                    </div>
                );
            }
        }
        return cells;
    };

    const getTurnColor = () => {
        if (turn === 'red') return '#ef4444';
        if (turn === 'green') return '#22c55e';
        if (turn === 'yellow') return '#eab308';
        return '#3b82f6';
    };

    return (
        <div className="game-layout">
            <header className="game-header">
                <button className="btn-secondary" onClick={() => navigate('/lobby')} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <ArrowLeft size={16} /> Leave Table
                </button>
                <div className="game-title-container">
                    <h1 className="game-title">Ludo Royale</h1>
                    <p style={{ color: '#10b981', fontWeight: 700, margin: 0 }}>Pot: ${parseInt(wager || '0') * 2}.00</p>
                    {mode === 'offline' ? (
                        <div className="game-badge offline">🎮 Local Pass & Play</div>
                    ) : (
                        <div className="game-badge">🛡️ Anti-Cheat Enabled</div>
                    )}
                </div>
                {mode === 'offline' && (
                    <button className="btn-secondary" onClick={initGame} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <RotateCcw size={16} /> Reset
                    </button>
                )}
            </header>

            <main className="game-arena">
                <div className="game-status-panel" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '600px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="turn-indicator" style={{ background: getTurnColor() }}></div>
                        {status}
                    </div>
                    {mode === 'offline' && (
                        <button className="btn-primary" onClick={rollDice} disabled={diceRolled} style={{ display: 'flex', alignItems: 'center', gap: '5px', opacity: diceRolled ? 0.5 : 1 }}>
                            <Dices size={16} /> {diceValue ? `Rolled: ${diceValue}` : 'Roll Dice'}
                        </button>
                    )}
                </div>

                <div className="board-container" style={{ maxWidth: '600px', padding: '10px', background: '#ffffff', borderRadius: '15px' }}>
                    {mode !== 'offline' ? (
                        <div style={{ height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                            <h3>Waiting for opponent...</h3>
                        </div>
                    ) : (
                        <div style={{ position: 'relative' }}>
                            <div className="ludo-grid">
                                {renderBoard()}
                            </div>
                            
                            {/* Overlay Tokens */}
                            <div className="ludo-tokens-overlay">
                                {tokens.map(token => (
                                    <div 
                                        key={token.id} 
                                        className={`ludo-token ${token.color} ${token.color === turn && diceRolled && (token.position !== -1 || diceValue === 6) ? 'playable' : ''}`}
                                        onClick={() => moveToken(token.id)}
                                        style={{
                                            // Simplified positioning for demonstration, 
                                            // real ludo needs complex path mapping coordinate system
                                            transform: token.position === -1 
                                                ? `translate(${token.color === 'red' ? 50 : token.color === 'green' ? 450 : token.color === 'yellow' ? 450 : 50}px, ${token.color === 'red' ? 50 : token.color === 'green' ? 50 : token.color === 'yellow' ? 450 : 450}px)`
                                                : `translate(${250 + Math.cos(token.position) * 100}px, ${250 + Math.sin(token.position) * 100}px)` 
                                        }}
                                    ></div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <style>{`
                .ludo-grid {
                    display: grid;
                    grid-template-columns: repeat(15, 1fr);
                    grid-template-rows: repeat(15, 1fr);
                    width: 100%;
                    aspect-ratio: 1/1;
                    gap: 1px;
                    background: #cbd5e1;
                    border: 2px solid #0f172a;
                }
                .ludo-cell {
                    background: #ffffff;
                }
                .base-red { background: #fee2e2; }
                .base-green { background: #dcfce7; }
                .base-yellow { background: #fef9c3; }
                .base-blue { background: #dbeafe; }
                .path { background: #f8fafc; }
                
                .ludo-tokens-overlay {
                    position: absolute;
                    top: 0; left: 0; right: 0; bottom: 0;
                    pointer-events: none;
                }
                .ludo-token {
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    position: absolute;
                    transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                    pointer-events: auto;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                    border: 2px solid white;
                }
                .ludo-token.red { background: #ef4444; }
                .ludo-token.green { background: #22c55e; }
                .ludo-token.yellow { background: #eab308; }
                .ludo-token.blue { background: #3b82f6; }
                
                .ludo-token.playable {
                    cursor: pointer;
                    animation: pulse 1s infinite;
                    z-index: 10;
                }
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.1); box-shadow: 0 0 15px rgba(255,255,255,0.8); }
                    100% { transform: scale(1); }
                }
            `}</style>
        </div>
    );
};
