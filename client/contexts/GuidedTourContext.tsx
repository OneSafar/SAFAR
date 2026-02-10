import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type TourStep = {
    target: string; // CSS selector for the element to highlight
    title: string;
    content: string;
    placement?: "top" | "bottom" | "left" | "right" | "center";
    spotlightPadding?: number;
};

export type TourConfig = {
    id: string;
    steps: TourStep[];
};

type GuidedTourContextValue = {
    // Current tour state
    isActive: boolean;
    currentStep: number;
    currentTour: TourConfig | null;

    // Actions
    startTour: (tour: TourConfig) => void;
    nextStep: () => void;
    prevStep: () => void;
    skipTour: () => void;
    endTour: () => void;

    // Utility
    hasSeenTour: (tourId: string) => boolean;
    markTourSeen: (tourId: string) => void;
    resetTourHistory: () => void;
};

const GuidedTourContext = createContext<GuidedTourContextValue | null>(null);

const STORAGE_KEY = "safar_guided_tours_seen";

function getSeenTours(): string[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

function setSeenTours(tours: string[]) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tours));
    } catch {
        // Ignore storage errors
    }
}

export function GuidedTourProvider({ children }: { children: React.ReactNode }) {
    const [isActive, setIsActive] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [currentTour, setCurrentTour] = useState<TourConfig | null>(null);
    const [seenTours, setSeenToursState] = useState<string[]>([]);

    // Load seen tours on mount
    useEffect(() => {
        setSeenToursState(getSeenTours());
    }, []);

    const startTour = useCallback((tour: TourConfig) => {
        setCurrentTour(tour);
        setCurrentStep(0);
        setIsActive(true);
        // Lock body scroll
        document.body.style.overflow = "hidden";
    }, []);

    const endTour = useCallback(() => {
        if (currentTour) {
            const newSeenTours = [...seenTours, currentTour.id];
            setSeenToursState(newSeenTours);
            setSeenTours(newSeenTours);
        }
        setIsActive(false);
        setCurrentStep(0);
        setCurrentTour(null);
        document.body.style.overflow = "";
    }, [currentTour, seenTours]);

    const skipTour = useCallback(() => {
        endTour();
    }, [endTour]);

    const nextStep = useCallback(() => {
        if (!currentTour) return;
        if (currentStep < currentTour.steps.length - 1) {
            setCurrentStep((prev) => prev + 1);
        } else {
            endTour();
        }
    }, [currentTour, currentStep, endTour]);

    const prevStep = useCallback(() => {
        if (currentStep > 0) {
            setCurrentStep((prev) => prev - 1);
        }
    }, [currentStep]);

    const hasSeenTour = useCallback(
        (tourId: string) => seenTours.includes(tourId),
        [seenTours]
    );

    const markTourSeen = useCallback(
        (tourId: string) => {
            if (!seenTours.includes(tourId)) {
                const newSeenTours = [...seenTours, tourId];
                setSeenToursState(newSeenTours);
                setSeenTours(newSeenTours);
            }
        },
        [seenTours]
    );

    const resetTourHistory = useCallback(() => {
        setSeenToursState([]);
        setSeenTours([]);
    }, []);

    // Handle keyboard navigation
    useEffect(() => {
        if (!isActive) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case "ArrowRight":
                case "Enter":
                    nextStep();
                    break;
                case "ArrowLeft":
                    prevStep();
                    break;
                case "Escape":
                    skipTour();
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isActive, nextStep, prevStep, skipTour]);

    const value = useMemo<GuidedTourContextValue>(
        () => ({
            isActive,
            currentStep,
            currentTour,
            startTour,
            nextStep,
            prevStep,
            skipTour,
            endTour,
            hasSeenTour,
            markTourSeen,
            resetTourHistory,
        }),
        [
            isActive,
            currentStep,
            currentTour,
            startTour,
            nextStep,
            prevStep,
            skipTour,
            endTour,
            hasSeenTour,
            markTourSeen,
            resetTourHistory,
        ]
    );

    return (
        <GuidedTourContext.Provider value={value}>
            {children}
        </GuidedTourContext.Provider>
    );
}

export function useGuidedTour() {
    const ctx = useContext(GuidedTourContext);
    if (!ctx) throw new Error("useGuidedTour must be used within GuidedTourProvider");
    return ctx;
}
