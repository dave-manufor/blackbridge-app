import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { TRANSFER_STATUS, TRANSFER_TYPES } from "@/config/constants/transfers";

import { cn } from "@/lib/utils";
import { sentenceCase } from "@/utils/format";

const baseBadgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
      },
      size: {
        sm: "text-xs px-2 py-0.5",
        md: "text-sm px-3 py-0.5",
        lg: "text-base px-4 py-1",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "sm",
    },
  }
);

function Badge({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof baseBadgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(baseBadgeVariants({ variant, size }), className)}
      {...props}
    />
  );
}

function TransferStatusBadge({
  status,
  className,
  size,
}: {
  status: (typeof TRANSFER_STATUS)[keyof typeof TRANSFER_STATUS];
  className?: string;
  size?: VariantProps<typeof baseBadgeVariants>["size"];
}) {
  const badgeVariant = cva("border-transparent w-fit", {
    variants: {
      status: {
        [TRANSFER_STATUS.PENDING]:
          "bg-transparent border-2 border-yellow-300 text-yellow-400",
        [TRANSFER_STATUS.ACTIVE]:
          "bg-transparent border-2 border-green-300 text-green-400",
        [TRANSFER_STATUS.EXPIRED]:
          "bg-transparent border-2 border-red-300 text-red-400",
        [TRANSFER_STATUS.REVOKED]:
          "bg-transparent border-2 border-red-300 text-red-400",
      },
    },
    defaultVariants: {
      status: TRANSFER_STATUS.PENDING,
    },
  });
  const formattedStatus = sentenceCase(status);
  return (
    <Badge
      className={cn(
        className,
        baseBadgeVariants({ size }),
        badgeVariant({ status })
      )}
    >
      {formattedStatus}
    </Badge>
  );
}

function TransferTypeBadge({
  type,
  className,
  size,
}: {
  type: (typeof TRANSFER_TYPES)[keyof typeof TRANSFER_TYPES];
  className?: string;
  size?: VariantProps<typeof baseBadgeVariants>["size"];
}) {
  const badgeVariant = cva("border-transparent w-fit", {
    variants: {
      type: {
        EMAIL: "border-2 bg-transparent border-blue-300 text-blue-400",
        LINK: "border-2 bg-transparent border-purple-300 text-purple-400",
      },
    },
    defaultVariants: {
      type: "EMAIL",
    },
  });
  const formattedType = sentenceCase(type);
  const badgeType = type === "EMAIL" || type === "LINK" ? type : "EMAIL";
  return (
    <Badge
      className={cn(
        className,
        baseBadgeVariants({ size }),
        badgeVariant({ type: badgeType })
      )}
    >
      {formattedType}
    </Badge>
  );
}

export { Badge, baseBadgeVariants, TransferStatusBadge, TransferTypeBadge };
