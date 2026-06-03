import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import AddFiles from "@assets/img/add-files-illustration.svg";
import { FaPlus } from "react-icons/fa6";
import { useNavigate } from "react-router";

const FileRequestEmptyState = ({ className }: { className?: string }) => {
  const navigate = useNavigate();
  return (
    <div
      className={cn(
        "flex flex-col justify-center items-center p-8 text-center max-sm:p-2",
        className
      )}
    >
      <img
        src={AddFiles}
        alt="No Transfers"
        className="w-48 max-w-3/4 h-48 mb-4"
      />
      <div className="flex flex-col max-w-[512px] mb-4">
        <span className="text-xl font-semibold mb-2">
          Looks like you don't have any file requests yet
        </span>
        <span className="text-neutral-400">
          Send a file request to collect files from others, or ask someone to
          send you a request.
        </span>
      </div>
      <div className="flex items-center gap-4">
        <Button onClick={() => navigate("/requests/create")}>
          <FaPlus />
          Request Transfer
        </Button>
      </div>
    </div>
  );
};

export default FileRequestEmptyState;
