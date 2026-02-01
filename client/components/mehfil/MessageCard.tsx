import React, { useState } from "react";
import { Message } from "@/store/chatStore";
import {
  MoreHorizontal,
  MessageCircle,
  Share2,
  CheckCircle,
  Heart,
  Send,
  BarChart3
} from "lucide-react";

interface MessageCardProps {
  message: Message;
  onRelate: (option: number) => void;
  userVote?: number;
}

const MessageCard: React.FC<MessageCardProps> = ({
  message,
  onRelate,
  userVote,
}) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(
    userVote || null,
  );

  // Comment state
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState([
    { id: 1, author: "Sarah J.", text: "Totally relate to this!" },
    { id: 2, author: "Mike T.", text: "Hang in there, it gets better." }
  ]);

  const handleAddComment = () => {
    if (newComment.trim()) {
      setComments([
        ...comments,
        {
          id: Date.now(),
          author: "You",
          text: newComment
        }
      ]);
      setNewComment("");
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const [pollOptions, setPollOptions] = useState([
    { text: "Big mood. Same here.", percentage: 78 },
    { text: "I'm actually managing okay.", percentage: 22 },
  ]);

  const handleVote = (option: number) => {
    if (selectedOption === null) {
      setSelectedOption(option);
      onRelate(option);

      // Update percentages visually
      setPollOptions(prev => {
        const newOptions = [...prev];
        const votedIndex = option - 1; // option is 1-based
        const otherIndex = votedIndex === 0 ? 1 : 0;

        // Simple visual update: +1% to voted, -1% to other
        if (newOptions[votedIndex].percentage < 100) {
          newOptions[votedIndex].percentage += 1;
          newOptions[otherIndex].percentage -= 1;
        }
        return newOptions;
      });
    }
  };

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-indigo-500",
      "bg-rose-400",
      "bg-amber-400",
      "bg-emerald-400",
      "bg-blue-500",
    ];
    const index = name.length % colors.length;
    return colors[index];
  };

  return (
    <article className="rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow duration-300 mb-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-2xl ${getAvatarColor(message.author)} flex items-center justify-center text-white text-sm font-bold shadow-md shadow-opacity-20`}
          >
            {getInitials(message.author)}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-0.5">
              {message.author}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide">Beta</span>
              <span className="text-[10px] text-slate-400 font-medium">• {formatTime(message.createdAt)}</span>
            </div>
          </div>
        </div>
        <button className="p-2 -mr-2 text-slate-300 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Message Text */}
      <p className="text-[15px] text-slate-700 dark:text-slate-300 leading-relaxed mb-5 font-normal">
        {message.text}
      </p>

      {/* Image (if present) */}
      {message.imageUrl && (
        <div className="rounded-2xl overflow-hidden mb-6 shadow-sm border border-slate-100 dark:border-slate-800">
          <img
            src={message.imageUrl}
            alt="Message attachment"
            className="w-full max-h-[400px] object-cover hover:scale-105 transition-transform duration-700"
          />
        </div>
      )}

      {/* Poll/Relate Section */}
      <div className="bg-slate-50/50 dark:bg-slate-950/30 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/50">
        <div className="flex items-center justify-between mb-4 px-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <BarChart3 className="w-3 h-3" />
            Relatability Check
          </span>
          <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10 px-2 py-1 rounded-full">{message.relatableCount} Votes</span>
        </div>

        <div className="space-y-2.5">
          {/* Option 1 */}
          <div
            className="relative h-11 group cursor-pointer rounded-xl overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800 hover:ring-teal-400 transition-all"
            onClick={() => handleVote(1)}
          >
            {/* Background bar */}
            <div
              className="absolute inset-0 bg-gradient-to-r from-teal-400 to-teal-500 opacity-90 transition-all duration-700 ease-out"
              style={{ width: `${pollOptions[0].percentage}%` }}
            />
            {/* Content layer */}
            <div className="relative h-full flex items-center justify-between px-4 z-10">
              <span className={`text-xs font-bold transition-colors ${selectedOption === 1 || pollOptions[0].percentage > 50 ? 'text-white' : 'text-slate-600 dark:text-slate-300'} flex items-center gap-2`}>
                {selectedOption === 1 && (
                  <CheckCircle className="w-4 h-4 text-white animate-in zoom-in" />
                )}
                {pollOptions[0].text}
              </span>
              <span className={`text-xs font-black transition-colors ${pollOptions[0].percentage > 80 ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                {pollOptions[0].percentage}%
              </span>
            </div>
          </div>

          {/* Option 2 */}
          <div
            className="relative h-11 group cursor-pointer rounded-xl overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800 hover:ring-slate-400 transition-all bg-white dark:bg-slate-900"
            onClick={() => handleVote(2)}
          >
            {/* Background bar */}
            <div
              className="absolute inset-0 bg-slate-200 dark:bg-slate-800 transition-all duration-700 ease-out"
              style={{ width: `${pollOptions[1].percentage}%` }}
            />
            {/* Content layer */}
            <div className="relative h-full flex items-center justify-between px-4 z-10">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2">
                {selectedOption === 2 && (
                  <CheckCircle className="w-4 h-4 text-slate-600 dark:text-slate-300 animate-in zoom-in" />
                )}
                {pollOptions[1].text}
              </span>
              <span className="text-xs font-black text-slate-900 dark:text-white">
                {pollOptions[1].percentage}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-6 flex items-center gap-2">
        <button
          onClick={() => setShowComments(!showComments)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${showComments ? 'bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
        >
          <MessageCircle className="w-4 h-4" />
          {comments.length > 0 ? `${comments.length} Comments` : 'Comment'}
        </button>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all ml-auto">
          <Share2 className="w-4 h-4" />
          Share
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2">
          <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            {comments.map((comment) => (
              <div key={comment.id} className="group flex gap-3 text-xs p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-[10px] font-bold text-teal-700 dark:text-teal-400 shrink-0">
                  {getInitials(comment.author)}
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100 mb-0.5">{comment.author}</div>
                  <div className="text-slate-600 dark:text-slate-400 leading-relaxed">{comment.text}</div>
                </div>
              </div>
            ))}
            {comments.length === 0 && (
              <div className="text-center py-6">
                <p className="text-sm text-slate-400">No comments yet</p>
                <p className="text-[10px] text-slate-300 uppercase tracking-widest font-bold mt-1">Be the first to share</p>
              </div>
            )}
          </div>

          <div className="flex gap-2 p-1 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 focus-within:ring-2 focus-within:ring-teal-500/20 transition-all">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newComment.trim()) {
                  handleAddComment();
                }
              }}
              placeholder="Type a comment..."
              className="flex-1 bg-transparent border-0 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none placeholder:text-slate-400 text-slate-700 dark:text-slate-200"
            />
            <button
              onClick={handleAddComment}
              disabled={!newComment.trim()}
              className="p-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-teal-500/20"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </article>
  );
};

export default MessageCard;
