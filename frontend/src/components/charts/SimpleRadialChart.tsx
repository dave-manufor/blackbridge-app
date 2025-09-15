import { cn } from "@/lib/utils";
import CircularProgress from "@mui/material/CircularProgress";

export const description = "A radial chart with text";

// const chartData = [
//   { browser: "safari", visitors: 200, lives: 300, fill: "var(--color-safari)" },
// ];

// const chartConfig = {
//   visitors: {
//     label: "Visitors",
//   },
// } satisfies ChartConfig;

export function SimpleRadialChart({
  className,
  animateSpin = false,
  value,
  label,
  labelClassName,
  valueClassName,
}: {
  className?: string;
  animateSpin?: boolean;
  valueClassName?: string;
  labelClassName?: string;
  value: number;
  label?: string;
}) {
  return (
    <div
      style={{ containerType: "inline-size" }}
      className={cn(
        "relative inline-flex items-center justify-center aspect-square",
        className
      )}
    >
      <CircularProgress
        thickness={3}
        variant="determinate"
        className={cn({ "animate-[spin_5s_linear_infinite]": animateSpin })}
        value={value}
        style={{
          width: "100%",
          height: "100%",
          strokeLinecap: "round",
          color: "var(--color-primary)",
          ...(animateSpin ? { transform: "none" } : {}),
        }}
      />
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center text-[20cqw]">
        <span
          className={cn("text-[1em] font-semibold", valueClassName)}
        >{`${value}%`}</span>
        {label && (
          <div className={cn("text-[0.3em]", labelClassName)}>{label}</div>
        )}
      </div>
    </div>
  );
}
