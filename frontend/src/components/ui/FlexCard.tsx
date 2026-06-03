import React from "react";
import { cn } from "@/lib/utils";
import { Card } from "./card";
import { HTMLMotionProps } from "framer-motion";

const FlexCard = ({
  children,
  className,
  onClick,
  ...props
}: HTMLMotionProps<"div"> & {
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) => {
  return (
    <Card
      {...props}
      className={cn(
        "flex flex-col items-start gap-8 p-6 bg-surface-foreground shadow-sm transition-all duration-200 max-sm:px-4",
        onClick && "cursor-pointer hover:scale-[1.02] hover:shadow-md",
        className
      )}
      onClick={onClick}
    >
      {children}
    </Card>
  );
};
export default FlexCard;
