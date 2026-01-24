import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '@/utils/authService';
import { useTheme } from '@/contexts/ThemeContext';

export default function StudyWithMe() {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const [user, setUser] = useState<any>(null);
    const [mode, setMode] = useState<'work' | 'short' | 'long'>('work');
    const [customMins, setCustomMins] = useState(25);
    const [timeLeft, setTimeLeft] = useState(1500);
    const [isRunning, setIsRunning] = useState(false);
    const [tasks, setTasks] = useState<{ id: string, text: string, done: boolean }[]>([]);
    const [taskText, setTaskText] = useState('');
    const [showTasks, setShowTasks] = useState(false);
    const timerRef = useRef<any>(null);
    const presets = [25, 30, 45, 60, 90];

    useEffect(() => {
        authService.getCurrentUser().then(d => d?.user && setUser(d.user)).catch(() => navigate('/login'));
    }, [navigate]);

    useEffect(() => {
        if (isRunning && timeLeft > 0) {
            timerRef.current = setInterval(() => setTimeLeft(t => t - 1), 1000);
        } else if (timeLeft === 0) {
            setIsRunning(false);
            alert('Session complete!');
        }
        return () => clearInterval(timerRef.current);
    }, [isRunning, timeLeft]);

    const changeMode = (m: 'work' | 'short' | 'long', mins: number) => {
        setMode(m);
        setTimeLeft(mins * 60);
        setIsRunning(false);
    };

    const setPreset = (mins: number) => {
        setCustomMins(mins);
        if (mode === 'work') { setTimeLeft(mins * 60); setIsRunning(false); }
    };

    const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
    const total = mode === 'work' ? customMins * 60 : mode === 'short' ? 300 : 900;
    const pct = Math.min(((total - timeLeft) / total) * 100, 100);

    const addTask = () => {
        if (taskText.trim()) {
            setTasks([...tasks, { id: Date.now().toString(), text: taskText.trim(), done: false }]);
            setTaskText('');
        }
    };

    const isDark = theme === 'dark';

    return (
        <div className={`min-h-screen flex ${isDark ? 'bg-[#181920] text-gray-300' : 'bg-gray-50 text-gray-900'}`} style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* Sidebar */}
            <aside className={`w-64 p-8 border-r ${isDark ? 'border-white/5' : 'border-gray-200'}`}>
                <nav className="flex flex-col gap-5 mt-8">
                    <button onClick={toggleTheme} className={`text-left text-sm hover:text-[#f25f29] ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {isDark ? 'Light Mode' : 'Dark Mode'}
                    </button>
                    <button onClick={() => setShowTasks(!showTasks)} className={`text-left text-sm hover:text-[#f25f29] ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Add task
                    </button>
                    <Link to="/" className={`text-sm hover:text-[#f25f29] ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Back to Home
                    </Link>
                </nav>

                {/* Presets */}
                <div className="mt-10">
                    <p className={`text-xs uppercase mb-3 font-bold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Presets</p>
                    <div className="flex flex-wrap gap-2">
                        {presets.map(m => (
                            <button key={m} onClick={() => setPreset(m)} className={`w-10 h-8 rounded-lg text-xs font-bold ${customMins === m ? 'bg-[#f25f29] text-white' : isDark ? 'bg-[#2b2e36] text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                                {m}
                            </button>
                        ))}
                    </div>
                </div>
            </aside>

            {/* Main */}
            <main className="flex-1 flex flex-col items-center justify-center p-8">
                {/* Timer Card */}
                <div className={`w-full max-w-lg rounded-3xl p-10 flex flex-col items-center ${isDark ? 'bg-[#2b2e36]' : 'bg-white shadow-xl'}`} style={{ boxShadow: isDark ? '0 25px 60px rgba(0,0,0,0.5)' : undefined }}>
                    {/* Tabs */}
                    <div className={`flex p-1.5 rounded-full mb-10 ${isDark ? 'bg-[#181920]' : 'bg-gray-100'}`}>
                        <button onClick={() => changeMode('work', customMins)} className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${mode === 'work' ? 'bg-[#f25f29] text-white shadow' : 'text-gray-500'}`}>Pomodoro</button>
                        <button onClick={() => changeMode('short', 5)} className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${mode === 'short' ? 'bg-[#f25f29] text-white shadow' : 'text-gray-500'}`}>Short break</button>
                        <button onClick={() => changeMode('long', 15)} className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${mode === 'long' ? 'bg-[#f25f29] text-white shadow' : 'text-gray-500'}`}>Long break</button>
                    </div>

                    {/* Timer Display */}
                    <div className={`text-[88px] font-black tracking-tight mb-8 ${isDark ? 'text-[#fdf6e3]' : 'text-gray-800'}`}>
                        {fmt(timeLeft)}
                    </div>

                    {/* Start Button */}
                    <button
                        onClick={() => setIsRunning(!isRunning)}
                        className="px-16 py-4 rounded-2xl text-xl font-bold text-white transition-all active:translate-y-1"
                        style={{
                            background: 'linear-gradient(to bottom, #f25f29, #e04e1b)',
                            boxShadow: '0 4px 0 #ab3d16'
                        }}
                    >
                        {isRunning ? 'PAUSE' : 'START'}
                    </button>
                </div>

                {/* Snail Progress */}
                <div className="w-full max-w-2xl mt-16 relative">
                    <p className={`text-center mb-5 font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {isRunning ? "Time to be productive. Let's start!" : "Ready to focus?"}
                    </p>
                    <div className={`h-3 w-full rounded-full overflow-hidden ${isDark ? 'bg-[#2b2e36]' : 'bg-gray-200'}`}>
                        <div className="h-full rounded-full bg-[#f25f29] transition-all duration-1000" style={{ width: `${pct}%` }}></div>
                    </div>
                    <div className="absolute bottom-0 transition-all duration-1000" style={{ left: `${pct}%`, transform: 'translateX(-100%) translateY(2px)' }}>
                        <span className="text-5xl block transform -scale-x-100">🐌</span>
                    </div>
                </div>
            </main>

            {/* Task Panel */}
            {showTasks && (
                <aside className={`w-80 border-l p-6 ${isDark ? 'border-white/5 bg-[#1e2028]' : 'border-gray-200 bg-white'}`}>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="font-bold text-lg">Tasks</h2>
                        <button onClick={() => setShowTasks(false)} className="text-gray-500 hover:text-[#f25f29]">✕</button>
                    </div>
                    <div className="flex gap-2 mb-6">
                        <input
                            value={taskText}
                            onChange={e => setTaskText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addTask()}
                            placeholder="Add task..."
                            className={`flex-1 px-3 py-2 rounded-lg text-sm outline-none ${isDark ? 'bg-[#2b2e36] text-white placeholder-gray-500' : 'bg-gray-100 text-gray-900'}`}
                        />
                        <button onClick={addTask} className="px-4 py-2 bg-[#f25f29] text-white rounded-lg font-bold">+</button>
                    </div>
                    <div className="space-y-2">
                        {tasks.map(t => (
                            <div key={t.id} className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? 'bg-[#2b2e36]' : 'bg-gray-50'}`}>
                                <button
                                    onClick={() => setTasks(tasks.map(x => x.id === t.id ? { ...x, done: !x.done } : x))}
                                    className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs ${t.done ? 'bg-[#f25f29] border-[#f25f29] text-white' : 'border-gray-500'}`}
                                >
                                    {t.done && '✓'}
                                </button>
                                <span className={`flex-1 text-sm ${t.done ? 'line-through opacity-50' : ''}`}>{t.text}</span>
                                <button onClick={() => setTasks(tasks.filter(x => x.id !== t.id))} className="text-gray-500 hover:text-red-500">×</button>
                            </div>
                        ))}
                        {tasks.length === 0 && <p className="text-center text-gray-500 text-sm py-4">No tasks yet</p>}
                    </div>
                </aside>
            )}
        </div>
    );
}
