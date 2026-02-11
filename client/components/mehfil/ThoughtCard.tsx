import React from "react";
import { Thought } from "@/store/mehfilStore";
import { Heart, MoreHorizontal } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface ThoughtCardProps {
  thought: Thought;
  onReact: () => void;
  hasReacted: boolean;
  isOwnThought?: boolean;
}

const ThoughtCard: React.FC<ThoughtCardProps> = ({
  thought,
  onReact,
  hasReacted,
  isOwnThought = false,
}) => {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <article className="rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow duration-300">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <Avatar className="w-11 h-11 ring-2 ring-transparent hover:ring-teal-500/30 transition-all">
            <AvatarImage src={thought.authorAvatar || undefined} alt={thought.authorName} />
            <AvatarFallback className="bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-400 font-bold text-sm">
              {getInitials(thought.authorName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-0.5">
              {thought.authorName}
              {isOwnThought && (
                <span className="ml-2 text-[10px] bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 px-2 py-0.5 rounded-full font-semibold">
                  You
                </span>
              )}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-medium">
                {formatTime(thought.createdAt)}
              </span>
            </div>
          </div>
        </div>
        <button className="p-2 -mr-2 text-slate-300 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Thought Content */}
      <p className="text-[15px] text-slate-700 dark:text-slate-300 leading-relaxed mb-5 font-normal whitespace-pre-wrap">
        {thought.content}
      </p>

      {/* Image (if present) */}
      {thought.imageUrl && (
        <div className="rounded-2xl overflow-hidden mb-6 shadow-sm border border-slate-100 dark:border-slate-800">
          <img
            src={thought.imageUrl}
            alt="Thought attachment"
            className="w-full max-h-[400px] object-cover hover:scale-105 transition-transform duration-700"
          />
        </div>
      )}

      {/* Relatable Button */}
      <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={onReact}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${hasReacted
              ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-2 ring-rose-200 dark:ring-rose-500/20'
              : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-rose-500'
            }`}
        >
          <Heart
            className={`w-4 h-4 transition-all ${hasReacted ? 'fill-current' : ''}`}
          />
          {hasReacted ? 'Relatable' : 'Relatable?'}
        </button>
        {thought.relatableCount > 0 && (
          <span className="text-xs font-bold text-slate-400">
            {thought.relatableCount} {thought.relatableCount === 1 ? 'person finds' : 'people find'} this relatable
          </span>
        )}
      </div>
    </article>
  );
};

export default ThoughtCard;
