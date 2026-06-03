import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const TransferSummaryCardSkeleton = ({
  className,
}: {
  key: string | number;
  className?: string;
}) => {
  return (
    <Card className={cn("p-5 flex flex-col justify-between gap-4 h-[180px]", className)}>
      <div className="flex flex-col gap-1 w-full">
        <div className="flex items-start justify-between gap-4 w-full">
          <Skeleton className="w-3/4 h-7" />
          <Skeleton className="w-6 h-6 rounded-full" />
        </div>
        
        <div className="flex items-center gap-2 mt-2">
          <Skeleton className="w-4 h-4" />
          <Skeleton className="w-1/3 h-4" />
        </div>
      </div>

      <div className="flex items-center gap-2 mt-auto pt-2">
        <Skeleton className="w-20 h-6 rounded-full" />
        <Skeleton className="w-16 h-6 rounded-full" />
      </div>
    </Card>
  );
};

export default TransferSummaryCardSkeleton;
