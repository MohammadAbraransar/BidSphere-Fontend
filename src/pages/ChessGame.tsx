import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { Chess, Move } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import './Games.css';

export const ChessGame = () => {
    const [searchParams] = useSearchParams();
    const wager = searchParams.get('wager');
    const mode = searchParams.get('mode');
    const navigate = useNavigate();
    
    // Chess State
    const [game, setGame] = useState(new Chess());
    const [fen, setFen] = useState(game.fen());
    const [status, setStatus] = useState('White to Move');

    useEffect(() => {
        updateStatus();
    }, [game, fen]);

    const updateStatus = () => {
        let currentStatus = '';
        const moveColor = game.turn() === 'w' ? 'White' : 'Black';

        if (game.isCheckmate()) {
            currentStatus = `Game over, ${moveColor} is in checkmate.`;
        } else if (game.isDraw()) {
            currentStatus = 'Game over, drawn position';
        } else {
            currentStatus = `${moveColor} to Move`;
            if (game.isCheck()) {
                currentStatus += ', ' + moveColor + ' is in check';
            }
        }
        setStatus(currentStatus);
    };

    function onDrop(sourceSquare: string, targetSquare: string) {
        if (mode !== 'offline') {
            // Online mode not yet implemented for real moves
            return false;
        }

        try {
            const move = game.move({
                from: sourceSquare,
                to: targetSquare,
                promotion: 'q', // always promote to queen for simplicity
            });

            if (move === null) return false;
            
            // Valid move
            setFen(game.fen());
            return true;
        } catch (e) {
            // Invalid move
            return false;
        }
    }

    const resetGame = () => {
        const newGame = new Chess();
        setGame(newGame);
        setFen(newGame.fen());
    };

    return (
        <div className="game-layout">
            <header className="game-header">
                <button className="btn-secondary" onClick={() => navigate('/lobby')} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <ArrowLeft size={16} /> Leave Table
                </button>
                <div className="game-title-container">
                    <h1 className="game-title">Grandmaster Chess</h1>
                    <p style={{ color: '#10b981', fontWeight: 700, margin: 0 }}>Prize Pool: ${parseInt(wager || '0') * 2}.00</p>
                    {mode === 'offline' ? (
                        <div className="game-badge offline">
                            🎮 Local Offline Mode Active. Pass & Play.
                        </div>
                    ) : (
                        <div className="game-badge">
                            🛡️ Anti-Cheat Enabled - Real-Time Rules Active
                        </div>
                    )}
                </div>
                <button className="btn-secondary" onClick={resetGame} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <RotateCcw size={16} /> Reset
                </button>
            </header>

            <main className="game-arena">
                <div className="game-status-panel">
                    <div className={`turn-indicator ${game.turn() === 'w' ? 'turn-white' : 'turn-black'}`}></div>
                    {status}
                </div>

                <div className="board-container">
                    {mode !== 'offline' ? (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                            <h3>Waiting for opponent...</h3>
                        </div>
                    ) : (
                        <Chessboard options={{
                            position: fen,
                            onPieceDrop: ({ sourceSquare, targetSquare }) => targetSquare ? onDrop(sourceSquare, targetSquare) : false,
                            darkSquareStyle: { backgroundColor: '#475569' },
                            lightSquareStyle: { backgroundColor: '#f1f5f9' },
                            animationDurationInMs: 200,
                        }} />
                    )}
                </div>
            </main>
        </div>
    );
};
