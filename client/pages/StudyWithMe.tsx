import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/utils/authService';
import { X, Sun, Moon, Play, Pause, Flame, Target, BarChart3, Info } from 'lucide-react';

interface Session {
    start: Date;
    end: Date;
    duration: number;
}

interface SessionType {
    duration: number;
    break: number;
    label: string;
}

export default function StudyWithMe() {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [selectedSession, setSelectedSession] = useState<SessionType | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [isBreak, setIsBreak] = useState(false);
    const [completedSessions, setCompletedSessions] = useState<Session[]>([]);
    const [currentSessionStart, setCurrentSessionStart] = useState<Date | null>(null);
    const [isDark, setIsDark] = useState(true);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const [customMinutes, setCustomMinutes] = useState(25);
    const [activePreset, setActivePreset] = useState<number | null>(30);

    const sessionTypes: SessionType[] = [
        { duration: 25, break: 5, label: '25' },
        { duration: 30, break: 5, label: '30' },
        { duration: 45, break: 10, label: '45' },
        { duration: 60, break: 10, label: '60' },
        { duration: 90, break: 15, label: '90' },
    ];

    useEffect(() => {
        const currentUser = authService.getCurrentUser();
        if (!currentUser) {
            navigate('/login');
            return;
        }
        setUser(currentUser);
    }, [navigate]);

    useEffect(() => {
        if (isRunning && timeLeft > 0) {
            intervalRef.current = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && isRunning) {
            handleSessionComplete();
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isRunning, timeLeft]);

    // Keyboard shortcut for space to pause/resume
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && selectedSession) {
                e.preventDefault();
                toggleTimer();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedSession, isRunning]);

    const handleSessionComplete = () => {
        setIsRunning(false);

        if (!isBreak && currentSessionStart && selectedSession) {
            const sessionEnd = new Date();
            setCompletedSessions(prev => [...prev, {
                start: currentSessionStart,
                end: sessionEnd,
                duration: selectedSession.duration
            }]);
            setCurrentSessionStart(null);

            // Start break
            setIsBreak(true);
            setTimeLeft(selectedSession.break * 60);
            setIsRunning(true);
        } else if (isBreak && selectedSession) {
            setIsBreak(false);
            setTimeLeft(selectedSession.duration * 60);
        }
    };

    const startSession = (session: SessionType) => {
        setSelectedSession(session);
        setTimeLeft(session.duration * 60);
        setIsBreak(false);
        setIsRunning(false);
        setActivePreset(session.duration);
    };

    const startCustomSession = () => {
        if (customMinutes > 0) {
            startSession({
                duration: customMinutes,
                break: Math.max(5, Math.floor(customMinutes / 5)),
                label: `${customMinutes}`
            });
        }
    };

    const toggleTimer = () => {
        if (!isRunning && !currentSessionStart && !isBreak) {
            setCurrentSessionStart(new Date());
        }
        setIsRunning(!isRunning);
    };

    const finishSession = () => {
        setSelectedSession(null);
        setTimeLeft(0);
        setIsRunning(false);
        setIsBreak(false);
        setCurrentSessionStart(null);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getTotalStudyTime = () => {
        const totalMinutes = completedSessions.reduce((acc, session) => acc + session.duration, 0);
        return {
            hours: Math.floor(totalMinutes / 60),
            mins: totalMinutes % 60,
            total: totalMinutes
        };
    };

    if (!user) return null;

    const bgClass = isDark ? 'bg-[#050505]' : 'bg-gray-100';
    const textClass = isDark ? 'text-gray-200' : 'text-gray-800';
    const cardBgClass = isDark ? 'bg-[#1c1c1e]' : 'bg-white';
    const borderClass = isDark ? 'border-[#27272a]' : 'border-gray-200';
    const mutedTextClass = isDark ? 'text-gray-400' : 'text-gray-500';
    const inputBgClass = isDark ? 'bg-[#2a2a2d]' : 'bg-gray-50';

    // Active Timer Screen
    if (selectedSession) {
        const progressPercent = ((selectedSession.duration * 60 - timeLeft) / (selectedSession.duration * 60)) * 100;

        return (
            <div className={`min-h-screen ${bgClass} ${textClass} transition-colors duration-300 p-4 md:p-8`}>
                {/* Header */}
                <header className="w-full max-w-7xl mx-auto flex justify-between items-center mb-8">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={finishSession}
                            className={`p-2 rounded hover:bg-gray-800/50 transition-colors`}
                        >
                            <X className={mutedTextClass} size={24} />
                        </button>
                        <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {isBreak ? 'Break Time ☕' : 'Focus Mode 🎯'}
                        </h1>
                    </div>
                    <button
                        onClick={() => setIsDark(!isDark)}
                        className={`p-2 rounded-full hover:bg-gray-800/50 transition-colors`}
                    >
                        {isDark ? <Sun className="text-yellow-400" size={24} /> : <Moon className="text-gray-500" size={24} />}
                    </button>
                </header>

                {/* Timer Display */}
                <div className="max-w-2xl mx-auto text-center">
                    {/* Progress Ring */}
                    <div className="relative w-64 h-64 mx-auto mb-8">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            <circle
                                cx="50" cy="50" r="45"
                                fill="none"
                                stroke={isDark ? '#27272a' : '#e5e7eb'}
                                strokeWidth="4"
                            />
                            <circle
                                cx="50" cy="50" r="45"
                                fill="none"
                                stroke={isBreak ? '#22c55e' : '#06b6d4'}
                                strokeWidth="4"
                                strokeLinecap="round"
                                strokeDasharray={`${2 * Math.PI * 45}`}
                                strokeDashoffset={`${2 * Math.PI * 45 * (1 - progressPercent / 100)}`}
                                className="transition-all duration-1000"
                                style={{ filter: `drop-shadow(0 0 10px ${isBreak ? 'rgba(34, 197, 94, 0.5)' : 'rgba(6, 182, 212, 0.5)'})` }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <div className={`text-5xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {formatTime(timeLeft)}
                            </div>
                            <div className={`text-sm ${mutedTextClass} mt-2`}>
                                {isBreak ? 'break remaining' : 'time remaining'}
                            </div>
                        </div>
                    </div>

                    {/* Control Buttons */}
                    <div className="flex items-center justify-center gap-4">
                        <button
                            onClick={toggleTimer}
                            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${isBreak
                                ? 'bg-green-500 hover:bg-green-400 shadow-green-500/30'
                                : 'bg-cyan-500 hover:bg-cyan-400 shadow-cyan-500/30'
                                } text-white`}
                        >
                            {isRunning ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
                        </button>
                        <button
                            onClick={finishSession}
                            className="px-6 py-3 bg-red-500 hover:bg-red-400 text-white font-semibold rounded-lg transition-all"
                        >
                            End Session
                        </button>
                    </div>

                    {/* Session Info */}
                    <div className={`mt-8 ${cardBgClass} border ${borderClass} rounded-lg p-4`}>
                        <div className="flex justify-between text-sm">
                            <span className={mutedTextClass}>Session</span>
                            <span className="font-medium">{selectedSession.duration} min focus / {selectedSession.break} min break</span>
                        </div>
                        <div className="flex justify-between text-sm mt-2">
                            <span className={mutedTextClass}>Sessions Today</span>
                            <span className="font-medium text-cyan-500">{completedSessions.length}</span>
                        </div>
                    </div>
                </div>

                {/* Pro Tip */}
                <footer className="max-w-7xl mx-auto mt-12 text-center">
                    <p className={`text-xs ${mutedTextClass}`}>
                        Pro Tip: Press <span className={`font-mono ${inputBgClass} px-1 rounded`}>Space</span> to pause/resume timer.
                    </p>
                </footer>
            </div>
        );
    }

    // Session Selection Screen (Dashboard)
    return (
        <div className={`min-h-screen ${bgClass} ${textClass} transition-colors duration-300 p-6 md:p-12`}>
            {/* Header */}
            <header className="w-full max-w-7xl mx-auto flex justify-between items-center mb-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className={`p-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors`}
                    >
                        <X className={mutedTextClass} size={28} />
                    </button>
                    <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} flex items-center gap-3`}>
                        Study With Me <span className="text-3xl">📚</span>
                    </h1>
                </div>
                <button
                    onClick={() => setIsDark(!isDark)}
                    className={`p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors`}
                >
                    {isDark ? <Sun className="text-yellow-400" size={24} /> : <Moon className="text-gray-500" size={24} />}
                </button>
            </header>

            {/* Main Grid */}
            <main className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column - Session Duration */}
                <section className="lg:col-span-4 flex flex-col gap-8">
                    <div className={`${cardBgClass} border ${borderClass} p-8 rounded-xl shadow-sm flex-1 flex flex-col`}>
                        <div className="mb-8">
                            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Session Duration</h2>
                            <p className={`text-base ${mutedTextClass} mt-1`}>Select your focus interval</p>
                        </div>

                        {/* Preset Grid */}
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            {sessionTypes.slice(0, 4).map((session) => (
                                <button
                                    key={session.duration}
                                    onClick={() => startSession(session)}
                                    className={`group relative flex flex-col items-center justify-center py-6 px-4 rounded-xl transition-all duration-200 ${activePreset === session.duration
                                        ? 'bg-cyan-500 border border-cyan-500 shadow-lg shadow-cyan-500/20'
                                        : `${inputBgClass} border border-transparent hover:border-cyan-500/50`
                                        }`}
                                >
                                    <span className={`text-4xl font-bold ${activePreset === session.duration ? 'text-white' : isDark ? 'text-white' : 'text-gray-800'
                                        } group-hover:text-cyan-400 transition-colors`}>
                                        {session.duration}
                                    </span>
                                    <span className={`text-sm uppercase tracking-wider font-medium mt-1 ${activePreset === session.duration ? 'text-cyan-100' : mutedTextClass
                                        }`}>
                                        Minutes
                                    </span>
                                    <span className={`absolute bottom-2 text-xs ${activePreset === session.duration ? 'text-cyan-50 opacity-80' : 'text-gray-400 opacity-0 group-hover:opacity-100'
                                        } transition-opacity`}>
                                        {session.break}min break
                                    </span>
                                </button>
                            ))}
                            {/* 90 min spanning 2 columns */}
                            <button
                                onClick={() => startSession(sessionTypes[4])}
                                className={`group relative flex flex-col items-center justify-center py-5 px-4 rounded-xl transition-all duration-200 col-span-2 ${activePreset === 90
                                    ? 'bg-cyan-500 border border-cyan-500 shadow-lg shadow-cyan-500/20'
                                    : `${inputBgClass} border border-transparent hover:border-cyan-500/50`
                                    }`}
                            >
                                <div className="flex flex-row items-baseline gap-3">
                                    <span className={`text-4xl font-bold ${activePreset === 90 ? 'text-white' : isDark ? 'text-white' : 'text-gray-800'
                                        } group-hover:text-cyan-400 transition-colors`}>
                                        90
                                    </span>
                                    <span className={`text-sm uppercase tracking-wider font-medium ${activePreset === 90 ? 'text-cyan-100' : mutedTextClass
                                        }`}>
                                        Minutes
                                    </span>
                                </div>
                                <span className={`text-xs mt-1 ${activePreset === 90 ? 'text-cyan-50' : 'text-gray-400'}`}>
                                    15min break
                                </span>
                            </button>
                        </div>

                        {/* Custom Timer */}
                        <div className={`mt-auto pt-8 border-t ${borderClass}`}>
                            <label className={`block text-sm font-semibold uppercase ${mutedTextClass} mb-3`}>Custom Timer</label>
                            <div className="flex gap-3">
                                <div className="relative flex-1">
                                    <input
                                        type="number"
                                        min="1"
                                        max="180"
                                        value={customMinutes}
                                        onChange={(e) => setCustomMinutes(parseInt(e.target.value) || 0)}
                                        className={`w-full ${inputBgClass} border ${borderClass} ${isDark ? 'text-white' : 'text-gray-900'} text-lg rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block p-4 placeholder-gray-400`}
                                        placeholder="25"
                                    />
                                    <span className="absolute right-4 top-4 text-sm text-gray-400">min</span>
                                </div>
                                <button
                                    onClick={startCustomSession}
                                    className="bg-gray-800 hover:bg-gray-700 text-white rounded-lg p-4 transition-colors"
                                >
                                    <Play size={24} />
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Right Column - Focus Analytics */}
                <section className="lg:col-span-8 flex flex-col gap-8">
                    <div className="flex justify-between items-end">
                        <div>
                            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Focus Analytics</h2>
                            <p className={`text-base ${mutedTextClass} mt-1`}>Your productivity insights</p>
                        </div>
                        <div className={`${inputBgClass} ${isDark ? 'text-gray-300' : 'text-gray-700'} text-sm font-medium px-4 py-2 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors`}>
                            This Week
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                        {/* Daily Overview Chart */}
                        <div className={`md:col-span-8 ${cardBgClass} border ${borderClass} p-8 rounded-xl shadow-sm flex flex-col`}>
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h3 className={`text-base font-semibold ${mutedTextClass} uppercase tracking-wide`}>Daily Overview</h3>
                                    <div className={`text-5xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mt-2`}>
                                        {getTotalStudyTime().hours}h {getTotalStudyTime().mins}m
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 text-xs font-semibold tracking-wider">
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-full bg-cyan-500"></span>
                                        <span className={mutedTextClass}>FOCUS</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`w-3 h-3 rounded-full ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`}></span>
                                        <span className={mutedTextClass}>BREAK</span>
                                    </div>
                                </div>
                            </div>

                            {/* Bar Chart */}
                            <div className="flex-1 flex items-end justify-between gap-3 mt-4 h-48">
                                {[30, 45, 65, 25, 10, 50, 35].map((height, i) => (
                                    <div key={i} className="flex flex-col items-center gap-3 group w-full">
                                        <div className={`w-full ${inputBgClass} rounded-t relative h-48 flex items-end overflow-hidden group-hover:bg-opacity-80 transition-colors`}>
                                            <div
                                                className={`w-full bg-cyan-500 rounded-t transition-all ${i === 2 ? 'shadow-[0_0_10px_rgba(6,182,212,0.4)]' : 'opacity-40'}`}
                                                style={{ height: `${height}%` }}
                                            />
                                        </div>
                                        <span className={`text-sm font-medium ${i === 2 ? 'text-cyan-500 font-bold' : 'text-gray-400'}`}>
                                            {12 + i}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Stats Cards */}
                        <div className="md:col-span-4 flex flex-col gap-5">
                            {/* Focus Streak */}
                            <div className={`${cardBgClass} border ${borderClass} p-5 rounded-xl shadow-sm hover:border-gray-600 transition-colors flex items-center gap-5`}>
                                <div className={`p-4 rounded-lg ${isDark ? 'bg-indigo-900/20' : 'bg-indigo-50'} text-indigo-500`}>
                                    <Flame size={28} />
                                </div>
                                <div>
                                    <h4 className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Focus Streak</h4>
                                    <p className={`text-sm ${mutedTextClass} mt-1`}>
                                        Current: <span className="text-indigo-500 font-medium">{completedSessions.length} sessions</span>
                                    </p>
                                </div>
                            </div>

                            {/* Daily Goal */}
                            <div className={`${cardBgClass} border ${borderClass} p-5 rounded-xl shadow-sm hover:border-gray-600 transition-colors flex items-center gap-5`}>
                                <div className={`p-4 rounded-lg ${isDark ? 'bg-rose-900/20' : 'bg-rose-50'} text-rose-500`}>
                                    <Target size={28} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Daily Goal</h4>
                                        <span className="text-xs text-gray-400">{getTotalStudyTime().total}/240 min</span>
                                    </div>
                                    <div className={`w-full ${isDark ? 'bg-gray-700' : 'bg-gray-100'} h-2 rounded-full overflow-hidden`}>
                                        <div
                                            className="bg-rose-500 h-full rounded-full transition-all"
                                            style={{ width: `${Math.min((getTotalStudyTime().total / 240) * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Total Minutes */}
                            <div className={`${cardBgClass} border ${borderClass} p-5 rounded-xl shadow-sm hover:border-gray-600 transition-colors flex items-center gap-5`}>
                                <div className={`p-4 rounded-lg ${isDark ? 'bg-emerald-900/20' : 'bg-emerald-50'} text-emerald-500`}>
                                    <BarChart3 size={28} />
                                </div>
                                <div>
                                    <h4 className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Total Minutes</h4>
                                    <p className={`text-sm ${mutedTextClass} mt-1`}>
                                        <span className="text-emerald-500 font-medium">{getTotalStudyTime().total} minutes</span> focused
                                    </p>
                                </div>
                            </div>

                            {/* Session Summary */}
                            <div className={`${cardBgClass} border ${borderClass} p-5 rounded-xl shadow-sm flex-1 flex flex-col justify-center`}>
                                <h4 className={`text-sm font-bold ${mutedTextClass} uppercase tracking-wide mb-3`}>Session Summary</h4>
                                {completedSessions.length > 0 ? (
                                    <div className="space-y-3">
                                        {completedSessions.slice(-3).map((session, i) => (
                                            <div key={i} className="flex justify-between text-base">
                                                <span className={mutedTextClass}>Session {completedSessions.length - 2 + i}</span>
                                                <span className="text-cyan-500 font-medium">{session.duration} min</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className={`flex items-center gap-3 text-base ${mutedTextClass} italic`}>
                                        <Info size={22} />
                                        No recent sessions
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="w-full max-w-7xl mx-auto mt-10 text-center">
                <p className={`text-sm ${mutedTextClass}`}>
                    Pro Tip: Use <span className={`font-mono ${inputBgClass} px-2 py-1 rounded`}>Space</span> to pause/resume timer.
                </p>
            </footer>
        </div>
    );
}
