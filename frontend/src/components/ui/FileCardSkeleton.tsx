import styles from "./FileCard.module.css";
import { Skeleton } from "./skeleton";

const FileCardSkeleton = () => {
  return (
    <div className={styles.file_item}>
      <div className={styles.file_info}>
        <Skeleton className="size-8" />
        <div className={styles.file_details}>
          <span className={styles.file_name}>
            <Skeleton className="h-4 w-48 mb-2" />
          </span>
          <span className={styles.file_meta}>
            <Skeleton className="h-4 w-32" />
          </span>
        </div>
      </div>
      <Skeleton className="size-8" />
    </div>
  );
};

export default FileCardSkeleton;
