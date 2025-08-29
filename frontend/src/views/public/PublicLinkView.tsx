import FileCard from "@/components/ui/FileCard";
import styles from "./PublicLinkView.module.css";
import GridSection from "@/components/ui/GridSection";
import ProfileSummary from "@/components/ui/ProfileSummary";
import storageKeys from "@/config/constants/storageKeys";
import { useGetLinkDetails } from "@/hooks/queries";
import { SessionStorageService } from "@/lib/WebStorageService";
import { formatFileSize } from "@/utils/format";
import { AxiosError } from "axios";
import { formatDistance } from "date-fns";
import { useMemo, useState } from "react";
import { MdOutlineFileDownload } from "react-icons/md";
import { Navigate, useLocation, useParams } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FaUser } from "react-icons/fa6";
import { Skeleton } from "@/components/ui/skeleton";
import FileCardSkeleton from "@/components/ui/FileCardSkeleton";

const PublicLinkView = () => {
  const [isKeyDecrypted, setIsKeyDecrypted] = useState(false);
  const storage = useMemo(() => new SessionStorageService(), []);
  const { pathname, search, hash } = useLocation();
  const { slug } = useParams<{ slug: string }>();
  const {
    data: linkData,
    isPending,
    isError,
    error,
  } = useGetLinkDetails({
    slug: slug || "",
  });

  if (isError && error instanceof AxiosError) {
    if (error.response?.status === 401) {
      // Link access requires authentication

      // Save redirect path to session storage
      const redirectPath = `${pathname}${search ? `?${search}` : ""}${
        hash ? `#${hash}` : ""
      }`;
      storage.setItem(storageKeys.AUTH.REDIRECT, redirectPath);

      //redirect to login
      return <Navigate to="/sign-in" replace />;
    }
  }

  if (!slug) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      {(isPending && !isError) || (!isKeyDecrypted && <SkeletonUI />)}
      {!isPending && !isError && linkData && isKeyDecrypted && (
        <>
          <GridSection>
            <div className={styles.header}>
              <div className={styles.header_info}>
                <span className={styles.header_title}>
                  {linkData.recommended_title}
                </span>
                <span className={styles.header_meta}>
                  Created{" "}
                  {formatDistance(new Date(linkData.created_at), new Date(), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              <div className="max-sm:hidden">
                <ProfileSummary
                  email={linkData.transfer.owner.email}
                  profile_url={linkData.transfer.owner.profile_picture || ""}
                  className={styles.profile_summary}
                />
              </div>
              <Avatar className="rounded-md w-10 h-10 hidden max-sm:flex">
                <AvatarImage
                  src={linkData.transfer.owner.profile_picture || ""}
                />
                <AvatarFallback className="bg-gray-200 text-gray-600 rounded-md">
                  <FaUser />
                </AvatarFallback>
              </Avatar>
            </div>
          </GridSection>
          <GridSection>
            {linkData.transfer.description && (
              <div className={styles.description_wrapper}>
                <h4 className={styles.description_title}>Description</h4>
                <p className={styles.description_text}>
                  {linkData.transfer.description}
                </p>
              </div>
            )}
            <div className={styles.files_section}>
              <div className={styles.files_header}>
                <h3 className={styles.files_title}>Files</h3>
                <div className={styles.files_info}>
                  <div className={styles.files_summary}>
                    <span>
                      {linkData.total_files_count}{" "}
                      {`file${linkData.total_files_count !== 1 ? "s" : ""}`}
                    </span>
                    |
                    <span>
                      {formatFileSize(linkData.total_files_size_bytes)}
                    </span>
                  </div>
                  <div className={styles.files_download_icon}>
                    <MdOutlineFileDownload />
                  </div>
                </div>
              </div>
              <div className={styles.files_list}>
                {linkData.transfer.files.map((file) => (
                  <FileCard
                    key={file.id}
                    name={file.name}
                    size={file.size}
                    contentType={file.content_type}
                    onDownload={() => {}}
                  />
                ))}
              </div>
            </div>
          </GridSection>
        </>
      )}
    </>
  );
};

const SkeletonUI = () => {
  return (
    <>
      <GridSection>
        <div className={styles.header}>
          <div className={styles.header_info}>
            <span className={styles.header_title}>
              <Skeleton className="h-8 w-64 mb-2" />
            </span>
            <span className={styles.header_meta}>
              <Skeleton className="h-4 w-32" />
            </span>
          </div>
          <div className="max-sm:hidden">
            <div className={styles.profile_summary}>
              <div className="flex items-center gap-3">
                <Skeleton className="size-12 rounded-md" />
                <div className="flex flex-col items-start flex-1 overflow-hidden">
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </div>
          </div>
          <Skeleton className="size-12 rounded-md hidden max-sm:flex" />
        </div>
      </GridSection>
      <GridSection>
        <div className={styles.description_wrapper}>
          <h4 className={styles.description_title}>
            <Skeleton className="h-6 w-24 mx-auto" />
          </h4>
          <p className={styles.description_text}>
            <Skeleton className="h-4 w-full mx-auto mb-2" />
            <Skeleton className="h-4 w-2/3 mx-auto mb-2" />
            <Skeleton className="h-4 w-1/2 mx-auto" />
          </p>
        </div>
        <div className={styles.files_section}>
          <div className={styles.files_header}>
            <h3 className={styles.files_title}>
              <Skeleton className="h-6 w-24" />
            </h3>
            <div className={styles.files_info}>
              <div className={styles.files_summary}>
                <span>
                  <Skeleton className="h-4 w-16" />
                </span>
                |
                <span>
                  <Skeleton className="h-4 w-24" />
                </span>
              </div>
              <div className={styles.files_download_icon}>
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
          </div>
          <div className={styles.files_list}>
            {Array.from({ length: 4 }).map((_, index) => (
              <FileCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </GridSection>
    </>
  );
};

export default PublicLinkView;
