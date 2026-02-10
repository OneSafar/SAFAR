import { useGuidedTour } from "@/contexts/GuidedTourContext";
import TourSpotlight from "./TourSpotlight";
import TourTooltip from "./TourTooltip";

export default function GuidedTour() {
    const {
        isActive,
        currentStep,
        currentTour,
        nextStep,
        prevStep,
        skipTour,
    } = useGuidedTour();

    if (!isActive || !currentTour) return null;

    const step = currentTour.steps[currentStep];
    if (!step) return null;

    return (
        <>
            <TourSpotlight
                targetSelector={step.target}
                padding={step.spotlightPadding ?? 8}
                isActive={isActive}
            />
            <TourTooltip
                targetSelector={step.target}
                title={step.title}
                content={step.content}
                placement={step.placement ?? "right"}
                currentStep={currentStep}
                totalSteps={currentTour.steps.length}
                onNext={nextStep}
                onPrev={prevStep}
                onSkip={skipTour}
                isActive={isActive}
            />
        </>
    );
}
