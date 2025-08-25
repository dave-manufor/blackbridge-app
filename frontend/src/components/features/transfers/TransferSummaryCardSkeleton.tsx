import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const TransferSummaryCardSkeleton = ({
  key,
  className,
}: {
  key: string | number;
  className?: string;
}) => {
  return (
    <Card key={key} className={cn("p-4 gap-0", className)}>
      <div className="w-full overflow-hidden text-ellipsis font-medium mb-6 flex gap-4">
        <Skeleton className="w-full h-6" />
      </div>
      <div className="max-w-full text-neutral-500 mb-4">
        <div className="max-w-full flex items-start gap-2">
          <Skeleton className="w-6 h-6" />
          <div className="overflow-hidden grow text-ellipsis text-sm flex flex-col items-start gap-0.5">
            <Skeleton className="truncate w-full h-6" />
            <div className="flex items-center gap-1 text-xs text-neutral-400">
              <Skeleton className="w-20 h-3" />
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="w-12 h-6" />
        <Skeleton className="w-12 h-6" />
      </div>
      <div className="flex items-center pt-4 border-t border-neutral-200">
        <Skeleton className="w-32 h-8" />
      </div>
    </Card>
  );
};

export default TransferSummaryCardSkeleton;
