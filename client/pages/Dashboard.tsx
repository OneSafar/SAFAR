import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { authService } from "@/utils/authService";
import { dataService } from "@/utils/dataService";
import {
    Heart,
    RotateCw,
    Zap,
    Quote,
    Activity,
    ArrowRight,
    Bell,
    Menu,
    ExternalLink,
    Play
} from "lucide-react";
import youtubeImg from "@/assets/youtube-thumbnail.png";
import courseImg from "@/assets/course-thumbnail.png";
import WelcomeDialog from "@/components/WelcomeDialog";

const getMoodEmoji = (mood: string): string => {
    const moodEmojis: Record<string, string> = {
        peaceful: "😌",
        happy: "😊",
        energized: "⚡",
        anxious: "😰",
        stressed: "😤",
        sad: "😢",
        numb: "😶",
    };
    return moodEmojis[mood.toLowerCase()] || "😊";
};

export default function Dashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [streaks, setStreaks] = useState({ checkInStreak: 0, loginStreak: 0, goalCompletionStreak: 0 });
    const [todayMood, setTodayMood] = useState<{ mood: string; intensity: number } | null>(null);
    const [goals, setGoals] = useState<{ total: number; completed: number }>({ total: 0, completed: 0 });

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const data = await authService.getCurrentUser();
                if (!data || !data.user) {
                    navigate("/login");
                    return;
                }
                setUser(data.user);
                // Fetch streaks
                try {
                    const streakData = await dataService.getStreaks();
                    setStreaks(streakData);
                } catch (e) { console.error('Failed to fetch streaks', e); }
                // Fetch today's mood
                try {
                    const moods = await dataService.getMoods();
                    const today = new Date().toISOString().split('T')[0];
                    const todaysMood = moods.find(m => m.timestamp?.startsWith(today));
                    if (todaysMood) setTodayMood({ mood: todaysMood.mood, intensity: todaysMood.intensity });
                } catch (e) { console.error('Failed to fetch moods', e); }
                // Fetch goals
                try {
                    const goalsData = await dataService.getGoals();
                    const total = goalsData.length;
                    const completed = goalsData.filter((g: any) => g.completed).length;
                    setGoals({ total, completed });
                } catch (e) { console.error('Failed to fetch goals', e); }
            } catch (error) {
                navigate("/login");
            }
        };
        checkAuth();
    }, [navigate]);

    const [showWelcome, setShowWelcome] = useState(false);

    useEffect(() => {
        const shouldShow = sessionStorage.getItem("showWelcome");
        if (shouldShow === "true") {
            setShowWelcome(true);
        }
    }, []);

    const handleCloseWelcome = () => {
        setShowWelcome(false);
        sessionStorage.removeItem("showWelcome");
    };

    if (!user) return null;

    return (
        <MainLayout userName={user.name} userAvatar={user.avatar}>
            <div className="flex-1 h-full overflow-y-auto bg-background font-['Plus_Jakarta_Sans'] text-foreground relative selection:bg-primary selection:text-primary-foreground transition-colors duration-300">

                {/* Blob Background - Theme Aware */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-100 dark:opacity-100"
                    style={{
                        background: `
              radial-gradient(circle at 15% 50%, hsl(var(--secondary) / 0.15) 0%, transparent 40%),
              radial-gradient(circle at 85% 30%, hsl(var(--primary) / 0.1) 0%, transparent 45%),
              radial-gradient(circle at 50% 80%, hsl(var(--secondary) / 0.1) 0%, transparent 40%)
            `,
                        backgroundAttachment: 'fixed'
                    }}
                ></div>

                {/* Content Wrapper */}
                <div className="relative z-10 p-8">
                    <header className="flex items-center justify-between mb-8">
                        <div>
                            <button className="lg:hidden p-2 text-muted-foreground hover:text-foreground mb-4">
                                <Menu />
                            </button>
                            <h1 className="text-3xl font-bold text-foreground mb-1">Welcome Back, {user.name}</h1>
                            <p className="text-muted-foreground text-sm">
                                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                            </p>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="relative">
                                <Bell className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors w-6 h-6" />
                                <span className="absolute top-0 right-0 w-2 h-2 bg-secondary rounded-full border border-background"></span>
                            </div>
                        </div>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">

                        {/* Today's Mood */}
                        <div className="lg:col-span-7 glass-high rounded-2xl p-6 relative overflow-hidden group hover:shadow-xl transition-all duration-300">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                            <div className="relative z-10 h-full flex flex-col">
                                <div className="flex items-center gap-2 mb-2">
                                    <Heart className="text-orange-500 w-5 h-5" />
                                    <h3 className="font-semibold text-lg text-foreground">Today's Mood</h3>
                                </div>
                                <p className="text-muted-foreground text-sm mb-8">How are you feeling right now?</p>
                                <div className="flex-1 flex flex-col items-center justify-center text-center">
                                    {todayMood ? (
                                        <>
                                            <p className="text-4xl mb-2">{getMoodEmoji(todayMood.mood)}</p>
                                            <p className="text-foreground font-semibold text-lg capitalize mb-1">{todayMood.mood}</p>
                                            <p className="text-muted-foreground text-sm">Intensity: {todayMood.intensity}/10</p>
                                            <button
                                                onClick={() => navigate('/check-in')}
                                                className="mt-4 text-primary text-sm hover:underline flex items-center gap-1"
                                            >
                                                Update Check-In <ArrowRight className="w-3 h-3" />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-muted-foreground italic mb-6 text-lg font-light">No check-in yet today</p>
                                            <button
                                                onClick={() => navigate('/check-in')}
                                                className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white px-8 py-3 rounded-full font-medium transition-all shadow-lg hover:shadow-orange-500/25 flex items-center gap-2"
                                            >
                                                Check In Now
                                                <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Current Streaks */}
                        <div className="lg:col-span-5 glass-high rounded-2xl p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none"></div>
                            <div className="flex items-center gap-2 mb-6 relative z-10">
                                <RotateCw className="text-primary w-5 h-5" />
                                <h3 className="font-semibold text-lg text-foreground">
                                    Current Streaks <span className="text-orange-500 text-sm align-top">🔥</span>
                                </h3>
                            </div>
                            <div className="space-y-4 relative z-10">
                                {[
                                    { label: "Check-In Streak", value: String(streaks.checkInStreak) },
                                    { label: "Login Streak", value: String(streaks.loginStreak) },
                                    { label: "Goal Completion", value: String(streaks.goalCompletionStreak) }
                                ].map((streak, i) => (
                                    <div key={i} className="bg-muted/50 border border-border rounded-xl p-4 flex justify-between items-center hover:bg-muted transition-colors">
                                        <span className="text-foreground font-medium text-sm">{streak.label}</span>
                                        <span className="text-primary font-bold font-mono">{streak.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Today's Goals */}
                        <div className="lg:col-span-5 glass-high rounded-2xl p-6 flex flex-col relative">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-2">
                                    <Zap className="text-blue-500 w-5 h-5" />
                                    <div>
                                        <h3 className="font-semibold text-lg text-foreground">Today's Goals</h3>
                                        <p className="text-xs text-blue-500">{goals.total} goals total</p>
                                    </div>
                                </div>
                                <span className="bg-blue-500/20 text-blue-600 px-2 py-1 rounded text-xs font-bold border border-blue-500/30">
                                    {goals.total > 0 ? Math.round((goals.completed / goals.total) * 100) : 0}%
                                </span>
                            </div>
                            <div className="flex-1 flex flex-col items-center justify-center my-6">
                                <div className="text-4xl font-bold text-foreground mb-2">
                                    {goals.completed}<span className="text-muted-foreground text-2xl">/{goals.total}</span>
                                </div>
                                <p className="text-xs tracking-widest text-muted-foreground uppercase">Goals Completed</p>
                                <div className="w-full h-1 bg-muted rounded-full mt-6 overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-500"
                                        style={{ width: goals.total > 0 ? `${(goals.completed / goals.total) * 100}%` : '0%' }}
                                    ></div>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate('/goals')}
                                className="w-full mt-auto bg-muted hover:bg-muted/80 text-blue-600 border border-blue-500/20 py-3 rounded-xl text-sm font-medium transition-colors flex justify-center items-center gap-2 group"
                            >
                                View Goals
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>

                        {/* Daily Inspiration */}
                        <div className="lg:col-span-7 glass-high rounded-2xl p-8 flex flex-col justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-secondary/10 pointer-events-none"></div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-4 text-purple-500">
                                    <Quote className="w-5 h-5" />
                                    <h3 className="font-semibold">Daily Inspiration</h3>
                                </div>
                                <blockquote className="text-2xl font-serif text-foreground/90 leading-relaxed italic text-center px-4">
                                    "Every effort counts. Be proud of yourself."
                                </blockquote>
                            </div>
                        </div>

                        {/* Weekly Mood Trend */}
                        <div className="lg:col-span-12 glass-high rounded-2xl p-6 relative">
                            <div className="flex items-center gap-2 mb-2">
                                <Activity className="text-primary w-5 h-5" />
                                <h3 className="font-semibold text-lg text-foreground">Weekly Mood Trend</h3>
                            </div>
                            <p className="text-muted-foreground text-sm mb-6">Your emotional well-being over the week</p>
                            <div className="w-full">
                                <svg className="w-full h-auto max-h-[400px]" viewBox="0 0 1000 300">
                                    <defs>
                                        <linearGradient id="gradientFill" x1="0" x2="0" y1="0" y2="1">
                                            <stop offset="0%" stopColor="hsl(168, 76%, 50%)" stopOpacity="0.3"></stop>
                                            <stop offset="100%" stopColor="hsl(168, 76%, 50%)" stopOpacity="0.0"></stop>
                                        </linearGradient>
                                    </defs>
                                    <line stroke="hsl(var(--border))" strokeDasharray="4" x1="40" x2="1000" y1="50" y2="50"></line>
                                    <line stroke="hsl(var(--border))" strokeDasharray="4" x1="40" x2="1000" y1="110" y2="110"></line>
                                    <line stroke="hsl(var(--border))" strokeDasharray="4" x1="40" x2="1000" y1="170" y2="170"></line>
                                    <line stroke="hsl(var(--border))" strokeDasharray="4" x1="40" x2="1000" y1="230" y2="230"></line>
                                    <text fill="hsl(var(--muted-foreground))" fontSize="10" textAnchor="end" x="30" y="55">10</text>
                                    <text fill="hsl(var(--muted-foreground))" fontSize="10" textAnchor="end" x="30" y="115">8</text>
                                    <text fill="hsl(var(--muted-foreground))" fontSize="10" textAnchor="end" x="30" y="175">6</text>
                                    <text fill="hsl(var(--muted-foreground))" fontSize="10" textAnchor="end" x="30" y="235">4</text>
                                    <text fill="hsl(var(--muted-foreground))" fontSize="10" textAnchor="end" x="30" y="295">2</text>
                                    <text fill="hsl(var(--muted-foreground))" fontSize="10" textAnchor="middle" x="50" y="290">Mon</text>
                                    <text fill="hsl(var(--muted-foreground))" fontSize="10" textAnchor="middle" x="210" y="290">Tue</text>
                                    <text fill="hsl(var(--muted-foreground))" fontSize="10" textAnchor="middle" x="370" y="290">Wed</text>
                                    <text fill="hsl(var(--muted-foreground))" fontSize="10" textAnchor="middle" x="530" y="290">Thu</text>
                                    <text fill="hsl(var(--muted-foreground))" fontSize="10" textAnchor="middle" x="690" y="290">Fri</text>
                                    <text fill="hsl(var(--muted-foreground))" fontSize="10" textAnchor="middle" x="850" y="290">Sat</text>
                                    <text fill="hsl(var(--muted-foreground))" fontSize="10" textAnchor="middle" x="980" y="290">Sun</text>
                                    <path d="M 40,230 C 150,210 250,190 350,220 S 550,160 650,150 S 850,180 1000,190 L 1000,300 L 40,300 Z" fill="url(#gradientFill)"></path>
                                    <path d="M 40,230 C 150,210 250,190 350,220 S 550,160 650,150 S 850,180 1000,190" fill="none" filter="drop-shadow(0 0 4px hsl(168, 76%, 50%, 0.5))" stroke="hsl(168, 76%, 50%)" strokeWidth="3"></path>
                                    <circle cx="350" cy="220" fill="hsl(var(--card))" r="4" stroke="hsl(168, 76%, 50%)" strokeWidth="2"></circle>
                                    <circle cx="650" cy="150" fill="hsl(var(--card))" r="4" stroke="hsl(168, 76%, 50%)" strokeWidth="2"></circle>
                                </svg>
                            </div>
                        </div>

                        {/* External Sources Section */}
                        <div className="lg:col-span-12 glass-high rounded-2xl p-6 relative">
                            <div className="flex items-center gap-2 mb-6">
                                <ExternalLink className="text-primary w-5 h-5" />
                                <h3 className="font-semibold text-lg text-foreground">External Sources</h3>
                            </div>
                            <p className="text-muted-foreground text-sm mb-6">Helpful resources for your well-being journey</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* YouTube Channel */}
                                <div className="bg-muted/50 border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-all group">
                                    <a
                                        href="https://youtube.com/@safarparmar?si=Mvs6U5JaSGojIzSM"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block"
                                    >
                                        <div className="relative aspect-video bg-gradient-to-br from-red-900/20 to-red-600/20 flex items-center justify-center overflow-hidden">
                                            <img
                                                src={youtubeImg}
                                                alt="Safar Parmar YouTube Channel"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-all flex items-center justify-center">
                                                <Play className="w-16 h-16 text-white/90 group-hover:text-white group-hover:scale-110 transition-all drop-shadow-lg" />
                                            </div>
                                            <div className="absolute bottom-4 left-4 right-4 z-10">
                                                <p className="text-white font-semibold text-sm drop-shadow-lg">Safar Parmar</p>
                                                <p className="text-white/90 text-xs drop-shadow-lg">YouTube Channel</p>
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            <p className="text-foreground text-sm">Visit channel for wellness and motivation content</p>
                                            <div className="flex items-center gap-2 mt-2 text-primary text-xs">
                                                <span>Watch on YouTube</span>
                                                <ExternalLink className="w-3 h-3" />
                                            </div>
                                        </div>
                                    </a>
                                </div>

                                {/* Course Link */}
                                <div className="bg-muted/50 border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-all group">
                                    <a
                                        href="https://parmaracademy.in/courses/75"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block"
                                    >
                                        <div className="relative aspect-video bg-gradient-to-br from-pink-900/20 to-pink-600/20 flex items-center justify-center overflow-hidden">
                                            <img
                                                src={courseImg}
                                                alt="Parmar Academy Course"
                                                className="w-full h-full object-contain bg-white p-4 group-hover:scale-105 transition-transform duration-300"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                            <div className="absolute bottom-4 left-4 right-4 z-10">
                                                <p className="text-white font-semibold text-sm drop-shadow-lg">Parmar Academy</p>
                                                <p className="text-white/90 text-xs drop-shadow-lg">Professional Course</p>
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            <p className="text-foreground text-sm">Explore comprehensive learning resources</p>
                                            <div className="flex items-center gap-2 mt-2 text-primary text-xs">
                                                <span>View Course</span>
                                                <ExternalLink className="w-3 h-3" />
                                            </div>
                                        </div>
                                    </a>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
            {showWelcome && <WelcomeDialog onClose={handleCloseWelcome} userName={user.name} />}
        </MainLayout>
    );
}
