import { Skeleton } from "./skeleton";

const FileCardSkeleton = () => {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 bg-white w-full max-w-full">
      <div className="flex items-center gap-3 overflow-hidden flex-1">
        <Skeleton className="size-8 shrink-0" />
        <div className="flex flex-col items-start gap-1 w-full overflow-hidden">
          <Skeleton className="h-4 w-3/4 max-w-[200px]" />
          <Skeleton className="h-3 w-1/2 max-w-[120px]" />
        </div>
      </div>
      <Skeleton className="size-8 shrink-0 rounded-md ml-2" />
    </div>
  );
};

export default FileCardSkeleton;
