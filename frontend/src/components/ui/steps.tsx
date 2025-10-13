import { cn } from "@/lib/utils";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useMemo,
  useEffect,
} from "react";

// Types
export interface Step {
  number: number;
  label: string;
  icon?: ReactNode;
  completed?: boolean;
}

export interface StepsContextValue {
  steps: Step[];
  activeStep: number;
  goToStep: (stepNumber: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setStepLabel: (stepNumber: number, label: string) => void;
  markStepComplete: (stepNumber: number) => void;
  markStepCompleteAndNext: (stepNumber: number) => void;
  canGoNext: boolean;
  canGoPrev: boolean;
}

const StepsContext = createContext<StepsContextValue | undefined>(undefined);

export const useSteps = (): StepsContextValue => {
  const ctx = useContext(StepsContext);
  if (!ctx) throw new Error("useSteps must be used within a StepsProvider");
  return ctx;
};

interface StepsProviderProps {
  children: ReactNode;
  initialStep?: number;
}

export const StepsProvider: React.FC<StepsProviderProps> = ({
  children,
  initialStep = 0,
}) => {
  const [steps, setSteps] = useState<Step[]>([]);
  const [activeStep, setActiveStep] = useState(initialStep);

  const setStepLabel = useCallback((number: number, label: string) => {
    setSteps((prev) =>
      prev.some((s) => s.number === number)
        ? prev.map((s) => (s.number === number ? { ...s, label } : s))
        : [...prev, { number, label }]
    );
  }, []);

  const goToStep = useCallback(
    (number: number) => {
      if (number >= 0 && number < steps.length) {
        setActiveStep(number);
      }
    },
    [steps.length]
  );

  const nextStep = useCallback(() => {
    setActiveStep((prev) => {
      const next = prev + 1;
      if (steps[prev]?.completed && next < steps.length) {
        return next;
      }
      return prev;
    });
  }, [steps]);

  const prevStep = useCallback(() => {
    setActiveStep((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const markStepComplete = useCallback((number: number) => {
    setSteps((prev) =>
      prev.map((s) => (s.number === number ? { ...s, completed: true } : s))
    );
  }, []);

  const markStepCompleteAndNext = useCallback(
    (number: number) => {
      markStepComplete(number);
      nextStep();
    },
    [markStepComplete, nextStep]
  );

  const canGoNext =
    Boolean(steps[activeStep]?.completed) && activeStep < steps.length - 1;
  const canGoPrev = activeStep > 0;

  const value = useMemo(
    () => ({
      steps,
      activeStep,
      goToStep,
      nextStep,
      prevStep,
      setStepLabel,
      markStepComplete,
      markStepCompleteAndNext,
      canGoNext,
      canGoPrev,
    }),
    [
      steps,
      activeStep,
      goToStep,
      nextStep,
      prevStep,
      setStepLabel,
      markStepComplete,
      markStepCompleteAndNext,
      canGoNext,
      canGoPrev,
    ]
  );

  return (
    <StepsContext.Provider value={value}>{children}</StepsContext.Provider>
  );
};

export const Steps: React.FC<{
  children: ReactNode;
  initialStep?: number;
  className?: string;
}> = ({ children, initialStep = 0, className }) => {
  return (
    <StepsProvider initialStep={initialStep}>
      <div className={cn("", className)}>{children}</div>
    </StepsProvider>
  );
};

// StepsIndicator
interface StepsIndicatorProps {
  stepNumber: number;
  label: string;
  icon?: ReactNode;
  className?: string;
}

export const StepsIndicator: React.FC<StepsIndicatorProps> = ({
  stepNumber,
  label,
  icon,
  className,
}) => {
  const { activeStep, setStepLabel, goToStep, steps } = useSteps();

  useEffect(() => {
    setStepLabel(stepNumber, label);
  }, [stepNumber, label, setStepLabel]);

  const isActive = activeStep === stepNumber;
  const isCompleted = steps.find((s) => s.number === stepNumber)?.completed;

  return (
    <button
      type="button"
      onClick={() => goToStep(stepNumber)}
      disabled={!isCompleted && !isActive}
      className={cn("", className)}
      style={{
        padding: "0.5rem 1rem",
        marginRight: "0.5rem",
        border: isActive ? "2px solid blue" : "1px solid gray",
        background: isCompleted ? "#e0ffe0" : "#f9f9f9",
        cursor: isCompleted || isActive ? "pointer" : "not-allowed",
      }}
    >
      {icon && <span style={{ marginRight: "0.5rem" }}>{icon}</span>}
      {label}
    </button>
  );
};

// StepsList
interface StepsListProps {
  children: ReactNode;
  showControls?: boolean;
  className?: string;
}

export const StepsList: React.FC<StepsListProps> = ({
  children,
  showControls = true,
  className,
}) => {
  const { prevStep, nextStep, canGoNext, canGoPrev } = useSteps();

  return (
    <div className={cn("", className)}>
      <div style={{ display: "flex", marginBottom: "1rem" }}>{children}</div>
      {showControls && (
        <div style={{ display: "flex", gap: "1rem" }}>
          <button onClick={prevStep} disabled={!canGoPrev}>
            Previous
          </button>
          <button onClick={nextStep} disabled={!canGoNext}>
            Next
          </button>
        </div>
      )}
    </div>
  );
};

interface StepsContentProps {
  stepNumber: number;
  children: ReactNode;
  className?: string;
}

export const StepsContent: React.FC<StepsContentProps> = ({
  stepNumber,
  children,
  className,
}) => {
  const { activeStep } = useSteps();
  return activeStep === stepNumber ? (
    <div className={cn("", className)}>{children}</div>
  ) : null;
};
