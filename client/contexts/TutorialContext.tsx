import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import TutorialDialog from "@/components/TutorialDialog";
import TutorialFab from "@/components/TutorialFab";
import { useLocation } from "react-router-dom";

type TutorialContextValue = {
  openTutorial: () => void;
  closeTutorial: () => void;
  hasSeenTutorial: boolean;
};

const TutorialContext = createContext<TutorialContextValue | null>(null);

const STORAGE_KEY = "safar_tutorial_seen_v1";

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(true);

  useEffect(() => {
    try {
      setHasSeenTutorial(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setHasSeenTutorial(true);
    }
  }, []);

  const markSeen = useCallback(() => {
    setHasSeenTutorial(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (!nextOpen) markSeen();
    },
    [markSeen],
  );

  const value = useMemo<TutorialContextValue>(
    () => ({
      openTutorial: () => setOpen(true),
      closeTutorial: () => handleOpenChange(false),
      hasSeenTutorial,
    }),
    [handleOpenChange, hasSeenTutorial],
  );

  return (
    <TutorialContext.Provider value={value}>
      {children}
      {!["/login", "/signup", "/forgot-password", "/reset-password"].includes(location.pathname) && (
        <TutorialFab hasSeenTutorial={hasSeenTutorial} onOpenTutorial={() => setOpen(true)} />
      )}
      <TutorialDialog open={open} onOpenChange={handleOpenChange} />
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error("useTutorial must be used within TutorialProvider");
  return ctx;
}
