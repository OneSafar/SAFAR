import React, { useState, useEffect } from 'react';
import { Home, Compass, Calendar, ChevronDown, Plus, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Socket } from 'socket.io-client';

interface Community {
    id: string;
    name: string;
    description: string;
    creator_id: string;
    member_count: number;
}

interface LeftSidebarProps {
    socket: Socket | null;
    userId?: string;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({ socket, userId }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [showTopicsDropdown, setShowTopicsDropdown] = useState(false);
    const [selectedTopic, setSelectedTopic] = useState<'discussion' | 'venting'>('discussion');
    const [communities, setCommunities] = useState<Community[]>([]);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newCommunityName, setNewCommunityName] = useState('');
    const [newCommunityDesc, setNewCommunityDesc] = useState('');

    const isActive = (path: string) => location.pathname === path;

    // Load communities from socket
    useEffect(() => {
        if (!socket) return;

        socket.emit('community:load');

        socket.on('community:list', (list: Community[]) => {
            setCommunities(list);
        });

        socket.on('community:new', (community: Community) => {
            setCommunities(prev => [community, ...prev]);
        });

        return () => {
            socket.off('community:list');
            socket.off('community:new');
        };
    }, [socket]);

    const handleCreateCommunity = () => {
        if (!socket || !userId || !newCommunityName.trim()) return;
        socket.emit('community:create', {
            name: newCommunityName.trim(),
            description: newCommunityDesc.trim(),
            userId,
        });
        setNewCommunityName('');
        setNewCommunityDesc('');
        setShowCreateForm(false);
    };

    const communityColors = ['bg-teal-400', 'bg-indigo-400', 'bg-rose-400', 'bg-amber-400', 'bg-violet-400', 'bg-emerald-400'];

    return (
        <aside className="hidden lg:flex flex-col w-72 xl:w-80 shrink-0 sticky top-28 h-[calc(100vh-8rem)] overflow-y-auto custom-scrollbar pb-6">
            <div className="flex flex-col gap-1.5">
                <button
                    onClick={() => navigate('/landing')}
                    className={`sidebar-link group ${isActive('/') ? 'active bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'}`}
                >
                    <Home className={`w-5 h-5 ${isActive('/') ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                    <span className="font-semibold tracking-wide">Home</span>
                </button>

                {/* Topics with Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setShowTopicsDropdown(!showTopicsDropdown)}
                        className={`sidebar-link w-full justify-between group ${showTopicsDropdown ? 'bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-200' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'}`}
                    >
                        <div className="flex items-center gap-3">
                            <Compass className="w-5 h-5" />
                            <span className="font-semibold tracking-wide">Topics</span>
                        </div>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showTopicsDropdown ? 'rotate-180 text-teal-500' : 'text-slate-400'}`} />
                    </button>
                    {showTopicsDropdown && (
                        <div className="ml-4 mt-2 pl-4 border-l-2 border-slate-100 dark:border-slate-800 flex flex-col gap-1 animate-in slide-in-from-top-2 duration-200">
                            <button
                                onClick={() => {
                                    setSelectedTopic('discussion');
                                    setShowTopicsDropdown(false);
                                }}
                                className={`sidebar-link text-sm py-2 ${selectedTopic === 'discussion' ? 'text-teal-600 dark:text-teal-400 font-bold bg-transparent' : 'text-slate-500 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                            >
                                Discussion
                            </button>
                            <button
                                onClick={() => {
                                    setSelectedTopic('venting');
                                    setShowTopicsDropdown(false);
                                }}
                                className={`sidebar-link text-sm py-2 ${selectedTopic === 'venting' ? 'text-teal-600 dark:text-teal-400 font-bold bg-transparent' : 'text-slate-500 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                            >
                                Venting Out
                            </button>
                        </div>
                    )}
                </div>
                <button className="sidebar-link text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100">
                    <Calendar className="w-5 h-5" />
                    <span className="font-semibold tracking-wide">Weekly Events</span>
                </button>
            </div>

            {/* Communities Section */}
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between px-4 mb-2">
                    <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">My Communities</h3>
                    <button
                        onClick={() => setShowCreateForm(!showCreateForm)}
                        className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-teal-500 transition-colors"
                        title="Create Community"
                    >
                        {showCreateForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </button>
                </div>

                {/* Create Community Form */}
                {showCreateForm && (
                    <div className="mx-4 mb-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-2 duration-200">
                        <input
                            type="text"
                            placeholder="Community name..."
                            value={newCommunityName}
                            onChange={(e) => setNewCommunityName(e.target.value)}
                            className="w-full text-sm px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500/50 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 mb-2"
                        />
                        <input
                            type="text"
                            placeholder="Description (optional)"
                            value={newCommunityDesc}
                            onChange={(e) => setNewCommunityDesc(e.target.value)}
                            className="w-full text-sm px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500/50 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 mb-2"
                        />
                        <button
                            onClick={handleCreateCommunity}
                            disabled={!newCommunityName.trim()}
                            className="w-full py-2 rounded-lg bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            Create Community
                        </button>
                    </div>
                )}

                <div className="flex flex-col gap-1">
                    {communities.length === 0 ? (
                        <p className="px-4 text-sm text-slate-400 dark:text-slate-500 italic">No communities yet</p>
                    ) : (
                        communities.map((community, i) => (
                            <button
                                key={community.id}
                                className="sidebar-link text-sm py-2 text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-transparent"
                            >
                                <div className={`w-2 h-2 rounded-full ${communityColors[i % communityColors.length]}`}></div>
                                <span className="truncate">{community.name}</span>
                                <span className="ml-auto text-[10px] text-slate-400">{community.member_count}</span>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </aside>
    );
};

export default LeftSidebar;
