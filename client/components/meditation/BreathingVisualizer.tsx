import React, { useEffect, useRef, useState } from 'react';

interface BreathingVisualizerProps {
    sessionId: string;
    breathPhase: 'inhale' | 'hold' | 'exhale' | 'hold-empty';
    isActive: boolean;
    cycle?: { inhale: number; holdIn: number; exhale: number; holdOut: number };
}

// ─── 1. Diaphragmatic: Wavy S-curve path with traveling dot ─────────────────
const WavyPathViz: React.FC<{ breathPhase: string; isActive: boolean }> = ({ breathPhase, isActive }) => {
    const dotRef = useRef<SVGCircleElement>(null);
    const progressRef = useRef(0);
    const animRef = useRef<number>(0);

    useEffect(() => {
        if (!isActive) {
            progressRef.current = 0;
            if (dotRef.current) {
                dotRef.current.setAttribute('cx', '20');
                dotRef.current.setAttribute('cy', '120');
            }
            return;
        }

        const path = document.getElementById('wavy-path') as unknown as SVGPathElement;
        if (!path || !dotRef.current) return;

        const totalLength = path.getTotalLength();
        const speed = breathPhase === 'inhale' ? 0.003 : breathPhase === 'exhale' ? 0.002 : 0;

        const animate = () => {
            if (speed > 0) {
                progressRef.current = (progressRef.current + speed) % 1;
            }
            const point = path.getPointAtLength(progressRef.current * totalLength);
            if (dotRef.current) {
                dotRef.current.setAttribute('cx', String(point.x));
                dotRef.current.setAttribute('cy', String(point.y));
            }
            animRef.current = requestAnimationFrame(animate);
        };

        animRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animRef.current);
    }, [isActive, breathPhase]);

    return (
        <div className="w-52 h-52 md:w-60 md:h-60 flex items-center justify-center">
            <svg viewBox="0 0 240 240" className="w-full h-full">
                {/* Soft background gradient */}
                <defs>
                    <linearGradient id="wavyGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#f87171" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#fb923c" stopOpacity="0.3" />
                    </linearGradient>
                </defs>
                {/* Wavy S-curve */}
                <path
                    id="wavy-path"
                    d="M 20 200 C 60 200, 80 40, 120 120 S 180 200, 220 40"
                    fill="none"
                    stroke="#f87171"
                    strokeWidth="4"
                    strokeLinecap="round"
                    opacity="0.6"
                />
                {/* Soft shadow path */}
                <path
                    d="M 20 200 C 60 200, 80 40, 120 120 S 180 200, 220 40"
                    fill="none"
                    stroke="url(#wavyGrad)"
                    strokeWidth="12"
                    strokeLinecap="round"
                    opacity="0.3"
                    filter="blur(4px)"
                />
                {/* Traveling dot */}
                <circle
                    ref={dotRef}
                    cx="20"
                    cy="200"
                    r="10"
                    fill="#3b82f6"
                    className="drop-shadow-lg"
                >
                    <animate attributeName="r" values="8;12;8" dur="2s" repeatCount="indefinite" />
                </circle>
                {/* Phase label */}
                <text x="120" y="230" textAnchor="middle" fill="currentColor" className="text-xs font-bold uppercase tracking-widest" fontSize="11" opacity="0.5">
                    {isActive ? 'follow the dot' : 'ready'}
                </text>
            </svg>
        </div>
    );
};

// ─── 2. Pursed Lip / Lion Breath: Expanding/contracting golden orb ──────────
const GoldenOrbViz: React.FC<{ breathPhase: string; isActive: boolean }> = ({ breathPhase, isActive }) => {
    const scale = breathPhase === 'inhale' ? 1.4
        : breathPhase === 'exhale' ? 0.6
            : breathPhase === 'hold' ? 1.4
                : 0.6;

    return (
        <div className="w-52 h-52 md:w-60 md:h-60 flex items-center justify-center relative">
            {/* Outer glow rings */}
            <div
                className="absolute rounded-full transition-all ease-in-out"
                style={{
                    width: '200px',
                    height: '200px',
                    background: 'radial-gradient(circle, rgba(250,204,21,0.15) 0%, transparent 70%)',
                    transform: `scale(${isActive ? scale * 1.3 : 1})`,
                    transitionDuration: breathPhase === 'inhale' ? '4000ms' : breathPhase === 'exhale' ? '4000ms' : '500ms',
                }}
            />
            <div
                className="absolute rounded-full transition-all ease-in-out"
                style={{
                    width: '160px',
                    height: '160px',
                    background: 'radial-gradient(circle, rgba(250,204,21,0.25) 0%, rgba(251,191,36,0.1) 60%, transparent 80%)',
                    transform: `scale(${isActive ? scale * 1.1 : 1})`,
                    transitionDuration: breathPhase === 'inhale' ? '4000ms' : breathPhase === 'exhale' ? '4000ms' : '500ms',
                }}
            />
            {/* Core orb */}
            <div
                className="rounded-full transition-all ease-in-out flex items-center justify-center relative z-10"
                style={{
                    width: '90px',
                    height: '90px',
                    background: 'radial-gradient(circle at 40% 35%, #fde047, #f59e0b, #d97706)',
                    boxShadow: isActive
                        ? `0 0 40px rgba(250,204,21,0.5), 0 0 80px rgba(245,158,11,0.3)`
                        : `0 0 20px rgba(250,204,21,0.2)`,
                    transform: `scale(${isActive ? scale : 1})`,
                    transitionDuration: breathPhase === 'inhale' ? '4000ms' : breathPhase === 'exhale' ? '4000ms' : '500ms',
                }}
            >
                <span className="text-white/90 text-xs font-bold uppercase tracking-wider drop-shadow-md">
                    {isActive ? breathPhase.replace('-', ' ') : '●'}
                </span>
            </div>
        </div>
    );
};

// ─── 3. Box Breathing: Square with dot tracing edges ────────────────────────
const BoxTraceViz: React.FC<{ breathPhase: string; isActive: boolean; cycle?: { inhale: number; holdIn: number; exhale: number; holdOut: number } }> = ({ breathPhase, isActive, cycle }) => {
    const dotRef = useRef<HTMLDivElement>(null);
    const animRef = useRef<number>(0);
    const startTimeRef = useRef<number>(0);
    const phaseRef = useRef(breathPhase);

    useEffect(() => { phaseRef.current = breathPhase; }, [breathPhase]);

    // Box coordinates (percentage within container)
    const boxSize = 160;
    const offset = 20;
    const corners = [
        { x: offset, y: offset },                     // top-left
        { x: offset + boxSize, y: offset },            // top-right
        { x: offset + boxSize, y: offset + boxSize },  // bottom-right
        { x: offset, y: offset + boxSize },            // bottom-left
    ];

    useEffect(() => {
        if (!isActive || !dotRef.current) return;

        startTimeRef.current = performance.now();

        const getPhaseEdge = (phase: string) => {
            switch (phase) {
                case 'inhale': return 0;  // top-left → top-right
                case 'hold': return 1;    // top-right → bottom-right
                case 'exhale': return 2;  // bottom-right → bottom-left
                case 'hold-empty': return 3; // bottom-left → top-left
                default: return 0;
            }
        };

        const getPhaseDuration = (phase: string) => {
            if (!cycle) return 4;
            switch (phase) {
                case 'inhale': return cycle.inhale;
                case 'hold': return cycle.holdIn;
                case 'exhale': return cycle.exhale;
                case 'hold-empty': return cycle.holdOut;
                default: return 4;
            }
        };

        const animate = () => {
            const edge = getPhaseEdge(phaseRef.current);
            const duration = getPhaseDuration(phaseRef.current) * 1000;
            const elapsed = performance.now() - startTimeRef.current;
            const progress = Math.min(elapsed / duration, 1);

            const from = corners[edge];
            const to = corners[(edge + 1) % 4];
            const x = from.x + (to.x - from.x) * progress;
            const y = from.y + (to.y - from.y) * progress;

            if (dotRef.current) {
                dotRef.current.style.left = `${x}px`;
                dotRef.current.style.top = `${y}px`;
            }

            animRef.current = requestAnimationFrame(animate);
        };

        startTimeRef.current = performance.now();
        animRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animRef.current);
    }, [isActive, breathPhase]);

    return (
        <div className="w-52 h-52 md:w-60 md:h-60 flex items-center justify-center relative" style={{ width: '200px', height: '200px' }}>
            {/* Box outline */}
            <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full">
                <rect
                    x={offset} y={offset} width={boxSize} height={boxSize}
                    fill="rgba(219,234,254,0.3)"
                    stroke="#3b82f6"
                    strokeWidth="2.5"
                    rx="4"
                    opacity={isActive ? 0.8 : 0.4}
                />
                {/* Phase labels on each edge */}
                <text x={offset + boxSize / 2} y={offset - 6} textAnchor="middle" fill="#3b82f6" fontSize="10" fontWeight="bold" opacity="0.7">INHALE</text>
                <text x={offset + boxSize + 6} y={offset + boxSize / 2} textAnchor="start" fill="#3b82f6" fontSize="10" fontWeight="bold" opacity="0.7" transform={`rotate(90, ${offset + boxSize + 6}, ${offset + boxSize / 2})`}>HOLD</text>
                <text x={offset + boxSize / 2} y={offset + boxSize + 16} textAnchor="middle" fill="#3b82f6" fontSize="10" fontWeight="bold" opacity="0.7">EXHALE</text>
                <text x={offset - 6} y={offset + boxSize / 2} textAnchor="end" fill="#3b82f6" fontSize="10" fontWeight="bold" opacity="0.7" transform={`rotate(-90, ${offset - 6}, ${offset + boxSize / 2})`}>HOLD</text>
            </svg>
            {/* Traveling dot */}
            <div
                ref={dotRef}
                className="absolute w-5 h-5 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50 -translate-x-1/2 -translate-y-1/2 z-10"
                style={{
                    left: `${offset}px`,
                    top: `${offset}px`,
                    transition: isActive ? 'none' : 'all 0.3s',
                }}
            >
                <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-50" />
            </div>
        </div>
    );
};

// ─── 4. 4-7-8 Breathing: Circular arc filling clockwise ─────────────────────
const ArcRingViz: React.FC<{ breathPhase: string; isActive: boolean; cycle?: { inhale: number; holdIn: number; exhale: number; holdOut: number } }> = ({ breathPhase, isActive, cycle }) => {
    const [arcProgress, setArcProgress] = useState(0);
    const animRef = useRef<number>(0);
    const startTimeRef = useRef(0);

    useEffect(() => {
        if (!isActive) {
            setArcProgress(0);
            return;
        }

        const getPhaseDuration = () => {
            if (!cycle) return 4;
            switch (breathPhase) {
                case 'inhale': return cycle.inhale;
                case 'hold': return cycle.holdIn;
                case 'exhale': return cycle.exhale;
                case 'hold-empty': return cycle.holdOut;
                default: return 4;
            }
        };

        startTimeRef.current = performance.now();
        const duration = getPhaseDuration() * 1000;

        const animate = () => {
            const elapsed = performance.now() - startTimeRef.current;
            const progress = Math.min(elapsed / duration, 1);
            setArcProgress(progress);
            if (progress < 1) {
                animRef.current = requestAnimationFrame(animate);
            }
        };

        animRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animRef.current);
    }, [isActive, breathPhase]);

    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - arcProgress);

    const phaseColor = breathPhase === 'inhale' ? '#3b82f6'
        : breathPhase === 'exhale' ? '#8b5cf6'
            : breathPhase === 'hold' ? '#f59e0b'
                : '#64748b';

    return (
        <div className="w-52 h-52 md:w-60 md:h-60 flex items-center justify-center">
            <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
                {/* Background ring */}
                <circle cx="100" cy="100" r={radius} fill="none" stroke="currentColor" strokeWidth="6" opacity="0.1" />
                {/* Progress arc */}
                <circle
                    cx="100" cy="100" r={radius}
                    fill="none"
                    stroke={phaseColor}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    style={{ transition: 'stroke 0.3s' }}
                />
                {/* Glow circle */}
                <circle
                    cx="100" cy="100" r={radius}
                    fill="none"
                    stroke={phaseColor}
                    strokeWidth="16"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    opacity="0.15"
                    filter="blur(4px)"
                />
            </svg>
            {/* Center text */}
            <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-bold" style={{ color: phaseColor }}>
                    {breathPhase === 'inhale' ? '↑' : breathPhase === 'exhale' ? '↓' : '•'}
                </span>
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mt-1">
                    {breathPhase.replace('-', ' ')}
                </span>
            </div>
        </div>
    );
};

// ─── 5. Alternate Nostril: Realistic Nose with Airflow ───────────────────────
const NostrilViz: React.FC<{ breathPhase: string; isActive: boolean }> = ({ breathPhase, isActive }) => {
    // We need to track the cycle side: Left In -> Right Out -> Right In -> Left Out
    // For simplicity with the current simple phase prop, we'll map:
    // Inhale = Left, Exhale = Right (as per previous simple logic) 
    // To make it truly realistic in the future we'd need cycle tracking, but for now we fix the Visual.

    // NOTE: To support true "Alternate" (L->R, R->L), we'd need parent state. 
    // For now, we'll stick to the requested "Realistic" visual upgrade.

    const isInhale = breathPhase === 'inhale';
    const isExhale = breathPhase === 'exhale';
    const isHold = breathPhase.includes('hold');

    return (
        <div className="w-52 h-52 md:w-64 md:h-64 flex items-center justify-center relative">
            <svg viewBox="0 0 300 300" className="w-full h-full drop-shadow-xl">
                <defs>
                    <linearGradient id="skinGradient" x1="0.5" y1="0" x2="0.5" y2="1">
                        <stop offset="0%" stopColor="#e5e7eb" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#d1d5db" stopOpacity="0.8" />
                    </linearGradient>
                    <filter id="glowInset" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="arithmetic" k2="-1" k3="1" result="shadowDiff" />
                        <feFlood floodColor="black" floodOpacity="0.2" />
                        <feComposite in2="shadowDiff" operator="in" />
                        <feComposite in2="SourceGraphic" operator="over" />
                    </filter>
                    <radialGradient id="airGlowBlue" cx="0.5" cy="0.5" r="0.5">
                        <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="airGlowPurple" cx="0.5" cy="0.5" r="0.5">
                        <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                    </radialGradient>
                </defs>

                {/* ─── Realistic Nose Geometry ─── */}
                <g transform="translate(150, 150) scale(1.2)">
                    {/* Main Nose Shape (Bridge + Tip) */}
                    <path
                        d="M -30,-90 
                           C -15,-90 -10,-40 -12,0 
                           C -35,20 -55,40 -50,70 
                           C -45,95 -15,100 0,105 
                           C 15,100 45,95 50,70 
                           C 55,40 35,20 12,0 
                           C 10,-40 15,-90 30,-90"
                        fill="none"
                        stroke="#9ca3af"
                        strokeWidth="2"
                        strokeLinecap="round"
                        opacity="0.3"
                    />

                    {/* Nostrils (The dark openings) */}
                    <g>
                        {/* Left Nostril */}
                        <path
                            d="M -12,85 C -20,85 -30,80 -35,70 C -30,65 -20,68 -12,70 Z"
                            fill="#4b5563"
                            opacity="0.6"
                        />
                        {/* Right Nostril */}
                        <path
                            d="M 12,85 C 20,85 30,80 35,70 C 30,65 20,68 12,70 Z"
                            fill="#4b5563"
                            opacity="0.6"
                        />
                    </g>

                    {/* Alae (Nostril Wings) Shading */}
                    <path
                        d="M -35,70 Q -50,60 -50,45"
                        fill="none"
                        stroke="#9ca3af"
                        strokeWidth="1.5"
                        opacity="0.4"
                    />
                    <path
                        d="M 35,70 Q 50,60 50,45"
                        fill="none"
                        stroke="#9ca3af"
                        strokeWidth="1.5"
                        opacity="0.4"
                    />
                </g>

                {/* ─── Airflow Simulations ─── */}

                {/* LEFT NOSTRIL AIRFLOW (Inhale) */}
                <g
                    opacity={isActive && isInhale ? 1 : 0}
                    style={{ transition: 'opacity 0.4s ease-in-out' }}
                    transform="translate(135, 235)"
                >
                    {/* Air stream particles */}
                    <circle r="4" fill="#60a5fa" filter="blur(2px)">
                        <animate attributeName="cy" from="40" to="-10" dur="1s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0;1;0" dur="1s" repeatCount="indefinite" />
                        <animate attributeName="r" values="3;6;2" dur="1s" repeatCount="indefinite" />
                    </circle>
                    <circle r="3" fill="#93c5fd" filter="blur(1px)">
                        <animate attributeName="cy" from="45" to="-5" dur="1.2s" begin="0.3s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0;0.8;0" dur="1.2s" begin="0.3s" repeatCount="indefinite" />
                    </circle>

                    {/* Direction Arrow */}
                    <path
                        d="M 0,30 L 0,0 M -4,8 L 0,0 L 4,8"
                        stroke="#3b82f6"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                        opacity="0.8"
                    >
                        <animateTransform attributeName="transform" type="translate" values="0,10; 0,-5" dur="1s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0;1;0" dur="1s" repeatCount="indefinite" />
                    </path>
                    <text x="0" y="55" textAnchor="middle" fill="#3b82f6" fontSize="12" fontWeight="bold" letterSpacing="1">IN</text>
                </g>

                {/* RIGHT NOSTRIL AIRFLOW (Exhale) */}
                <g
                    opacity={isActive && isExhale ? 1 : 0}
                    style={{ transition: 'opacity 0.4s ease-in-out' }}
                    transform="translate(165, 235)"
                >
                    {/* Air stream particles */}
                    <circle r="4" fill="#8b5cf6" filter="blur(2px)">
                        <animate attributeName="cy" from="-10" to="40" dur="1s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0;1;0" dur="1s" repeatCount="indefinite" />
                    </circle>
                    <circle r="3" fill="#c4b5fd" filter="blur(1px)">
                        <animate attributeName="cy" from="-5" to="45" dur="1.2s" begin="0.3s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0;0.8;0" dur="1.2s" begin="0.3s" repeatCount="indefinite" />
                    </circle>

                    {/* Direction Arrow */}
                    <path
                        d="M 0,-5 L 0,30 M -4,22 L 0,30 L 4,22"
                        stroke="#8b5cf6"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                        opacity="0.8"
                    >
                        <animateTransform attributeName="transform" type="translate" values="0,-5; 0,10" dur="1s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0;1;0" dur="1s" repeatCount="indefinite" />
                    </path>
                    <text x="0" y="55" textAnchor="middle" fill="#8b5cf6" fontSize="12" fontWeight="bold" letterSpacing="1">OUT</text>
                </g>

                {/* Thumb/Finger blocking indicator (Visual hint) */}
                {isActive && isInhale && (
                    <circle cx="172" cy="230" r="8" fill="#ef4444" opacity="0.1">
                        <animate attributeName="r" values="8;10;8" dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.1;0.2;0.1" dur="2s" repeatCount="indefinite" />
                    </circle>
                )}
                {isActive && isExhale && (
                    <circle cx="128" cy="230" r="8" fill="#ef4444" opacity="0.1">
                        <animate attributeName="r" values="8;10;8" dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.1;0.2;0.1" dur="2s" repeatCount="indefinite" />
                    </circle>
                )}

                {/* Technique Label */}
                <text x="150" y="30" textAnchor="middle" fill="currentColor" fontSize="10" fontWeight="bold" opacity="0.3" letterSpacing="3">
                    NADI SHODHANA
                </text>
            </svg>
        </div>
    );
};

// ─── Main Visualizer Component ──────────────────────────────────────────────
const BreathingVisualizer: React.FC<BreathingVisualizerProps> = ({ sessionId, breathPhase, isActive, cycle }) => {
    switch (sessionId) {
        case '1':
            return <WavyPathViz breathPhase={breathPhase} isActive={isActive} />;
        case '2':
            return <GoldenOrbViz breathPhase={breathPhase} isActive={isActive} />;
        case '3':
            return <BoxTraceViz breathPhase={breathPhase} isActive={isActive} cycle={cycle} />;
        case '4':
            return <ArcRingViz breathPhase={breathPhase} isActive={isActive} cycle={cycle} />;
        case '5':
            return <NostrilViz breathPhase={breathPhase} isActive={isActive} />;
        default:
            return <GoldenOrbViz breathPhase={breathPhase} isActive={isActive} />;
    }
};

export default BreathingVisualizer;
