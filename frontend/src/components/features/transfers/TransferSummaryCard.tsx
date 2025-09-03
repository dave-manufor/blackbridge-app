import { TransferStatusBadge, TransferTypeBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/utils/format";
import { FaRegFolderOpen } from "react-icons/fa";
import { FiArrowDownLeft, FiArrowUpRight } from "react-icons/fi";
import { useNavigate } from "react-router";
import { TRANSFER_TYPES } from "@/config/constants/transfers";
import { IoLink } from "react-icons/io5";

const TransferSummaryCard = ({
  id,
  recommended_title,
  files,
  total_files_size_bytes,
  status,
  transfer_type,
  is_owner,
  is_viewed,
  className,
  onClick,
}: {
  id: string;
  recommended_title: string;
  files: Array<{ name: string }>;
  total_files_size_bytes: number;
  status: string;
  transfer_type: string;
  is_owner: boolean;
  is_viewed: boolean;
  className?: string;
  onClick?: () => void;
}) => {
  const navigate = useNavigate();
  const handleCardClick = () => {
    onClick?.();
    navigate(`/transfers/${id}`);
  };
  return (
    <Card
      key={id}
      className={cn(
        "p-4 gap-0 hover:bg-neutral-50 relative cursor-pointer",
        className
      )}
      onClick={handleCardClick}
    >
      {!is_viewed && (
        <div className="absolute size-4 rounded-full bg-red-400 top-0 right-0 translate-x-1/2 -translate-y-1/2" />
      )}
      <div className="w-full overflow-hidden text-ellipsis font-medium mb-6 flex gap-4">
        <span className="grow truncate text-base">{recommended_title}</span>
        {transfer_type === TRANSFER_TYPES.LINK ? (
          <IoLink className="text-2xl min-w-fit" />
        ) : is_owner ? (
          <FiArrowUpRight className="text-2xl min-w-fit" />
        ) : (
          <FiArrowDownLeft className="text-2xl min-w-fit" />
        )}
      </div>
      <div className="max-w-full text-neutral-500 mb-4">
        <div className="max-w-full flex items-start gap-2">
          <FaRegFolderOpen className="text-base min-w-fit mt-0.5" />
          {files.length > 0 ? (
            <div className="overflow-hidden grow text-ellipsis text-sm flex flex-col items-start gap-0.5">
              <span className="truncate max-w-full">{files[0].name}</span>
              <div className="flex items-center gap-1 text-xs text-neutral-400">
                {files.length > 1 && (
                  <>
                    <span> + {files.length - 1} more</span>
                    <span>| </span>
                  </>
                )}
                <span>{formatFileSize(total_files_size_bytes)}</span>
              </div>
            </div>
          ) : (
            <span className="text-sm text-neutral-500">No files</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <TransferStatusBadge status={status} />
        <TransferTypeBadge type={transfer_type} />
      </div>
      {/* <div className="flex items-center pt-4 border-t border-neutral-200">
        <Button className="cursor-pointer" onClick={handleDownload}>
          Download All
        </Button>
      </div> */}
    </Card>
  );
};

export default TransferSummaryCard;
