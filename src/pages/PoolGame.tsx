import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import Matter from 'matter-js';
import './Games.css';

export const PoolGame = () => {
    const [searchParams] = useSearchParams();
    const wager = searchParams.get('wager');
    const mode = searchParams.get('mode');
    const navigate = useNavigate();
    const sceneRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef<Matter.Engine | null>(null);
    const renderRef = useRef<Matter.Render | null>(null);
    const runnerRef = useRef<Matter.Runner | null>(null);

    const [status, setStatus] = useState(mode === 'offline' ? 'Local Offline Mode Active. Drag Cue Ball to Shoot.' : 'Finding Opponent...');

    const initPhysics = () => {
        if (!sceneRef.current || mode !== 'offline') return;

        // Cleanup previous instance if exists
        if (renderRef.current) {
            Matter.Render.stop(renderRef.current);
            if (renderRef.current.canvas) {
                renderRef.current.canvas.remove();
            }
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
        engine.gravity.y = 0; // Top-down view (no gravity)

        const width = 800;
        const height = 400;

        const render = Render.create({
            element: sceneRef.current,
            engine: engine,
            options: {
                width,
                height,
                wireframes: false,
                background: '#064e3b',
            }
        });
        renderRef.current = render;

        // Walls (Cushions)
        const wallOptions = { isStatic: true, render: { fillStyle: '#78350f' }, restitution: 0.8 };
        const thickness = 40;
        const walls = [
            Bodies.rectangle(width/2, 0, width, thickness, wallOptions), // Top
            Bodies.rectangle(width/2, height, width, thickness, wallOptions), // Bottom
            Bodies.rectangle(0, height/2, thickness, height, wallOptions), // Left
            Bodies.rectangle(width, height/2, thickness, height, wallOptions), // Right
        ];

        // Balls
        const ballOptions = { restitution: 0.9, friction: 0.005, frictionAir: 0.015, density: 0.05 };
        const radius = 12;
        
        // Cue Ball
        const cueBall = Bodies.circle(200, height/2, radius, { ...ballOptions, render: { fillStyle: '#ffffff' } });
        
        // 8-Ball Rack (Triangle)
        const balls = [];
        const startX = 600;
        const startY = height/2;
        let row = 0;
        let col = 0;
        for (let i = 0; i < 15; i++) {
            const isEightBall = i === 4; // Center ball
            balls.push(Bodies.circle(
                startX + row * radius * 2,
                startY - (row * radius) + (col * radius * 2),
                radius,
                { ...ballOptions, render: { fillStyle: isEightBall ? '#000000' : (i % 2 === 0 ? '#ef4444' : '#f59e0b') } }
            ));
            col++;
            if (col > row) {
                row++;
                col = 0;
            }
        }

        Composite.add(engine.world, [...walls, cueBall, ...balls]);

        // Mouse interaction for shooting (Drag and release cue ball)
        const mouse = Mouse.create(render.canvas);
        const mouseConstraint = MouseConstraint.create(engine, {
            mouse: mouse,
            constraint: {
                stiffness: 0.1,
                render: { visible: true, strokeStyle: '#ffffff' }
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
                    <h1 className="game-title">8-Ball Pool</h1>
                    <p style={{ color: '#10b981', fontWeight: 700, margin: 0 }}>Pot: ${parseInt(wager || '0') * 2}.00</p>
                    {mode === 'offline' ? (
                        <div className="game-badge offline">🎮 Local Pass & Play</div>
                    ) : (
                        <div className="game-badge">🛡️ Anti-Cheat Enabled</div>
                    )}
                </div>
                {mode === 'offline' && (
                    <button className="btn-secondary" onClick={initPhysics} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <RotateCcw size={16} /> Rack Balls
                    </button>
                )}
            </header>

            <main className="game-arena">
                <div className="game-status-panel">
                    {status}
                </div>

                <div className="board-container" style={{ maxWidth: '840px', padding: 0, background: '#78350f', border: 'none', borderRadius: '20px', overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
                    {mode !== 'offline' ? (
                        <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                            <h3>Waiting for opponent...</h3>
                        </div>
                    ) : (
                        <div ref={sceneRef} style={{ borderRadius: '15px', overflow: 'hidden', margin: '20px' }}></div>
                    )}
                </div>
            </main>
        </div>
    );
};
