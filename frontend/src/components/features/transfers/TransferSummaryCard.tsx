import { TransferStatusBadge, TransferTypeBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatFileSize } from "@/utils/format";
import { FaRegFolderOpen } from "react-icons/fa";
import { FiArrowDownLeft, FiArrowUpRight } from "react-icons/fi";
import { useNavigate } from "react-router";

const TransferSummaryCard = ({
  id,
  recommended_title,
  files,
  total_files_size_bytes,
  status,
  transfer_type,
  is_owner,
}: {
  id: string;
  recommended_title: string;
  files: Array<{ name: string }>;
  total_files_size_bytes: number;
  status: string;
  transfer_type: string;
  is_owner: boolean;
}) => {
  const navigate = useNavigate();
  return (
    <Card
      key={id}
      className="col-span-3 p-4 gap-0 hover:bg-neutral-50"
      onClick={() => navigate(`/transfers/${id}`)}
    >
      <div className="w-full overflow-hidden text-ellipsis font-medium mb-6 flex gap-4">
        <span className="grow truncate text-base">{recommended_title}</span>
        {is_owner ? (
          <FiArrowUpRight className="text-2xl min-w-fit" />
        ) : (
          <FiArrowDownLeft className="text-2xl min-w-fit" />
        )}
      </div>
      <div className="max-w-full text-neutral-500 mb-4">
        <div className="max-w-full flex items-start gap-2">
          <FaRegFolderOpen className="text-base min-w-fit mt-0.5" />
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
        </div>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <TransferStatusBadge status={status} />
        <TransferTypeBadge type={transfer_type} />
      </div>
      <div className="flex items-center pt-4 border-t border-neutral-200">
        <Button className="cursor-pointer">Download All</Button>
      </div>
    </Card>
  );
};

export default TransferSummaryCard;
