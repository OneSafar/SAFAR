import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TutorialFab({
  hasSeenTutorial,
  onOpenTutorial,
}: {
  hasSeenTutorial: boolean;
  onOpenTutorial: () => void;
}) {
  return (
    <div className="fixed right-4 bottom-20 lg:bottom-6 z-50">
      <div className="relative">
        {!hasSeenTutorial && (
          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-rose-500 ring-2 ring-background" />
        )}
        <Button
          type="button"
          onClick={onOpenTutorial}
          className="rounded-full shadow-lg hover:shadow-xl"
          aria-label="Open SAFAR tutorial"
        >
          <HelpCircle className="h-4 w-4" />
          Tutorial
        </Button>
      </div>
    </div>
  );
}

