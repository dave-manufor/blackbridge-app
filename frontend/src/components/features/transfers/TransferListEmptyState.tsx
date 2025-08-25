import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import AddFiles from "@assets/img/add-files-illustration.svg";
import { FaPlus } from "react-icons/fa6";

const TransferListEmptyState = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        "flex flex-col justify-center items-center p-8 text-center",
        className
      )}
    >
      <img
        src={AddFiles}
        alt="No Transfers"
        className="w-48 max-w-3/4 h-48 mb-4"
      />
      <div className="flex flex-col w-128 max-w-3/4 mb-4">
        <span className="text-xl font-semibold mb-2">No transfers found</span>
        <span className="text-neutral-400">
          Ready to share something? Upload your files and create your first
          transfer or request one in just a few clicks.
        </span>
      </div>
      <div className="flex items-center gap-4">
        <Button variant="outline">Request Transfer</Button>
        <Button>
          <FaPlus />
          New Transfer
        </Button>
      </div>
    </div>
  );
};

export default TransferListEmptyState;
