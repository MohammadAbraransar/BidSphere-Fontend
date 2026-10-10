import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import Matter from 'matter-js';
import './Games.css';

export const CarromsGame = () => {
    const [searchParams] = useSearchParams();
    const wager = searchParams.get('wager');
    const mode = searchParams.get('mode');
    const navigate = useNavigate();
    const sceneRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef<Matter.Engine | null>(null);
    const renderRef = useRef<Matter.Render | null>(null);
    const runnerRef = useRef<Matter.Runner | null>(null);

    const [status, setStatus] = useState(mode === 'offline' ? 'Local Offline Mode Active. Drag Striker to Shoot.' : 'Finding Opponent...');

    const initPhysics = () => {
        if (!sceneRef.current || mode !== 'offline') return;

        if (renderRef.current) {
            Matter.Render.stop(renderRef.current);
            if (renderRef.current.canvas) renderRef.current.canvas.remove();
        }
        if (runnerRef.current) Matter.Runner.stop(runnerRef.current);
        if (engineRef.current) Matter.Engine.clear(engineRef.current);

        const Engine = Matter.Engine,
              Render = Matter.Render,
              Runner = Matter.Runner,
              Bodies = Matter.Bodies,
              Composite = Matter.Composite,
              Mouse = Matter.Mouse,
              MouseConstraint = Matter.MouseConstraint;

        const engine = Engine.create();
        engineRef.current = engine;
        engine.gravity.y = 0;

        const size = 600; // Square board
        const render = Render.create({
            element: sceneRef.current,
            engine: engine,
            options: {
                width: size,
                height: size,
                wireframes: false,
                background: '#eec988', // Wooden carrom board color
            }
        });
        renderRef.current = render;

        // Board Frame
        const wallOptions = { isStatic: true, render: { fillStyle: '#451a03' }, restitution: 0.9 };
        const thick = 40;
        const walls = [
            Bodies.rectangle(size/2, thick/2, size, thick, wallOptions),
            Bodies.rectangle(size/2, size - thick/2, size, thick, wallOptions),
            Bodies.rectangle(thick/2, size/2, thick, size, wallOptions),
            Bodies.rectangle(size - thick/2, size/2, thick, size, wallOptions),
        ];

        // Corner Pockets (Visual representation only for now, would need collision filters for real pockets)
        const pocketRadius = 30;
        const pocketOptions = { isStatic: true, isSensor: true, render: { fillStyle: '#171717' } };
        const pockets = [
            Bodies.circle(thick + pocketRadius, thick + pocketRadius, pocketRadius, pocketOptions),
            Bodies.circle(size - thick - pocketRadius, thick + pocketRadius, pocketRadius, pocketOptions),
            Bodies.circle(thick + pocketRadius, size - thick - pocketRadius, pocketRadius, pocketOptions),
            Bodies.circle(size - thick - pocketRadius, size - thick - pocketRadius, pocketRadius, pocketOptions),
        ];

        // Coins and Striker
        const coinOptions = { restitution: 0.8, friction: 0.01, frictionAir: 0.02, density: 0.02 };
        const coinRadius = 14;
        
        const striker = Bodies.circle(size/2, size - 100, 20, { 
            ...coinOptions, 
            density: 0.06, // Striker is heavier
            render: { fillStyle: '#0ea5e9' } 
        });

        const coins = [];
        const cx = size/2;
        const cy = size/2;
        
        // Center (Red/Queen)
        coins.push(Bodies.circle(cx, cy, coinRadius, { ...coinOptions, render: { fillStyle: '#ef4444' } }));
        
        // Inner Ring (6 coins)
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const dist = coinRadius * 2.2;
            coins.push(Bodies.circle(
                cx + Math.cos(angle) * dist,
                cy + Math.sin(angle) * dist,
                coinRadius,
                { ...coinOptions, render: { fillStyle: i % 2 === 0 ? '#171717' : '#fef08a' } }
            ));
        }

        // Outer Ring (12 coins)
        for (let i = 0; i < 12; i++) {
            const angle = (i * Math.PI) / 6;
            const dist = coinRadius * 4.4;
            coins.push(Bodies.circle(
                cx + Math.cos(angle) * dist,
                cy + Math.sin(angle) * dist,
                coinRadius,
                { ...coinOptions, render: { fillStyle: i % 2 === 0 ? '#fef08a' : '#171717' } }
            ));
        }

        Composite.add(engine.world, [...walls, ...pockets, striker, ...coins]);

        const mouse = Mouse.create(render.canvas);
        const mouseConstraint = MouseConstraint.create(engine, {
            mouse: mouse,
            constraint: {
                stiffness: 0.1,
                render: { visible: true, strokeStyle: '#451a03' }
            }
        });
        Composite.add(engine.world, mouseConstraint);
        render.mouse = mouse;

        Render.run(render);
        const runner = Runner.create();
        runnerRef.current = runner;
        Runner.run(runner, engine);
    };

    useEffect(() => {
        initPhysics();
        return () => {
            if (renderRef.current) Matter.Render.stop(renderRef.current);
            if (runnerRef.current) Matter.Runner.stop(runnerRef.current);
            if (engineRef.current) Matter.Engine.clear(engineRef.current);
        };
    }, [mode]);

    return (
        <div className="game-layout">
            <header className="game-header">
                <button className="btn-secondary" onClick={() => navigate('/lobby')} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <ArrowLeft size={16} /> Leave Table
                </button>
                <div className="game-title-container">
                    <h1 className="game-title">Carroms Live</h1>
                    <p style={{ color: '#10b981', fontWeight: 700, margin: 0 }}>Pot: ${parseInt(wager || '0') * 2}.00</p>
                    {mode === 'offline' ? (
                        <div className="game-badge offline">🎮 Local Pass & Play</div>
                    ) : (
                        <div className="game-badge">🛡️ Anti-Cheat Enabled</div>
                    )}
                </div>
                {mode === 'offline' && (
                    <button className="btn-secondary" onClick={initPhysics} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <RotateCcw size={16} /> Reset Board
                    </button>
                )}
            </header>

            <main className="game-arena">
                <div className="game-status-panel">
                    {status}
                </div>

                <div className="board-container" style={{ maxWidth: '640px', padding: 0, background: '#451a03', border: 'none', borderRadius: '10px', overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
                    {mode !== 'offline' ? (
                        <div style={{ height: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                            <h3>Waiting for opponent...</h3>
                        </div>
                    ) : (
                        <div ref={sceneRef} style={{ margin: '20px', borderRadius: '5px', overflow: 'hidden' }}></div>
                    )}
                </div>
            </main>
        </div>
    );
};
