import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Error from "@assets/img/warning-illustration.svg";
import { ReactNode } from "react";

type GenericErrorStateProps = {
  title?: string;
  body?: string;
  primaryAction?: () => void;
  secondaryAction?: () => void;
  primaryActionLabel?: string | ReactNode;
  secondaryActionLabel?: string | ReactNode;
} & (
  | { primaryAction: () => void; primaryActionLabel: string | ReactNode }
  | { primaryAction?: undefined; primaryActionLabel?: undefined }
) &
  (
    | { secondaryAction: () => void; secondaryActionLabel: string | ReactNode }
    | { secondaryAction?: undefined; secondaryActionLabel?: undefined }
  ) & {
    className?: string;
  };

const GenericErrorState = ({
  title,
  body,
  primaryAction,
  secondaryAction,
  primaryActionLabel,
  secondaryActionLabel,
  className,
}: GenericErrorStateProps) => {
  return (
    <div
      className={cn(
        "flex flex-col justify-center items-center p-8 text-center",
        className
      )}
    >
      <img
        src={Error}
        alt="No Transfers"
        className="w-48 max-w-3/4 h-48 mb-4"
      />
      <div className="flex flex-col w-128 max-w-3/4 mb-4">
        <span className="text-xl font-semibold mb-2">
          {title ?? "Oops, something went wrong"}
        </span>
        <span className="text-neutral-400">
          {body ??
            "Looks like something went wrong on our end. Give it another try - or try refreshing the page."}
        </span>
      </div>
      {(!!primaryAction || !!secondaryAction) && (
        <div className="flex items-center gap-4">
          {!!secondaryAction && (
            <Button onClick={secondaryAction} variant="outline">
              {secondaryActionLabel}
            </Button>
          )}
          {!!primaryAction && (
            <Button onClick={primaryAction}>{primaryActionLabel}</Button>
          )}
        </div>
      )}
    </div>
  );
};

export default GenericErrorState;
