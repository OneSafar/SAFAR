import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/MainLayout';
import { authService } from '@/utils/authService';
import { dataService } from '@/utils/dataService';
import PerkTitle from '@/components/PerkTitle';
import { Award, Sparkles, Users, CheckCircle2, Lock, Flame, Target, Heart, Clock, Star, Check } from 'lucide-react';

interface Perk {
    id: string;
    name: string;
    description: string | null;
    type: 'aura' | 'echo' | 'seasonal';
    category: string;
    rarity: string | null;
    tier: number | null;
    requirement: string;
    holderCount: number;
    earned: boolean;
    active: boolean;
    progress: number;
    currentValue: number;
    targetValue: number;
}

const categoryIcons: Record<string, any> = {
    streak: Flame,
    focus: Clock,
    goals: Target,
    mood: Heart,
    special: Star,
};

const rarityColors: Record<string, string> = {
    common: 'bg-gray-500/20 text-gray-600 dark:text-gray-400',
    uncommon: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    rare: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
    epic: 'bg-purple-500/20 text-purple-600 dark:text-purple-400',
    legendary: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
};

export default function Perks() {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [perks, setPerks] = useState<Perk[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'aura' | 'echo' | 'seasonal'>('all');
    const [selectedPerkId, setSelectedPerkId] = useState<string | null>(null);
    const [selecting, setSelecting] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const userData = await authService.getCurrentUser();
                if (!userData?.user) {
                    navigate('/login');
                    return;
                }
                setUser(userData.user);

                // Fetch perks and current selection
                const [perkData, titleData] = await Promise.all([
                    dataService.getAllPerks(),
                    dataService.getActiveTitle()
                ]);
                setPerks(perkData.perks || []);
                setSelectedPerkId((titleData as any).selectedPerkId || null);
            } catch (error) {
                console.error('Failed to fetch perks:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [navigate]);

    const handleSelectPerk = async (perkId: string) => {
        if (selecting) return;
        setSelecting(true);
        try {
            const result = await dataService.selectPerk(perkId);
            setSelectedPerkId(result.selectedPerkId);
        } catch (error) {
            console.error('Failed to select perk:', error);
        } finally {
            setSelecting(false);
        }
    };

    const filteredPerks = filter === 'all' ? perks : perks.filter(p => p.type === filter);

    const auraPerks = perks.filter(p => p.type === 'aura');
    const echoPerks = perks.filter(p => p.type === 'echo');
    const seasonalPerks = perks.filter(p => p.type === 'seasonal');

    if (!user) return null;

    return (
        <MainLayout userName={user?.name} userAvatar={user?.avatar}>
            <div className="flex-1 h-full overflow-y-auto bg-background/95 font-['Plus_Jakarta_Sans']">
                {/* Background */}
                <div
                    className="fixed inset-0 pointer-events-none z-0"
                    style={{
                        backgroundImage: `
                            radial-gradient(circle at 15% 50%, hsl(var(--primary) / 0.1) 0%, transparent 50%),
                            radial-gradient(circle at 85% 30%, rgba(255, 215, 0, 0.05) 0%, transparent 45%)
                        `,
                        backgroundAttachment: 'fixed'
                    }}
                ></div>

                <div className="relative z-10 p-4 md:p-6 lg:p-8">
                    {/* Header */}
                    <header className="mb-8">
                        <div className="flex items-center gap-3 mb-2">
                            <Award className="text-yellow-500 w-8 h-8" />
                            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Perks Collection</h1>
                        </div>
                        <p className="text-muted-foreground text-sm">
                            Earn titles and badges by being consistent. Click "Set Active" to display a title on your profile!
                        </p>
                    </header>

                    {/* Stats Summary */}
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="glass-high rounded-xl p-4 text-center">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <Sparkles className="w-5 h-5 text-yellow-500" />
                                <span className="text-2xl font-bold text-foreground">{auraPerks.filter(p => p.earned).length}</span>
                                <span className="text-muted-foreground text-sm">/ {auraPerks.length}</span>
                            </div>
                            <p className="text-xs text-muted-foreground uppercase font-medium">Aura Titles</p>
                        </div>
                        <div className="glass-high rounded-xl p-4 text-center">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <Award className="w-5 h-5 text-purple-500" />
                                <span className="text-2xl font-bold text-foreground">{echoPerks.filter(p => p.earned).length}</span>
                                <span className="text-muted-foreground text-sm">/ {echoPerks.length}</span>
                            </div>
                            <p className="text-xs text-muted-foreground uppercase font-medium">Echo Badges</p>
                        </div>
                        <div className="glass-high rounded-xl p-4 text-center">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <Star className="w-5 h-5 text-emerald-500" />
                                <span className="text-2xl font-bold text-foreground">{seasonalPerks.filter(p => p.earned).length}</span>
                                <span className="text-muted-foreground text-sm">/ {seasonalPerks.length}</span>
                            </div>
                            <p className="text-xs text-muted-foreground uppercase font-medium">Seasonal</p>
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex gap-2 mb-6 flex-wrap">
                        {(['all', 'aura', 'echo', 'seasonal'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setFilter(tab)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === tab
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                                    }`}
                            >
                                {tab === 'all' ? 'All Perks' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </div>

                    {/* Perks Grid */}
                    {loading ? (
                        <div className="text-center py-12 text-muted-foreground">Loading perks...</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredPerks.map(perk => {
                                const CategoryIcon = categoryIcons[perk.category] || Award;
                                const isSelected = selectedPerkId === perk.id;
                                const activeAnimationClass = isSelected ? `perk-card-active-${perk.type}` : '';
                                return (
                                    <div
                                        key={perk.id}
                                        className={`glass-high rounded-xl p-5 relative overflow-hidden transition-all hover:scale-[1.02] ${perk.earned && !isSelected ? 'ring-2 ring-yellow-500/50' : ''
                                            } ${!perk.earned ? 'opacity-80' : ''} ${activeAnimationClass}`}
                                    >
                                        {/* Selected/Earned indicator */}
                                        {isSelected && perk.earned && (
                                            <div className="absolute top-3 right-3 flex items-center gap-1 bg-primary/20 px-2 py-0.5 rounded-full">
                                                <Check className="w-3 h-3 text-primary" />
                                                <span className="text-xs font-medium text-primary">Active</span>
                                            </div>
                                        )}
                                        {perk.earned && !isSelected && (
                                            <div className="absolute top-3 right-3">
                                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                            </div>
                                        )}
                                        {!perk.earned && (
                                            <div className="absolute top-3 right-3">
                                                <Lock className="w-4 h-4 text-muted-foreground" />
                                            </div>
                                        )}

                                        {/* Category Icon & Type */}
                                        <div className="flex items-center gap-2 mb-3">
                                            <CategoryIcon className="w-4 h-4 text-primary" />
                                            <span className={`text-xs font-medium uppercase px-2 py-0.5 rounded ${perk.type === 'aura' ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' :
                                                perk.type === 'echo' ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400' :
                                                    'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                                }`}>
                                                {perk.type}
                                            </span>
                                            {perk.rarity && (
                                                <span className={`text-xs font-medium uppercase px-2 py-0.5 rounded ${rarityColors[perk.rarity] || ''}`}>
                                                    {perk.rarity}
                                                </span>
                                            )}
                                        </div>

                                        {/* Perk Name */}
                                        <div className="mb-2">
                                            {perk.earned ? (
                                                <PerkTitle title={perk.name} type={perk.type} size="md" />
                                            ) : (
                                                <h3 className="font-bold text-foreground">{perk.name}</h3>
                                            )}
                                        </div>

                                        {/* Requirement */}
                                        <p className="text-sm text-muted-foreground mb-3">{perk.requirement}</p>

                                        {/* Progress Bar */}
                                        {!perk.earned && perk.targetValue > 0 && (
                                            <div className="mb-3">
                                                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                                    <span>Progress</span>
                                                    <span>{perk.currentValue} / {perk.targetValue}</span>
                                                </div>
                                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-primary rounded-full transition-all"
                                                        style={{ width: `${perk.progress}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Footer: Holder Count + Set Active Button */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Users className="w-3 h-3" />
                                                <span>{perk.holderCount} {perk.holderCount === 1 ? 'holder' : 'holders'}</span>
                                            </div>
                                            {perk.earned && !isSelected && (
                                                <button
                                                    onClick={() => handleSelectPerk(perk.id)}
                                                    disabled={selecting}
                                                    className="text-xs px-3 py-1 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors font-medium disabled:opacity-50"
                                                >
                                                    Set Active
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {filteredPerks.length === 0 && !loading && (
                        <div className="text-center py-12">
                            <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                            <p className="text-muted-foreground">No perks in this category yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    );
}
