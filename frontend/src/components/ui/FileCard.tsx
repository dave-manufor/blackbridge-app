import { formatFileSize } from "@/utils/format";
import { defaultStyles, FileIcon } from "react-file-icon";
import { MdOutlineFileDownload } from "react-icons/md";
import { IoCloseCircleOutline } from "react-icons/io5";
import { cn } from "@/lib/utils";

type BaseCard = {
  contentType: string;
  name: string;
  size: number;
  allowDownload: boolean;
  onClick?: () => void;
  className?: string;
};

type DownloadableCard = BaseCard & {
  variant?: "downloadable";
  onDownload: () => void;
  onRemove?: () => void;
};

type FormCard = BaseCard & {
  variant: "form";
  onDownload?: () => void;
  onRemove: () => void; // required
};

type FileCard = DownloadableCard | FormCard;

const FileCard = ({
  variant,
  contentType,
  name,
  size,
  allowDownload,
  onDownload,
  onRemove,
  onClick,
  className,
}: FileCard) => {
  variant = variant || "downloadable"; // default to downloadable
  const iconStyle = defaultStyles[contentType as keyof typeof defaultStyles];
  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 transition-colors w-full max-w-full",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3 overflow-hidden flex-1">
        <div className="w-8 shrink-0">
          <FileIcon extension={name.split(".").pop()} {...iconStyle} />
        </div>
        <div className="flex flex-col items-start overflow-hidden min-w-0">
          <span className="text-sm font-medium text-neutral-900 truncate w-full block">
            {name}
          </span>
          <span className="text-xs text-neutral-500 truncate w-full block">
            {formatFileSize(size)} | {contentType || "Unknown type"}
          </span>
        </div>
      </div>
      {variant === "downloadable" && allowDownload && onDownload && (
        <button
          className="p-2 rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onDownload();
          }}
        >
          <MdOutlineFileDownload className="text-xl" />
        </button>
      )}
      {variant === "form" && onRemove && (
        <button
          className="p-2 rounded-md text-neutral-400 hover:bg-red-50 hover:text-red-500 transition-colors shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <IoCloseCircleOutline className="text-xl" />
        </button>
      )}
    </div>
  );
};

export default FileCard;
