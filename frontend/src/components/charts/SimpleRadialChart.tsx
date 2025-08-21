import {
  Label,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from "recharts";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";

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
  numericValue,
  displayValue,
  label,
  startAngle,
  endAngle,
}: {
  className?: string;
  numericValue: number;
  displayValue: string;
  label: string;
  startAngle: number;
  endAngle: number;
}) {
  const chartData = [
    {
      numericValue: numericValue,
      displayValue: displayValue,
    },
  ];
  const chartConfig = {
    displayValue: {
      label: label,
    },
    numericValue: {
      label: label,
    },
  } satisfies ChartConfig;
  return (
    <ChartContainer
      config={chartConfig}
      className={`mx-auto aspect-square max-h-[250px] ${className}`}
    >
      <RadialBarChart
        data={chartData}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={80}
        outerRadius={110}
      >
        <PolarGrid
          gridType="circle"
          radialLines={false}
          stroke="none"
          className="first:fill-muted last:fill-background"
          polarRadius={[86, 74]}
        />
        <RadialBar dataKey="numericValue" background cornerRadius={10} />
        <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
          <Label
            content={({ viewBox }) => {
              if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                return (
                  <text
                    x={viewBox.cx}
                    y={viewBox.cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    <tspan
                      x={viewBox.cx}
                      y={viewBox.cy}
                      className="fill-foreground text-4xl font-bold"
                    >
                      {chartData[0].displayValue.toLocaleString()}
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy || 0) + 24}
                      className="fill-muted-foreground"
                    >
                      {label}
                    </tspan>
                  </text>
                );
              }
            }}
          />
        </PolarRadiusAxis>
      </RadialBarChart>
    </ChartContainer>
  );
}
