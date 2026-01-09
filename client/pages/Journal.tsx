import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { authService } from "@/utils/authService";
import { dataService } from "@/utils/dataService";
import { toast } from "sonner";
import { User } from "@shared/api";

import {
  Smile,
  Bold,
  Italic,
  List,
  Image as ImageIcon,
  Check,
  RefreshCw,
  Sun,
  ArrowRight,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

export default function Journal() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [newEntry, setNewEntry] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await authService.getCurrentUser();
        if (!data || !data.user) {
          navigate("/login");
          return;
        }
        setUser(data.user);
      } catch (error) {
        navigate("/login");
      }
    };
    loadData();
  }, [navigate]);

  const handleAddEntry = async () => {
    if (!newEntry.trim()) return;

    setIsSubmitting(true);
    try {
      await dataService.addJournalEntry(newEntry);
      setNewEntry("");
      toast.success("Journal entry saved!");
    } catch (error) {
      toast.error("Failed to save entry");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <MainLayout userName={user.name} userAvatar={user.avatar}>
      <div className="relative min-h-[calc(100vh-64px)] w-full overflow-hidden bg-background font-['Manrope'] text-foreground transition-colors duration-300">

        {/* Animated Background Blobs */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-primary/20 rounded-full blur-[120px] opacity-70 animate-pulse-slow"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-purple-500/10 rounded-full blur-[120px] opacity-60 animate-pulse-slower"></div>
          <div className="absolute top-[40%] right-[20%] w-[30vw] h-[30vw] bg-secondary/10 rounded-full blur-[100px] opacity-40"></div>
        </div>

        {/* Content Container */}
        <div className="relative z-10 flex h-full gap-6 p-4 md:p-6 lg:p-8">

          {/* Main Editor Section */}
          <div className="flex-1 flex flex-col h-full max-w-5xl mx-auto w-full relative group/editor">

            {/* Header */}
            <div className="mb-6 pl-2">
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground drop-shadow-md">
                {dateString}
              </h1>
              <p className="text-primary/60 text-base font-medium mt-1 tracking-wide">
                Evening Reflection
              </p>
            </div>

            {/* Glass Editor Panel */}
            <div className="glass-high rounded-3xl flex-1 flex flex-col relative overflow-hidden transition-all duration-500 min-h-[60vh] shadow-lg">

              {/* Toolbar */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div className="flex items-center gap-1">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/20 border border-border text-sm font-medium cursor-pointer hover:bg-primary/30 transition-colors">
                    <Smile className="w-[18px] text-primary" />
                    <span className="text-foreground">Feeling Calm</span>
                  </div>
                  <div className="h-4 w-px bg-border mx-2"></div>
                  <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
                    <Bold className="w-5 h-5" />
                  </button>
                  <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
                    <Italic className="w-5 h-5" />
                  </button>
                  <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
                    <List className="w-5 h-5" />
                  </button>
                  <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
                    <ImageIcon className="w-5 h-5" />
                  </button>
                </div>
                <div className="text-xs font-medium text-muted-foreground px-3 py-1 bg-muted rounded-full">
                  Auto-saved
                </div>
              </div>

              {/* Text Area */}
              <div className="flex-1 relative overflow-hidden p-6 md:p-10">
                <input
                  className="w-full bg-transparent border-none text-2xl md:text-3xl font-bold text-foreground placeholder:text-muted-foreground/50 focus:ring-0 px-0 mb-4 outline-none"
                  placeholder="Title your entry..."
                  type="text"
                />
                <textarea
                  className="w-full h-[calc(100%-4rem)] bg-transparent resize-none border-none focus:ring-0 text-lg leading-relaxed text-foreground/90 placeholder:text-muted-foreground/30 px-0 font-medium outline-none journal-scroll"
                  placeholder="What's on your mind today? Start writing here..."
                  value={newEntry}
                  onChange={(e) => setNewEntry(e.target.value)}
                ></textarea>
              </div>

              {/* Save Button */}
              <div className="absolute bottom-6 right-6">
                <button
                  onClick={handleAddEntry}
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-gradient-to-r from-primary to-primary/80 shadow-lg hover:shadow-primary/20 text-primary-foreground font-bold text-sm tracking-wide transition-all transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
                >
                  <Check className="w-5 h-5" />
                  <span>{isSubmitting ? "Saving..." : "Save Entry"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Inspiration (Visible on XL screens) */}
          <aside className="hidden xl:flex w-[450px] flex-col gap-6 pt-[88px]">
            {/* Daily Inspiration */}
            <div className="glass-high rounded-2xl p-6 relative group overflow-hidden shadow-lg">
              <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="text-secondary hover:text-secondary/80 transition-colors" title="New Prompt">
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <Sun className="text-secondary w-5 h-5" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">Daily Inspiration</h3>
              </div>
              <div className="relative z-10">
                <p className="text-lg font-bold text-foreground leading-tight mb-4">
                  "What is one thing you are grateful for right now?"
                </p>
                <button
                  onClick={() => setNewEntry(prev => prev + "\n\nPrompt: What is one thing you are grateful for right now?\nAnswer: ")}
                  className="text-xs font-bold text-primary hover:text-foreground transition-colors flex items-center gap-1"
                >
                  Answer this prompt
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-secondary/10 rounded-full blur-2xl"></div>
            </div>

            {/* Weekly Tracker */}
            <div className="glass-high rounded-2xl p-5 flex flex-col gap-4 shadow-lg">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-foreground">This Week</h3>
                <span className="text-xs text-secondary">4/7 entries</span>
              </div>
              <div className="flex justify-between items-end h-16 px-1">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                  <div key={i} className={`w-8 rounded-t-sm relative group cursor-pointer transition-all ${i === 1 ? 'bg-secondary h-[80%] shadow-lg' : 'bg-muted h-[40%] hover:bg-secondary/40'}`}>
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity text-foreground font-bold">{day}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Calendar Widget */}
            <div className="glass-high rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-foreground">October</span>
                <div className="flex gap-1">
                  <ChevronLeft className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-primary" />
                  <ChevronRight className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-primary" />
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => <div key={d} className="text-primary/80 py-1">{d}</div>)}
                {Array.from({ length: 31 }, (_, i) => (
                  <div key={i} className={`py-1 ${i < 5 ? 'text-muted-foreground/30' : 'text-foreground'}`}>{i + 1}</div>
                ))}
              </div>
            </div>
          </aside>

        </div>
      </div>
    </MainLayout>
  );
}
