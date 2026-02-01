import React from 'react';
import { UserPlus } from 'lucide-react';

const RightSidebar = () => {
    const updates = [
        {
            id: 1,
            image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=150&h=150&fit=crop",
            title: "New Study Cafe Open",
            desc: "The engineering block just opened a 24/7 cafe...",
            link: "#"
        },
        {
            id: 2,
            image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=150&h=150&fit=crop",
            title: "Scholarship Portal Live",
            desc: "Applications for fall semester grants are now...",
            link: "#"
        }
    ];

    const contributors = [
        {
            id: 1,
            name: "John Style",
            role: "CEO Cosmos",
            image: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop"
        },
        {
            id: 2,
            name: "Rita Kane",
            role: "Fashion Designer",
            image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop"
        },
        {
            id: 3,
            name: "Ken Adams",
            role: "Social Worker",
            image: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop"
        }
    ];

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
                <div className="space-y-5">
                    {contributors.map(user => (
                        <div key={user.id} className="group flex items-center justify-between cursor-pointer">
                            <div className="flex items-center gap-3">
                                <div className="relative w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden ring-2 ring-transparent group-hover:ring-teal-500/30 transition-all">
                                    <img src={user.image} alt={user.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">{user.name}</p>
                                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-500">{user.role}</p>
                                </div>
                            </div>
                            <button className="p-2 rounded-lg bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                                <UserPlus className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
                <button className="w-full mt-6 py-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-[11px] font-bold text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 hover:border-teal-500/50 hover:bg-teal-50/50 dark:hover:bg-teal-500/10 transition-all uppercase tracking-wide">
                    View All Members
                </button>
            </div>

            {/* Trending Updates */}
            <div className="glass-card rounded-3xl p-6 border border-white/50 dark:border-white/5 shadow-xl shadow-teal-900/5 dark:shadow-black/20">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Trending Now</h2>
                </div>
                <div className="space-y-4">
                    {updates.map(update => (
                        <div key={update.id} className="group cursor-pointer">
                            <div className="aspect-video rounded-xl bg-slate-100 dark:bg-slate-800 mb-3 overflow-hidden relative">
                                <img src={update.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={update.title} />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                                    <span className="text-white text-[10px] font-bold">Read More &rarr;</span>
                                </div>
                            </div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">{update.title}</h3>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{update.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </aside>
    );
};

export default RightSidebar;
