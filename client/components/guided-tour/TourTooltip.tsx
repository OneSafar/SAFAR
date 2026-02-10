import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

type Placement = "top" | "bottom" | "left" | "right" | "center";

type TourTooltipProps = {
    targetSelector: string;
    title: string;
    content: string;
    placement?: Placement;
    currentStep: number;
    totalSteps: number;
    onNext: () => void;
    onPrev: () => void;
    onSkip: () => void;
    isActive: boolean;
};

type Position = {
    top: number;
    left: number;
};

export default function TourTooltip({
    targetSelector,
    title,
    content,
    placement = "right",
    currentStep,
    totalSteps,
    onNext,
    onPrev,
    onSkip,
    isActive,
}: TourTooltipProps) {
    const [position, setPosition] = useState<Position | null>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const animationRef = useRef<number>();

    useEffect(() => {
        if (!isActive) {
            setPosition(null);
            return;
        }

        const updatePosition = () => {
            const element = document.querySelector(targetSelector);
            const tooltip = tooltipRef.current;

            if (element && tooltip) {
                const rect = element.getBoundingClientRect();
                const tooltipRect = tooltip.getBoundingClientRect();
                const padding = 20;

                let top = 0;
                let left = 0;

                switch (placement) {
                    case "top":
                        top = rect.top - tooltipRect.height - padding;
                        left = rect.left + rect.width / 2 - tooltipRect.width / 2;
                        break;
                    case "bottom":
                        top = rect.bottom + padding;
                        left = rect.left + rect.width / 2 - tooltipRect.width / 2;
                        break;
                    case "left":
                        top = rect.top + rect.height / 2 - tooltipRect.height / 2;
                        left = rect.left - tooltipRect.width - padding;
                        break;
                    case "right":
                        top = rect.top + rect.height / 2 - tooltipRect.height / 2;
                        left = rect.right + padding + 30; // Extra space for pointer
                        break;
                    case "center":
                        top = window.innerHeight / 2 - tooltipRect.height / 2;
                        left = window.innerWidth / 2 - tooltipRect.width / 2;
                        break;
                }

                // Keep tooltip within viewport
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;

                if (left < 10) left = 10;
                if (left + tooltipRect.width > viewportWidth - 10) {
                    left = viewportWidth - tooltipRect.width - 10;
                }
                if (top < 10) top = 10;
                if (top + tooltipRect.height > viewportHeight - 10) {
                    top = viewportHeight - tooltipRect.height - 10;
                }

                setPosition({ top, left });
            }

            animationRef.current = requestAnimationFrame(updatePosition);
        };

        // Small delay to allow elements to render
        const timeout = setTimeout(() => {
            updatePosition();
        }, 150);

        return () => {
            clearTimeout(timeout);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [targetSelector, placement, isActive]);

    if (!isActive) return null;

    const isLastStep = currentStep === totalSteps - 1;
    const isFirstStep = currentStep === 0;

    const tooltipContent = (
        <div
            ref={tooltipRef}
            className="fixed z-[9999] w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden transition-all duration-300 ease-out"
            style={{
                top: position?.top ?? -9999,
                left: position?.left ?? -9999,
                opacity: position ? 1 : 0,
                transform: position ? "scale(1)" : "scale(0.95)",
            }}
        >
            {/* Header */}
            <div className="px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-start justify-between">
                    <div>
                        <span className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">
                            Step {currentStep + 1} of {totalSteps}
                        </span>
                        <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                            {title}
                        </h3>
                    </div>
                    <button
                        onClick={onSkip}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label="Skip tour"
                    >
                        <X className="w-4 h-4 text-slate-400" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="px-5 py-4">
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {content}
                </p>
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 flex items-center justify-between gap-3">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onPrev}
                    disabled={isFirstStep}
                    className="gap-1"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                </Button>

                {/* Progress dots */}
                <div className="flex items-center gap-1.5">
                    {Array.from({ length: totalSteps }).map((_, i) => (
                        <div
                            key={i}
                            className={`w-2 h-2 rounded-full transition-all ${i === currentStep
                                    ? "bg-indigo-500 w-4"
                                    : i < currentStep
                                        ? "bg-indigo-300"
                                        : "bg-slate-200 dark:bg-slate-700"
                                }`}
                        />
                    ))}
                </div>

                <Button
                    size="sm"
                    onClick={onNext}
                    className="gap-1 bg-indigo-500 hover:bg-indigo-600"
                >
                    {isLastStep ? "Finish" : "Next"}
                    {!isLastStep && <ChevronRight className="w-4 h-4" />}
                </Button>
            </div>
        </div>
    );

    return createPortal(tooltipContent, document.body);
}
