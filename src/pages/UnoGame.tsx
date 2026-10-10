import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, RotateCcw } from 'lucide-react';

// --- UNO Logic ---
type Color = 'red' | 'blue' | 'green' | 'yellow' | 'wild';
type Value = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'Skip' | 'Reverse' | '+2' | 'WILD' | '+4';

interface Card {
    id: string;
    color: Color;
    value: Value;
}

const COLORS: Color[] = ['red', 'blue', 'green', 'yellow'];
const VALUES: Value[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Skip', 'Skip', 'Reverse', 'Reverse', '+2', '+2'];

const generateDeck = (): Card[] => {
    let deck: Card[] = [];
    let idCounter = 0;
    
    // Colored cards
    COLORS.forEach(color => {
        VALUES.forEach(value => {
            deck.push({ id: `card_${idCounter++}`, color, value });
        });
    });
    
    // Wild cards
    for (let i = 0; i < 4; i++) {
        deck.push({ id: `card_${idCounter++}`, color: 'wild', value: 'WILD' });
        deck.push({ id: `card_${idCounter++}`, color: 'wild', value: '+4' });
    }
    
    // Shuffle
    return deck.sort(() => Math.random() - 0.5);
};

export const UnoGame = () => {
    const [searchParams] = useSearchParams();
    const wager = searchParams.get('wager');
    const mode = searchParams.get('mode');
    const navigate = useNavigate();

    // Game State
    const [deck, setDeck] = useState<Card[]>([]);
    const [discardPile, setDiscardPile] = useState<Card[]>([]);
    const [player1Hand, setPlayer1Hand] = useState<Card[]>([]);
    const [player2Hand, setPlayer2Hand] = useState<Card[]>([]);
    const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
    const [currentColor, setCurrentColor] = useState<Color>('red');
    const [direction, setDirection] = useState<1 | -1>(1); // 1 for normal, -1 for reverse (2 player means same thing essentially)
    const [gameOver, setGameOver] = useState(false);
    const [status, setStatus] = useState('');
    const [wildPrompt, setWildPrompt] = useState(false);
    const [pendingWildCard, setPendingWildCard] = useState<Card | null>(null);

    const initGame = () => {
        const newDeck = generateDeck();
        const p1Hand = newDeck.splice(0, 7);
        const p2Hand = newDeck.splice(0, 7);
        
        // Find a starting card that isn't a wild for simplicity
        let firstCard = newDeck.find(c => c.color !== 'wild');
        if (!firstCard) firstCard = newDeck[0];
        
        newDeck.splice(newDeck.indexOf(firstCard), 1);
        
        setDeck(newDeck);
        setPlayer1Hand(p1Hand);
        setPlayer2Hand(p2Hand);
        setDiscardPile([firstCard]);
        setCurrentColor(firstCard.color);
        setCurrentPlayer(1);
        setGameOver(false);
        setStatus("Player 1's Turn");
    };

    useEffect(() => {
        if (mode === 'offline') {
            initGame();
        } else {
            setStatus('Connecting to server...');
            // Simulating online connection delay
            setTimeout(() => setStatus('Waiting for opponent...'), 1000);
        }
    }, [mode]);

    const drawCard = (player: 1 | 2, count: number = 1) => {
        setDeck(prevDeck => {
            let d = [...prevDeck];
            if (d.length < count) {
                // Reshuffle discard pile (leaving top card)
                const topCard = discardPile[discardPile.length - 1];
                const newD = discardPile.slice(0, discardPile.length - 1).sort(() => Math.random() - 0.5);
                setDiscardPile([topCard]);
                d = [...newD, ...d];
            }
            
            const drawn = d.splice(0, count);
            if (player === 1) setPlayer1Hand(prev => [...prev, ...drawn]);
            else setPlayer2Hand(prev => [...prev, ...drawn]);
            
            return d;
        });
    };

    const handleDrawClick = () => {
        if (gameOver || mode !== 'offline') return;
        drawCard(currentPlayer, 1);
        switchTurn();
    };

    const switchTurn = (skip: boolean = false) => {
        setCurrentPlayer(prev => {
            const next = prev === 1 ? 2 : 1;
            // In 2 player, skip means same player goes again
            if (skip) {
                setStatus(`Player ${prev} gets another turn!`);
                return prev;
            }
            setStatus(`Player ${next}'s Turn`);
            return next;
        });
    };

    const handlePlayCard = (card: Card, player: 1 | 2) => {
        if (player !== currentPlayer || gameOver || mode !== 'offline') return;
        if (wildPrompt) return; // Must select color first

        const topCard = discardPile[discardPile.length - 1];
        
        // Validation
        const isValid = card.color === 'wild' || card.color === currentColor || card.value === topCard.value;
        
        if (!isValid) return;

        // Remove from hand
        if (player === 1) setPlayer1Hand(prev => prev.filter(c => c.id !== card.id));
        else setPlayer2Hand(prev => prev.filter(c => c.id !== card.id));

        if (card.color === 'wild') {
            setPendingWildCard(card);
            setWildPrompt(true);
            return;
        }

        processCardPlay(card, card.color);
    };

    const processCardPlay = (card: Card, chosenColor: Color) => {
        setDiscardPile(prev => [...prev, card]);
        setCurrentColor(chosenColor);
        setWildPrompt(false);
        setPendingWildCard(null);

        // Win check
        if ((currentPlayer === 1 && player1Hand.length === 1) || (currentPlayer === 2 && player2Hand.length === 1)) {
            setStatus(`Player ${currentPlayer} Wins!`);
            setGameOver(true);
            return;
        }

        // Apply effects
        let skip = false;
        if (card.value === 'Skip' || card.value === 'Reverse') {
            skip = true; // In 2-player, Reverse acts like Skip
        } else if (card.value === '+2') {
            drawCard(currentPlayer === 1 ? 2 : 1, 2);
            skip = true;
        } else if (card.value === '+4') {
            drawCard(currentPlayer === 1 ? 2 : 1, 4);
            skip = true;
        }

        switchTurn(skip);
    };

    const handleColorSelect = (color: Color) => {
        if (pendingWildCard) {
            processCardPlay(pendingWildCard, color);
        }
    };

    const getCardStyle = (color: Color) => {
        switch (color) {
            case 'red': return '#ef4444';
            case 'blue': return '#3b82f6';
            case 'green': return '#22c55e';
            case 'yellow': return '#eab308';
            default: return '#1f2937'; // wild
        }
    };

    // Render logic
    return (
        <div className="game-layout" style={{ background: 'radial-gradient(circle, #2a0845 0%, #6441A5 100%)', position: 'relative', overflow: 'hidden' }}>
            <header className="game-header">
                <button className="btn-secondary" onClick={() => navigate('/lobby')} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <ArrowLeft size={16} /> Leave Table
                </button>
                <div className="game-title-container">
                    <h1 className="game-title" style={{ color: 'white' }}>UNO Live</h1>
                    <p style={{ color: '#fcd34d', fontWeight: 700, margin: 0 }}>Pot: ${parseInt(wager || '0') * 2}.00</p>
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

            <div style={{ textAlign: 'center', padding: '1rem', color: 'white', fontSize: '1.5rem', fontWeight: 'bold' }}>
                {status}
            </div>

            {mode !== 'offline' ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ padding: '2rem', background: 'rgba(0,0,0,0.5)', borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.1)', color: 'white', textAlign: 'center' }}>
                        <h2>{status}</h2>
                    </div>
                </div>
            ) : (
                <div style={{ flex: 1, position: 'relative' }}>
                    {/* Opponent Hand (Player 2) */}
                    <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '-20px' }}>
                        {player2Hand.map((card, i) => (
                            <div key={card.id} onClick={() => handlePlayCard(card, 2)} className={`uno-card ${currentPlayer === 2 ? 'playable' : 'back-card'}`} style={{ marginLeft: i !== 0 ? '-40px' : '0', transform: `rotate(${(i - player2Hand.length/2) * 5}deg) translateY(${Math.abs(i - player2Hand.length/2) * 5}px)`, background: currentPlayer === 2 ? getCardStyle(card.color) : '' }}>
                                <div className="uno-card-inner">
                                    {currentPlayer === 2 ? (card.value === 'WILD' || card.value === '+4' ? 'WILD' : card.value) : 'UNO'}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Center Area */}
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', gap: '40px', alignItems: 'center' }}>
                        {/* Draw Pile */}
                        <div className="uno-card back-card" onClick={handleDrawClick} style={{ cursor: 'pointer', boxShadow: '-5px 5px 15px rgba(0,0,0,0.5)' }}>
                            <div className="uno-card-inner">UNO</div>
                        </div>
                        {/* Discard Pile */}
                        {discardPile.length > 0 && (
                            <div className="uno-card" style={{ background: getCardStyle(discardPile[discardPile.length - 1].color), transform: 'rotate(5deg)' }}>
                                <div className="uno-card-inner" style={{ background: getCardStyle(currentColor) }}>
                                    {discardPile[discardPile.length - 1].value === 'WILD' || discardPile[discardPile.length - 1].value === '+4' ? 'WILD' : discardPile[discardPile.length - 1].value}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Color Picker for Wild */}
                    {wildPrompt && (
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(0,0,0,0.8)', padding: '2rem', borderRadius: '1rem', zIndex: 100, display: 'flex', gap: '10px' }}>
                            <button onClick={() => handleColorSelect('red')} style={{ width: '50px', height: '50px', background: '#ef4444', borderRadius: '50%', cursor: 'pointer', border: '2px solid white' }}></button>
                            <button onClick={() => handleColorSelect('blue')} style={{ width: '50px', height: '50px', background: '#3b82f6', borderRadius: '50%', cursor: 'pointer', border: '2px solid white' }}></button>
                            <button onClick={() => handleColorSelect('green')} style={{ width: '50px', height: '50px', background: '#22c55e', borderRadius: '50%', cursor: 'pointer', border: '2px solid white' }}></button>
                            <button onClick={() => handleColorSelect('yellow')} style={{ width: '50px', height: '50px', background: '#eab308', borderRadius: '50%', cursor: 'pointer', border: '2px solid white' }}></button>
                        </div>
                    )}

                    {/* Player Hand (Player 1) */}
                    <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '-20px' }}>
                        {player1Hand.map((card, i) => (
                            <div key={card.id} onClick={() => handlePlayCard(card, 1)} className={`uno-card ${currentPlayer === 1 ? 'playable' : 'back-card'}`} style={{ marginLeft: i !== 0 ? '-40px' : '0', transform: `rotate(${(i - player1Hand.length/2) * 5}deg) translateY(${Math.abs(i - player1Hand.length/2) * 5}px)`, background: currentPlayer === 1 ? getCardStyle(card.color) : '' }}>
                                <div className="uno-card-inner">
                                    {currentPlayer === 1 ? (card.value === 'WILD' || card.value === '+4' ? 'WILD' : card.value) : 'UNO'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            <style>{`
                .uno-card {
                    width: 100px;
                    height: 150px;
                    border-radius: 12px;
                    border: 6px solid white;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    font-size: 3rem;
                    font-weight: 900;
                    color: white;
                    text-shadow: 2px 2px 0 #000;
                    box-shadow: 0 10px 20px rgba(0,0,0,0.3);
                    position: relative;
                    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                .uno-card-inner {
                    width: 80%;
                    height: 85%;
                    border-radius: 50% 50% / 60% 60%;
                    background: inherit;
                    border: 4px solid white;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    transform: rotate(-25deg);
                }
                .back-card {
                    background: #1f2937 !important;
                    background-image: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px) !important;
                }
                .back-card .uno-card-inner {
                    background: #ef4444 !important;
                    font-size: 1.5rem;
                }
                .playable {
                    cursor: pointer;
                }
                .playable:hover {
                    transform: translateY(-40px) scale(1.1) !important;
                    z-index: 100;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.5);
                }
            `}</style>
        </div>
    );
};
