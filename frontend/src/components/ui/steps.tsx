import { cn } from "@/lib/utils";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useMemo,
  useEffect,
  ButtonHTMLAttributes,
} from "react";
import { FaAngleLeft, FaAngleRight, FaSpinner } from "react-icons/fa6";
import { Button } from "./button";
import { devOnly } from "@/utils/dev";

// Types
export interface Step {
  number: number;
  label?: string;
  icon?: ReactNode;
  completed?: boolean;
}

export interface StepsContextValue {
  steps: Step[];
  activeStep: number;
  goToStep: (stepNumber: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setStep: (number: number) => void;
  setStepLabel: (stepNumber: number, label: string) => void;
  markStepComplete: (stepNumber: number) => void;
  markCompleteAndNext: () => void;
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
  onFinish?: () => void;
  onChangeStep?: (stepNumber: number) => void;
}

export const StepsProvider: React.FC<StepsProviderProps> = ({
  children,
  initialStep = 0,
  onFinish,
  onChangeStep,
}) => {
  const [steps, setSteps] = useState<Step[]>([]);
  const [activeStep, setActiveStep] = useState(initialStep);
  const [isFinished, setIsFinished] = useState(false);

  const setStep = useCallback(
    (number: number) => {
      setSteps((prev) => {
        if (prev.some((s) => s.number === number)) return prev;
        prev.push({ number });
        return prev
          .sort((a, b) => a.number - b.number)
          .map((s) => (s.number < initialStep ? { ...s, completed: true } : s));
      });
    },
    [initialStep]
  );

  const setStepLabel = useCallback(
    (number: number, label: string) => {
      setSteps((prev) =>
        (prev.some((s) => s.number === number)
          ? prev.map((s) => (s.number === number ? { ...s, label } : s))
          : [...prev, { number, label }]
        )
          .sort((a, b) => a.number - b.number)
          .map((s) => (s.number < initialStep ? { ...s, completed: true } : s))
      );
    },
    [initialStep]
  );

  const goToStep = useCallback(
    (number: number) => {
      if (isFinished) return;
      if (number >= 0 && number < steps.length) {
        setActiveStep(number);
      }
    },
    [steps.length, isFinished]
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
    if (isFinished) return;
    setActiveStep((prev) => (prev > 0 ? prev - 1 : prev));
  }, [isFinished]);

  const markStepComplete = useCallback((number: number) => {
    setSteps((prev) =>
      prev.map((s) => (s.number === number ? { ...s, completed: true } : s))
    );
  }, []);

  const markCompleteAndNext = useCallback(() => {
    setSteps((prev) =>
      prev.map((s) => (s.number === activeStep ? { ...s, completed: true } : s))
    );
    setActiveStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
  }, [activeStep, steps]);

  const canGoNext =
    Boolean(steps[activeStep]?.completed) && activeStep < steps.length - 1;
  const canGoPrev = activeStep > 0 && !isFinished;

  useEffect(() => {
    const allCompleted = steps.every((s) => s.completed);
    if (allCompleted && steps.length > 0) {
      setIsFinished(true);
      onFinish?.();
    }
  }, [onFinish, steps]);

  useEffect(() => {
    onChangeStep?.(activeStep);
  }, [activeStep, onChangeStep]);

  const value = useMemo(
    () => ({
      steps,
      activeStep,
      goToStep,
      nextStep,
      prevStep,
      setStep,
      setStepLabel,
      markStepComplete,
      markCompleteAndNext,
      canGoNext,
      canGoPrev,
    }),
    [
      steps,
      activeStep,
      goToStep,
      nextStep,
      prevStep,
      setStep,
      setStepLabel,
      markStepComplete,
      markCompleteAndNext,
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
  onFinish?: () => void;
  onChangeStep?: (stepNumber: number) => void;
  className?: string;
}> = ({ children, initialStep = 0, onFinish, onChangeStep, className }) => {
  return (
    <StepsProvider
      initialStep={initialStep}
      onFinish={onFinish}
      onChangeStep={onChangeStep}
    >
      <div className={cn("", className)}>{children}</div>
    </StepsProvider>
  );
};

// StepsIndicator
interface StepsIndicatorProps {
  stepNumber: number;
  className?: string;
}

export const StepsIndicator: React.FC<StepsIndicatorProps> = ({
  stepNumber,
  className,
}) => {
  const { activeStep, goToStep, steps } = useSteps();

  const isActive = activeStep === stepNumber;
  const isCompleted = steps.find((s) => s.number === stepNumber)?.completed;

  return (
    <button
      type="button"
      onClick={() => goToStep(stepNumber)}
      disabled={!isCompleted && !isActive}
      className={cn(
        "h-[4px] rounded-[2px] grow bg-neutral-300",
        {
          "bg-black": isActive,
          "bg-green-500": isCompleted,
        },
        className
      )}
    ></button>
  );
};

// StepsIndicators
interface StepsIndicatorsProps {
  showControls?: boolean;
  className?: string;
}

export const StepsIndicators: React.FC<StepsIndicatorsProps> = ({
  showControls = true,
  className,
}) => {
  const { prevStep, nextStep, canGoNext, canGoPrev, steps } = useSteps();

  return (
    <div className={cn("flex items-center gap-2 w-full mb-6", className)}>
      {showControls && (
        <Button variant={"ghost"} onClick={prevStep} disabled={!canGoPrev}>
          <FaAngleLeft />
        </Button>
      )}
      <div className="flex gap-1 grow">
        {steps.map((step) => (
          <StepsIndicator key={step.number} stepNumber={step.number} />
        ))}
      </div>
      {showControls && (
        <Button variant={"ghost"} onClick={nextStep} disabled={!canGoNext}>
          <FaAngleRight />
        </Button>
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
  const { activeStep, setStep } = useSteps();

  useEffect(() => {
    setStep(stepNumber);
  }, [stepNumber, setStep]);

  return activeStep === stepNumber ? (
    <div className={cn("", className)}>{children}</div>
  ) : null;
};

export const StepActionButton: React.FC<{
  type?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
  action?: () => Promise<void>;
  children?: ReactNode;
  className?: string;
}> = ({ action, children, type = "button", className }) => {
  const [loading, setLoading] = useState(false);
  const { markCompleteAndNext } = useSteps();
  const handleAction = async () => {
    setLoading(true);
    try {
      await action?.();
      markCompleteAndNext();
    } catch (error) {
      devOnly(() =>
        console.error("Error occurred while performing action:", error)
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <Button
      className={className}
      type={type}
      variant={"default"}
      onClick={handleAction}
    >
      {loading ? <FaSpinner className="animate-spin" /> : children}
    </Button>
  );
};
