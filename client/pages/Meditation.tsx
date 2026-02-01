import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { authService } from "@/utils/authService";
import {
    ArrowLeft,
    Play,
    Pause,
    RotateCcw,
    Clock,
    Wind,
    Heart,
    Sparkles,
    Moon,
    Sun,
    Volume2,
    VolumeX,
} from "lucide-react";

interface Session {
    id: string;
    title: string;
    duration: number; // in minutes
    description: string;
    type: "breathing" | "guided" | "silent";
}

const sessions: Session[] = [
    {
        id: "1",
        title: "Morning Calm",
        duration: 5,
        description: "Start your day with clarity and focus",
        type: "breathing",
    },
    {
        id: "2",
        title: "Deep Breathing",
        duration: 10,
        description: "Box breathing technique for stress relief",
        type: "breathing",
    },
    {
        id: "3",
        title: "Body Scan",
        duration: 15,
        description: "Progressive relaxation from head to toe",
        type: "guided",
    },
    {
        id: "4",
        title: "Mindful Silence",
        duration: 20,
        description: "Pure meditation with gentle bells",
        type: "silent",
    },
];

export default function Meditation() {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const [user, setUser] = useState<any>(null);
    const [selectedSession, setSelectedSession] = useState<Session>(sessions[0]);
    const [isActive, setIsActive] = useState(false);
    const [timeLeft, setTimeLeft] = useState(selectedSession.duration * 60);
    const [breathPhase, setBreathPhase] = useState<"inhale" | "hold" | "exhale">("inhale");
    const [isMuted, setIsMuted] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const breathIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await authService.getCurrentUser();
                if (response?.user) {
                    setUser(response.user);
                }
            } catch (error) {
                console.error("Failed to fetch user", error);
            }
        };
        fetchUser();
    }, []);

    useEffect(() => {
        setTimeLeft(selectedSession.duration * 60);
        setIsActive(false);
    }, [selectedSession]);

    useEffect(() => {
        if (isActive && timeLeft > 0) {
            intervalRef.current = setInterval(() => {
                setTimeLeft((t) => t - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isActive, timeLeft]);

    // Breathing animation cycle (4-4-4 box breathing)
    useEffect(() => {
        if (isActive && selectedSession.type === "breathing") {
            const cycle = () => {
                setBreathPhase("inhale");
                setTimeout(() => setBreathPhase("hold"), 4000);
                setTimeout(() => setBreathPhase("exhale"), 8000);
            };
            cycle();
            breathIntervalRef.current = setInterval(cycle, 12000);
        }

        return () => {
            if (breathIntervalRef.current) clearInterval(breathIntervalRef.current);
        };
    }, [isActive, selectedSession]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    const handleReset = () => {
        setIsActive(false);
        setTimeLeft(selectedSession.duration * 60);
        setBreathPhase("inhale");
    };

    const progress = ((selectedSession.duration * 60 - timeLeft) / (selectedSession.duration * 60)) * 100;

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-[#0a0a0f] dark:to-[#0f0f17] transition-colors duration-500">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4">
                <button
                    onClick={() => navigate("/landing")}
                    className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                >
                    <ArrowLeft className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                </button>
                <h1 className="text-xl font-semibold text-slate-800 dark:text-white">Meditation</h1>
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                >
                    {theme === "dark" ? (
                        <Sun className="w-6 h-6 text-amber-400" />
                    ) : (
                        <Moon className="w-6 h-6 text-slate-600" />
                    )}
                </button>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8">
                {/* Meditation Visual - Human Meditating Silhouette */}
                <div className="flex justify-center mb-12">
                    <div className="relative group">
                        {/* Animated ripple circles */}
                        <div
                            className={`absolute inset-0 rounded-full border-2 border-emerald-400/30 transition-all duration-1000 ${isActive ? "animate-ping" : ""
                                }`}
                            style={{ transform: "scale(1.3)" }}
                        />
                        <div
                            className={`absolute inset-0 rounded-full border border-emerald-400/20 transition-all duration-700 delay-200 ${isActive ? "animate-pulse" : ""
                                }`}
                            style={{ transform: "scale(1.5)" }}
                        />

                        {/* Main circle with meditating figure */}
                        <div
                            className={`w-56 h-56 md:w-64 md:h-64 rounded-full overflow-hidden border-4 transition-all duration-500 ${isActive
                                ? "border-emerald-400 shadow-[0_0_60px_rgba(52,211,153,0.3)]"
                                : "border-slate-200 dark:border-slate-700"
                                } bg-slate-100 dark:bg-slate-800`}
                        >
                            {/* Meditation Image */}
                            <img
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuC03jxU5u_cgQDKXbMsTTcYxSeQWddHxS7XfwCab3gFZQiE6cK7cyPkPFJ8OwtNZ492fyl_KmoZHgHE0djejqLziIrqMAFwUD-VIM1O7LaYGMtrjAYDrgsjMz1M6uDBLiySXSgL3WojSwxGls6yMb3J3bmUYvMVGFey1aJV0NUgD4IstZNbe4UT_ZsSuJTwdkb6h0-B82SelK-SuD083O4z3SmruVOS3wDLibDcTuKG-LZKP8rlw-CZYq2cSiz5nnbW9uXoJ6LGfrx-"
                                alt="Meditation Silhouette"
                                className={`w-full h-full object-cover transition-transform duration-700 ${isActive ? "scale-105" : ""}`}
                                style={{ filter: 'grayscale(100%) contrast(110%) brightness(105%)' }}
                            />
                        </div>

                        {/* Breathing indicator */}
                        {isActive && selectedSession.type === "breathing" && (
                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
                                <span
                                    className={`text-sm font-medium uppercase tracking-widest transition-all duration-500 ${breathPhase === "inhale"
                                        ? "text-emerald-500"
                                        : breathPhase === "hold"
                                            ? "text-amber-500"
                                            : "text-blue-500"
                                        }`}
                                >
                                    {breathPhase}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Timer Display */}
                <div className="text-center mb-8">
                    <div className="text-6xl md:text-7xl font-light text-slate-800 dark:text-white mb-2 font-mono tracking-wider">
                        {formatTime(timeLeft)}
                    </div>
                    <p className="text-slate-500 dark:text-slate-400">{selectedSession.title}</p>

                    {/* Progress bar */}
                    <div className="mt-6 max-w-md mx-auto">
                        <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-1000"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-6 mb-12">
                    <button
                        onClick={handleReset}
                        className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                        <RotateCcw className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                    </button>

                    <button
                        onClick={() => setIsActive(!isActive)}
                        className={`p-6 rounded-full transition-all duration-300 shadow-xl ${isActive
                            ? "bg-rose-500 hover:bg-rose-600 shadow-rose-500/30"
                            : "bg-gradient-to-br from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 shadow-emerald-500/30"
                            }`}
                    >
                        {isActive ? (
                            <Pause className="w-8 h-8 text-white" />
                        ) : (
                            <Play className="w-8 h-8 text-white ml-1" />
                        )}
                    </button>

                    <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                        {isMuted ? (
                            <VolumeX className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                        ) : (
                            <Volume2 className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                        )}
                    </button>
                </div>

                {/* Session Selection */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {sessions.map((session) => (
                        <button
                            key={session.id}
                            onClick={() => setSelectedSession(session)}
                            className={`p-4 rounded-2xl border-2 transition-all duration-300 text-left ${selectedSession.id === session.id
                                ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10"
                                : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/50"
                                }`}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                {session.type === "breathing" ? (
                                    <Wind className="w-4 h-4 text-emerald-500" />
                                ) : session.type === "guided" ? (
                                    <Heart className="w-4 h-4 text-rose-500" />
                                ) : (
                                    <Sparkles className="w-4 h-4 text-violet-500" />
                                )}
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                    {session.duration} min
                                </span>
                            </div>
                            <h3 className="font-semibold text-slate-800 dark:text-white text-sm">
                                {session.title}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                                {session.description}
                            </p>
                        </button>
                    ))}
                </div>
            </main>
        </div>
    );
}
