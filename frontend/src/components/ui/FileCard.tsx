import { formatFileSize } from "@/utils/format";
import styles from "./FileCard.module.css";
import { defaultStyles, FileIcon } from "react-file-icon";
import { MdOutlineFileDownload } from "react-icons/md";
import { IoCloseCircleOutline } from "react-icons/io5";

type BaseCard = {
  contentType: string;
  name: string;
  size: number;
  allowDownload: boolean;
  onClick?: () => void;
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
}: FileCard) => {
  variant = variant || "downloadable"; // default to downloadable
  const iconStyle = defaultStyles[contentType as keyof typeof defaultStyles];
  return (
    <div className={styles.file_item} onClick={onClick}>
      <div className={styles.file_info}>
        <div className={styles.file_icon}>
          <FileIcon extension={name.split(".").pop()} {...iconStyle} />
        </div>
        <div className={styles.file_details}>
          <span className={styles.file_name}>{name}</span>
          <span className={styles.file_meta}>
            {formatFileSize(size)} | {contentType || "Unknown type"}
          </span>
        </div>
      </div>
      {variant === "downloadable" && allowDownload && (
        <div className={styles.file_action_icon} onClick={onDownload}>
          <MdOutlineFileDownload />
        </div>
      )}
      {variant === "form" && (
        <div className={styles.file_action_icon} onClick={onRemove}>
          <IoCloseCircleOutline />
        </div>
      )}
    </div>
  );
};

export default FileCard;
