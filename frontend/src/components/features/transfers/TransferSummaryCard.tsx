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
        "p-5 flex flex-col justify-between gap-4 hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden group",
        className
      )}
      onClick={handleCardClick}
    >
      {!is_viewed && (
        <div className="absolute size-3 rounded-full bg-primary-500 top-4 right-4 ring-4 ring-white" />
      )}
      
      <div className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-4">
          <span className="font-semibold text-neutral-900 truncate text-lg leading-tight">
            {recommended_title}
          </span>
          <div className="text-neutral-400 group-hover:text-primary-600 transition-colors">
            {transfer_type === TRANSFER_TYPES.LINK ? (
              <IoLink className="text-xl" />
            ) : is_owner ? (
              <FiArrowUpRight className="text-xl" />
            ) : (
              <FiArrowDownLeft className="text-xl" />
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <FaRegFolderOpen className="text-neutral-400" />
          <span className="truncate max-w-[150px]">
            {files.length > 0 ? files[0].name : "No files"}
          </span>
          {files.length > 1 && (
            <span className="text-neutral-400">+{files.length - 1}</span>
          )}
          <span className="text-neutral-300">|</span>
          <span>{formatFileSize(total_files_size_bytes)}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-auto pt-2">
        <TransferStatusBadge status={status} />
        <TransferTypeBadge type={transfer_type} />
      </div>
    </Card>
  );
};

export default TransferSummaryCard;
