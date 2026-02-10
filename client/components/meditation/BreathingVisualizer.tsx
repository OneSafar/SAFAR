import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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

// ─── 5. Alternate Nostril: User Provided Visualization (Adapted) ─────────────
const NostrilViz: React.FC<{ breathPhase: string; isActive: boolean }> = ({ breathPhase, isActive }) => {
    // Track cycle to alternate sides:
    const [cycleCount, setCycleCount] = useState(0);
    const prevPhaseRef = useRef(breathPhase);

    useEffect(() => {
        if (!isActive) {
            setCycleCount(0);
            return;
        }

        // Detect start of new INHALE phase to increment cycle or switch sides?
        if (prevPhaseRef.current !== 'inhale' && breathPhase === 'inhale') {
            setCycleCount(c => c + 1);
        }
        prevPhaseRef.current = breathPhase;
    }, [breathPhase, isActive]);

    // Determine current logical step based on cycleCount & breathPhase
    const checkIsLeftCycle = cycleCount % 2 === 0; // Even = Left In / Right Out? Or 1-based? Let's say 0 is first.
    // Actually, user standard is often: L In, R Out, R In, L Out.
    // Cycle 0 (First): Inhale Left. Exhale Right.
    // Cycle 1 (Second): Inhale Right. Exhale Left.

    // Map to the props expected by the visual
    let side: 'left' | 'right' | 'both' = 'both';
    let action: 'inhale' | 'exhale' | 'hold' = 'hold';

    // Action mapping
    if (breathPhase === 'inhale') action = 'inhale';
    else if (breathPhase === 'exhale') action = 'exhale';
    else action = 'hold';

    // Side mapping
    if (checkIsLeftCycle) {
        // Cycle 0: In Left -> Out Right
        if (breathPhase === 'inhale') side = 'left';
        else if (breathPhase === 'exhale') side = 'right'; // Exhale Right
        else side = 'both'; // Hold
    } else {
        // Cycle 1: In Right -> Out Left
        if (breathPhase === 'inhale') side = 'right';
        else if (breathPhase === 'exhale') side = 'left'; // Exhale Left
        else side = 'both';
    }

    const color = side === 'left' ? 'from-blue-400 to-blue-500'
        : side === 'right' ? 'from-teal-400 to-teal-500'
            : 'from-purple-400 to-purple-500';

    const label = `${action === 'inhale' ? 'Inhale' : action === 'exhale' ? 'Exhale' : 'Hold'} ${side === 'left' ? 'Left' : side === 'right' ? 'Right' : ''}`;
    const icon = action === 'inhale' ? '🌊' : action === 'exhale' ? '🍃' : '✨';

    // Scale down to fit standard container (250px vs 320px+ in original)
    return (
        <div className="w-60 h-60 flex items-center justify-center overflow-hidden relative rounded-full bg-slate-50/50">
            <div className="scale-[0.55] origin-center w-[400px] h-[400px] flex items-center justify-center relative">
                {/* Left Nostril Channel */}
                <div className="absolute left-10 flex flex-col items-center">
                    <div className="text-sm font-bold text-slate-400 mb-2 uppercase tracking-widest">Left</div>
                    <div className="w-8 h-64 bg-slate-200 rounded-full overflow-hidden shadow-inner relative">
                        <motion.div
                            animate={{
                                height: side === 'left' || side === 'both'
                                    ? (action === 'inhale' || action === 'hold' ? '100%' : '0%')
                                    : '0%',
                            }}
                            transition={{ duration: 1, ease: "easeInOut" }}
                            className={`absolute bottom-0 w-full bg-gradient-to-t ${side === 'left' ? 'from-blue-500 to-blue-400' : 'from-purple-500 to-purple-400'} shadow-lg`}
                        />

                        {(side === 'left' && action === 'inhale') && (
                            <motion.div
                                initial={{ y: 256, opacity: 0 }}
                                animate={{ y: 0, opacity: [0, 1, 0] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="absolute w-4 h-4 bg-blue-100 rounded-full left-2"
                            />
                        )}
                    </div>
                </div>

                {/* Center Focus Point */}
                <div className="flex flex-col items-center mx-8">
                    <motion.div
                        animate={{
                            scale: action === 'hold' ? [1, 1.15, 1] : 1,
                        }}
                        transition={{
                            duration: 2,
                            repeat: action === 'hold' ? Infinity : 0,
                            ease: "easeInOut"
                        }}
                        className="relative"
                    >
                        {/* Outer glow ring */}
                        <motion.div
                            animate={{
                                opacity: action === 'hold' ? [0.3, 0.6, 0.3] : 0.2,
                                scale: action === 'hold' ? [1, 1.3, 1] : 1,
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className={`absolute inset-0 rounded-full bg-gradient-to-r ${color} blur-xl -z-10`}
                        />

                        {/* Main circle */}
                        <div className="w-40 h-40 rounded-full bg-white border-4 border-slate-100 shadow-xl flex items-center justify-center">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                className={`w-28 h-28 rounded-3xl bg-gradient-to-br ${color} shadow-lg flex items-center justify-center text-5xl`}
                            >
                                {icon}
                            </motion.div>
                        </div>
                    </motion.div>
                </div>

                {/* Right Nostril Channel */}
                <div className="absolute right-10 flex flex-col items-center">
                    <div className="text-sm font-bold text-slate-400 mb-2 uppercase tracking-widest">Right</div>
                    <div className="w-8 h-64 bg-slate-200 rounded-full overflow-hidden shadow-inner relative">
                        <motion.div
                            animate={{
                                height: side === 'right' || side === 'both'
                                    ? (action === 'inhale' || action === 'hold' ? '100%' : '0%')
                                    : '0%',
                            }}
                            transition={{ duration: 1, ease: "easeInOut" }}
                            className={`absolute bottom-0 w-full bg-gradient-to-t ${side === 'right' ? 'from-teal-500 to-teal-400' : 'from-purple-500 to-purple-400'} shadow-lg`}
                        />

                        {(side === 'right' && action === 'inhale') && (
                            <motion.div
                                initial={{ y: 256, opacity: 0 }}
                                animate={{ y: 0, opacity: [0, 1, 0] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="absolute w-4 h-4 bg-teal-100 rounded-full left-2"
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Overlay Label for clarity in small view */}
            <div className="absolute bottom-4 text-center">
                <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r ${color} text-white shadow-md`}>
                    {side === 'both' ? 'Hold' : side}
                </span>
            </div>
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
