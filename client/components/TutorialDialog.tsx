import { useMemo } from "react";
import type { ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRight, BookOpen, Heart, Timer, Users, Wind } from "lucide-react";

type TutorialDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type TutorialFeature = {
  id: "nishtha" | "mehfil" | "focus" | "meditation";
  title: string;
  route: string;
  icon: ComponentType<{ className?: string }>;
  accent: string;
  bullets: string[];
};

export default function TutorialDialog({ open, onOpenChange }: TutorialDialogProps) {
  const navigate = useNavigate();

  const features = useMemo<TutorialFeature[]>(
    () => [
      {
        id: "nishtha",
        title: "Nishtha (Nistha) — consistency & emotional tracking",
        route: "/nishtha/check-in",
        icon: Heart,
        accent: "from-fuchsia-500/15 to-purple-500/10 border-purple-500/20",
        bullets: [
          "Start with a daily Emotional Check‑In (mood + intensity).",
          "Use Journal to write private thoughts and reflections.",
          "Set Daily/Weekly Goals and mark them complete as you go.",
          "Track Streaks and use Suggestions for personalized tips.",
        ],
      },
      {
        id: "focus",
        title: "Focus Timer (Ekagra Mode) — study with structure",
        route: "/study",
        icon: Timer,
        accent: "from-amber-500/15 to-orange-500/10 border-amber-500/20",
        bullets: [
          "Pick a Pomodoro duration and start/pause/reset the timer.",
          "Add tasks in the sidebar to stay on track during sessions.",
          "Try different themes for the vibe you want.",
          "Open Analytics to review your focus stats and streaks.",
        ],
      },
      {
        id: "mehfil",
        title: "Mehfil — a judgement‑free community space",
        route: "/mehfil",
        icon: Users,
        accent: "from-cyan-500/15 to-sky-500/10 border-cyan-500/20",
        bullets: [
          "Pick a topic from the left sidebar to see relevant posts.",
          "Share a thought (text, optionally an image) via the composer.",
          "Use “Relate” to support posts that match how you feel.",
          "Search by text/author to find posts quickly.",
        ],
      },
      {
        id: "meditation",
        title: "Meditation (Dhyan) — breathing & calm routines",
        route: "/meditation",
        icon: Wind,
        accent: "from-emerald-500/15 to-teal-500/10 border-emerald-500/20",
        bullets: [
          "Choose a session (e.g., Box Breathing, 4‑7‑8).",
          "Open steps/instructions, then start the session timer.",
          "Follow the inhale/hold/exhale guidance on-screen.",
          "Use mute/unmute if you prefer silent guidance.",
        ],
      },
    ],
    [],
  );

  const handleGo = (route: string) => {
    onOpenChange(false);
    navigate(route);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        <div className="p-6 border-b bg-gradient-to-r from-[#6EE7B7]/15 via-background to-teal-500/10">
          <DialogHeader>
            <DialogTitle className="text-2xl">How to use SAFAR</DialogTitle>
            <DialogDescription>
              Quick walkthrough of Nishtha, Mehfil, Focus Timer, and Meditation.
            </DialogDescription>
          </DialogHeader>
        </div>

        <ScrollArea className="max-h-[70vh]">
          <div className="p-6 grid gap-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <section
                  key={feature.id}
                  className={`rounded-2xl border bg-gradient-to-br ${feature.accent} bg-background p-5`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 h-10 w-10 rounded-xl bg-background/70 border flex items-center justify-center">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{feature.title}</h3>
                        <ul className="mt-3 space-y-2 text-sm text-muted-foreground list-disc pl-5">
                          {feature.bullets.map((b) => (
                            <li key={b}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <Button variant="outline" size="sm" onClick={() => handleGo(feature.route)}>
                      Open
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </section>
              );
            })}

            <div className="rounded-2xl border bg-muted/30 p-5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-10 w-10 rounded-xl bg-background/70 border flex items-center justify-center">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div className="text-sm text-muted-foreground leading-relaxed">
                  Tip: you can reopen this anytime from the floating <span className="font-medium text-foreground">Tutorial</span>{" "}
                  button (bottom-right) or from your profile menu.
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 border-t bg-background/80">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => onOpenChange(false)}>Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
