import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/MainLayout';
import { authService } from '@/utils/authService';
import { Play, Pause, RotateCcw, Clock, BookOpen, Coffee } from 'lucide-react';

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
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const [customStudy, setCustomStudy] = useState(30);
    const [customBreak, setCustomBreak] = useState(5);
    const [showCustom, setShowCustom] = useState(false);

    const sessionTypes: SessionType[] = [
        { duration: 25, break: 5, label: '25 min study' },
        { duration: 30, break: 5, label: '30 min study' },
        { duration: 45, break: 10, label: '45 min study' },
        { duration: 60, break: 10, label: '60 min study' },
        { duration: 90, break: 15, label: '90 min study' }
    ];

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const data = await authService.getCurrentUser();
                if (!data || !data.user) {
                    navigate('/login');
                    return;
                }
                setUser(data.user);
            } catch (error) {
                navigate('/login');
            }
        };
        checkAuth();
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
            // Break complete
            setIsBreak(false);
            setTimeLeft(selectedSession.duration * 60);
        }
    };

    const startSession = (session: SessionType) => {
        setSelectedSession(session);
        setTimeLeft(session.duration * 60);
        setIsBreak(false);
        setIsRunning(false);
        setShowCustom(false);
    };

    const startCustomSession = () => {
        if (customStudy > 0 && customBreak > 0) {
            startSession({
                duration: customStudy,
                break: customBreak,
                label: `${customStudy} min study`
            });
        }
    };

    const toggleTimer = () => {
        if (!isRunning && !isBreak && !currentSessionStart) {
            setCurrentSessionStart(new Date());
        }
        setIsRunning(!isRunning);
    };

    const resetTimer = () => {
        setIsRunning(false);
        setIsBreak(false);
        setCurrentSessionStart(null);
        if (selectedSession) {
            setTimeLeft(selectedSession.duration * 60);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getTotalStudyTime = () => {
        const total = completedSessions.reduce((acc, session) => acc + session.duration, 0);
        const hours = Math.floor(total / 60);
        const mins = total % 60;
        return { hours, mins, total };
    };

    const progress = selectedSession ? ((selectedSession.duration * 60 - timeLeft) / (selectedSession.duration * 60)) * 100 : 0;

    if (!user) return null;

    return (
        <MainLayout userName={user.name} userAvatar={user.avatar}>
            <div className="flex-1 h-full overflow-y-auto bg-background p-4 md:p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Study With Me 📚</h1>
                        <p className="text-muted-foreground">Stay focused with timed study sessions</p>
                    </div>

                    {!selectedSession ? (
                        <div className="bg-card rounded-2xl shadow-lg border border-border p-6 md:p-8">
                            <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-6">Choose Your Session</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                {sessionTypes.map((session, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => startSession(session)}
                                        className="p-6 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground rounded-xl transition-all transform hover:scale-105 shadow-md"
                                    >
                                        <div className="flex items-center justify-center mb-2">
                                            <BookOpen className="w-6 h-6 mr-2" />
                                            <span className="text-lg md:text-xl font-semibold">{session.label}</span>
                                        </div>
                                        <div className="text-sm opacity-90">Break: {session.break} min</div>
                                    </button>
                                ))}
                            </div>

                            <div className="border-t border-border pt-6">
                                <button
                                    onClick={() => setShowCustom(!showCustom)}
                                    className="w-full p-4 bg-muted hover:bg-muted/80 text-foreground rounded-xl font-semibold transition-all mb-4"
                                >
                                    {showCustom ? 'Hide Custom Timer' : 'Create Custom Timer'}
                                </button>

                                {showCustom && (
                                    <div className="bg-muted/50 rounded-xl p-6">
                                        <h3 className="font-semibold text-foreground mb-4">Custom Session</h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-muted-foreground mb-2">
                                                    Study Duration (minutes)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="180"
                                                    value={customStudy}
                                                    onChange={(e) => setCustomStudy(parseInt(e.target.value) || 0)}
                                                    className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-muted-foreground mb-2">
                                                    Break Duration (minutes)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="60"
                                                    value={customBreak}
                                                    onChange={(e) => setCustomBreak(parseInt(e.target.value) || 0)}
                                                    className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                                                />
                                            </div>
                                            <button
                                                onClick={startCustomSession}
                                                className="w-full p-4 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground rounded-xl font-semibold transition-all transform hover:scale-105 shadow-md"
                                            >
                                                Start Custom Session
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-card rounded-2xl shadow-lg border border-border p-6 md:p-8">
                                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                                    <div className="flex items-center space-x-2">
                                        {isBreak ? (
                                            <>
                                                <Coffee className="w-6 h-6 text-green-500" />
                                                <span className="text-xl font-semibold text-foreground">Break Time ☕</span>
                                            </>
                                        ) : (
                                            <>
                                                <BookOpen className="w-6 h-6 text-primary" />
                                                <span className="text-xl font-semibold text-foreground">Study Session 📖</span>
                                            </>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => {
                                            setSelectedSession(null);
                                            resetTimer();
                                        }}
                                        className="text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        Change Session
                                    </button>
                                </div>

                                <div className="text-center mb-8">
                                    <div className="text-6xl md:text-7xl font-bold text-foreground mb-4 font-mono">
                                        {formatTime(timeLeft)}
                                    </div>
                                    <div className="w-full bg-muted rounded-full h-3 mb-4">
                                        <div
                                            className={`h-3 rounded-full transition-all duration-1000 ${isBreak ? 'bg-green-500' : 'bg-primary'}`}
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    <p className="text-muted-foreground">
                                        {isBreak ? 'Take a break, you earned it!' : 'Stay focused, you got this!'}
                                    </p>
                                </div>

                                <div className="flex justify-center space-x-4">
                                    <button
                                        onClick={toggleTimer}
                                        className={`flex items-center space-x-2 px-6 md:px-8 py-4 rounded-xl text-white font-semibold transition-all transform hover:scale-105 ${isRunning ? 'bg-orange-500 hover:bg-orange-600' : 'bg-primary hover:bg-primary/90'
                                            }`}
                                    >
                                        {isRunning ? (
                                            <>
                                                <Pause className="w-5 h-5" />
                                                <span>Pause</span>
                                            </>
                                        ) : (
                                            <>
                                                <Play className="w-5 h-5" />
                                                <span>Start</span>
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={resetTimer}
                                        className="flex items-center space-x-2 px-6 md:px-8 py-4 bg-muted hover:bg-muted/80 text-foreground rounded-xl font-semibold transition-all transform hover:scale-105"
                                    >
                                        <RotateCcw className="w-5 h-5" />
                                        <span>Reset</span>
                                    </button>
                                </div>
                            </div>

                            <div className="bg-card rounded-2xl shadow-lg border border-border p-6 md:p-8">
                                <div className="flex items-center space-x-2 mb-6">
                                    <Clock className="w-6 h-6 text-primary" />
                                    <h2 className="text-xl md:text-2xl font-semibold text-foreground">Today's Progress</h2>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                                    <div className="bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl p-6 text-center">
                                        <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                                            {getTotalStudyTime().hours}h {getTotalStudyTime().mins}m
                                        </div>
                                        <div className="text-muted-foreground font-medium">Total Study Time</div>
                                    </div>

                                    <div className="bg-gradient-to-br from-green-500/20 to-green-500/10 rounded-xl p-6 text-center">
                                        <div className="text-3xl md:text-4xl font-bold text-green-600 dark:text-green-400 mb-2">
                                            {completedSessions.length}
                                        </div>
                                        <div className="text-muted-foreground font-medium">Sessions Completed</div>
                                    </div>

                                    <div className="bg-gradient-to-br from-orange-500/20 to-orange-500/10 rounded-xl p-6 text-center">
                                        <div className="text-3xl md:text-4xl font-bold text-orange-600 dark:text-orange-400 mb-2">
                                            {getTotalStudyTime().total}
                                        </div>
                                        <div className="text-muted-foreground font-medium">Minutes Focused</div>
                                    </div>
                                </div>

                                {completedSessions.length > 0 && (
                                    <div className="mt-6">
                                        <h3 className="font-semibold text-foreground mb-3">Session History</h3>
                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                            {completedSessions.map((session, idx) => (
                                                <div key={idx} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                                    <span className="text-muted-foreground">
                                                        Session {idx + 1}
                                                    </span>
                                                    <span className="font-semibold text-foreground">
                                                        {session.duration} minutes
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    );
}
