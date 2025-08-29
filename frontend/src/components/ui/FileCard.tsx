import { formatFileSize } from "@/utils/format";
import styles from "./FileCard.module.css";
import { defaultStyles, FileIcon } from "react-file-icon";
import { MdOutlineFileDownload } from "react-icons/md";

const FileCard = ({
  contentType,
  name,
  size,
  onDownload,
}: {
  contentType: string;
  name: string;
  size: number;
  onDownload: () => void;
}) => {
  const iconStyle = defaultStyles[contentType as keyof typeof defaultStyles];
  return (
    <div className={styles.file_item}>
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
      <div className={styles.file_download_icon} onClick={onDownload}>
        <MdOutlineFileDownload />
      </div>
    </div>
  );
};

export default FileCard;
