import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import Matter from 'matter-js';
import './Games.css';

export const RugbyGame = () => {
    const [searchParams] = useSearchParams();
    const wager = searchParams.get('wager');
    const mode = searchParams.get('mode');
    const navigate = useNavigate();
    const sceneRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef<Matter.Engine | null>(null);
    const renderRef = useRef<Matter.Render | null>(null);
    const runnerRef = useRef<Matter.Runner | null>(null);

    const [status, setStatus] = useState(mode === 'offline' ? 'Local Offline Mode. Drag the Rugby Ball to kick a Field Goal!' : 'Finding Opponent...');
    const [score, setScore] = useState(0);

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
              MouseConstraint = Matter.MouseConstraint,
              Events = Matter.Events;

        const engine = Engine.create();
        engineRef.current = engine;
        engine.gravity.y = 1; // Real gravity for kicking

        const width = 800;
        const height = 500;

        const render = Render.create({
            element: sceneRef.current,
            engine: engine,
            options: {
                width,
                height,
                wireframes: false,
                background: '#15803d', // Grass green
            }
        });
        renderRef.current = render;

        // Ground
        const ground = Bodies.rectangle(width/2, height - 10, width, 20, { isStatic: true, render: { fillStyle: '#166534' } });

        // Goal Posts (H-shape)
        const postOptions = { isStatic: true, render: { fillStyle: '#facc15' } };
        const leftPost = Bodies.rectangle(width/2 - 60, height - 150, 10, 300, postOptions);
        const rightPost = Bodies.rectangle(width/2 + 60, height - 150, 10, 300, postOptions);
        const crossbar = Bodies.rectangle(width/2, height - 150, 130, 10, postOptions);

        // Goal Sensor (between posts, above crossbar)
        const goalSensor = Bodies.rectangle(width/2, height - 250, 100, 200, {
            isStatic: true,
            isSensor: true,
            render: { visible: false },
            label: 'GoalSensor'
        });

        // Rugby Ball (Oval approximation)
        const ball = Bodies.polygon(100, height - 50, 8, 25, {
            restitution: 0.6, // Bouncy
            friction: 0.05,
            density: 0.04,
            render: { fillStyle: '#78350f' },
            label: 'RugbyBall'
        });

        Composite.add(engine.world, [ground, leftPost, rightPost, crossbar, goalSensor, ball]);

        // Drag to kick
        const mouse = Mouse.create(render.canvas);
        const mouseConstraint = MouseConstraint.create(engine, {
            mouse: mouse,
            constraint: {
                stiffness: 0.2,
                render: { visible: true, strokeStyle: '#ffffff' }
            }
        });
        Composite.add(engine.world, mouseConstraint);
        render.mouse = mouse;

        // Scoring Event
        let scored = false;
        Events.on(engine, 'collisionStart', (event) => {
            const pairs = event.pairs;
            for (let i = 0; i < pairs.length; i++) {
                const pair = pairs[i];
                if ((pair.bodyA.label === 'GoalSensor' && pair.bodyB.label === 'RugbyBall') ||
                    (pair.bodyB.label === 'GoalSensor' && pair.bodyA.label === 'RugbyBall')) {
                    if (!scored) {
                        scored = true;
                        setScore(s => s + 3); // 3 points for a field goal/drop goal
                        setStatus("IT'S GOOD! +3 Points (Field Goal)!");
                        
                        // Reset ball after a delay
                        setTimeout(() => {
                            Matter.Body.setPosition(ball, { x: 100, y: height - 50 });
                            Matter.Body.setVelocity(ball, { x: 0, y: 0 });
                            Matter.Body.setAngularVelocity(ball, 0);
                            scored = false;
                            setStatus("Drag the Rugby Ball to kick again!");
                        }, 2000);
                    }
                }
            }
        });

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
                    <ArrowLeft size={16} /> Leave Pitch
                </button>
                <div className="game-title-container">
                    <h1 className="game-title">Fantasy Rugby</h1>
                    <p style={{ color: '#10b981', fontWeight: 700, margin: 0 }}>Pot: ${parseInt(wager || '0') * 2}.00</p>
                    {mode === 'offline' ? (
                        <div className="game-badge offline">🎮 Local Pass & Play (Field Goal Challenge)</div>
                    ) : (
                        <div className="game-badge">🛡️ Anti-Cheat Enabled</div>
                    )}
                </div>
                {mode === 'offline' && (
                    <button className="btn-secondary" onClick={initPhysics} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <RotateCcw size={16} /> Reset Pitch
                    </button>
                )}
            </header>

            <main className="game-arena">
                <div className="game-status-panel" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '840px' }}>
                    <div>{status}</div>
                    <div style={{ background: '#0f172a', color: 'white', padding: '0.25rem 1rem', borderRadius: '1rem' }}>Score: {score}</div>
                </div>

                <div className="board-container" style={{ maxWidth: '840px', padding: 0, background: '#15803d', border: 'none', borderRadius: '20px', overflow: 'hidden', display: 'flex', justifyContent: 'center', position: 'relative' }}>
                    {mode !== 'offline' ? (
                        <div style={{ height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                            <h3>Waiting for opponent...</h3>
                        </div>
                    ) : (
                        <>
                            <div ref={sceneRef} style={{ borderRadius: '15px', overflow: 'hidden' }}></div>
                            
                            {/* Pitch markings overlay */}
                            <div style={{ position: 'absolute', bottom: 0, left: '20%', width: '4px', height: '100%', background: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }}></div>
                            <div style={{ position: 'absolute', bottom: 0, left: '40%', width: '4px', height: '100%', background: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }}></div>
                            <div style={{ position: 'absolute', bottom: 0, left: '60%', width: '4px', height: '100%', background: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }}></div>
                            <div style={{ position: 'absolute', bottom: 0, left: '80%', width: '4px', height: '100%', background: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }}></div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};
