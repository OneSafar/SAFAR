import React, { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface Contributor {
    id: string;
    name: string;
    avatar: string | null;
    post_count: number;
}

interface RightSidebarProps {
    socket: Socket | null;
}

const RightSidebar: React.FC<RightSidebarProps> = ({ socket }) => {
    const [contributors, setContributors] = useState<Contributor[]>([]);

    useEffect(() => {
        if (!socket) return;

        socket.emit('contributors:top');

        socket.on('contributors:list', (list: Contributor[]) => {
            setContributors(list);
        });

        // Refresh contributors when new messages are posted
        socket.on('message:new', () => {
            socket.emit('contributors:top');
        });

        return () => {
            socket.off('contributors:list');
            socket.off('message:new');
        };
    }, [socket]);

    return (
        <aside className="hidden xl:flex flex-col gap-6 w-96 shrink-0 sticky top-28 h-[calc(100vh-8rem)] overflow-y-auto custom-scrollbar">
            {/* Top Contributors */}
            <div className="glass-card rounded-3xl p-6 border border-white/50 dark:border-white/5 shadow-xl shadow-teal-900/5 dark:shadow-black/20">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Top Contributors</h2>
                    <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-500/10 border border-teal-100 dark:border-teal-500/20">
                        <div className="flex h-1.5 w-1.5 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-teal-500"></span>
                        </div>
                        <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold uppercase tracking-wide">Live</span>
                    </div>
                </div>

                {contributors.length === 0 ? (
                    <p className="text-sm text-slate-400 dark:text-slate-500 italic text-center py-4">Be the first to contribute!</p>
                ) : (
                    <div className="space-y-5">
                        {contributors.map((user, index) => (
                            <div key={user.id} className="group flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <Avatar className="w-10 h-10 ring-2 ring-transparent group-hover:ring-teal-500/30 transition-all">
                                            <AvatarImage src={user.avatar || undefined} alt={user.name} />
                                            <AvatarFallback className="bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-400 font-bold text-sm">
                                                {user.name?.[0]?.toUpperCase() || '?'}
                                            </AvatarFallback>
                                        </Avatar>
                                        {index === 0 && (
                                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-sm">
                                                👑
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                                            {user.name}
                                        </p>
                                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-500">
                                            {user.post_count} {Number(user.post_count) === 1 ? 'thought' : 'thoughts'} shared
                                        </p>
                                    </div>
                                </div>
                                <div className="text-xs font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10 px-2 py-0.5 rounded-full">
                                    #{index + 1}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Community Stats */}
            <div className="glass-card rounded-3xl p-6 border border-white/50 dark:border-white/5 shadow-xl shadow-teal-900/5 dark:shadow-black/20">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">About Mehfil</h2>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    A safe space to share thoughts, relate with others, and build community. Your voice matters here. 💚
                </p>
            </div>
        </aside>
    );
};

export default RightSidebar;
