import transferStyles from "./TransferStyles.module.css";
import styles from "./TransferDetailsView.module.css";
import GenericErrorState from "@/components/ui/GenericErrorState";
import GridSection from "@/components/ui/GridSection";
import useAppHeader from "@/hooks/context/useAppHeader";
import { useGetTransferDetailsQuery } from "@/hooks/queries";
import { AxiosError } from "axios";
import { Fragment, useEffect, useState } from "react";
import { FaArrowLeft, FaArrowRight, FaUser } from "react-icons/fa6";
import { useNavigate, useParams } from "react-router";
import { formatDistance } from "date-fns";
import { TransferStatusBadge, TransferTypeBadge } from "@/components/ui/badge";
import { Avatar } from "@radix-ui/react-avatar";
import { AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/stores/authStore";
import { formatFileSize, prettierLinkAccessControl } from "@/utils/format";
import { MdOutlineFileDownload } from "react-icons/md";
import { IoCloseCircleOutline } from "react-icons/io5";
import CopyText from "@/components/ui/CopyText";
import {
  BASE_SHAREABLE_URL,
  TRANSFER_INVITATION_STATUS,
  TRANSFER_TYPES,
} from "@/config/constants/transfers";
import { CryptoBridge } from "@/lib/crypto/workers/CryptoBridge";
import QRCode from "react-qr-code";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarkTransferAsViewedMutation } from "@/hooks/mutations";
import FileCard from "@/components/ui/FileCard";
import FileCardSkeleton from "@/components/ui/FileCardSkeleton";
import useDownloader from "@/hooks/useDownloader";

const TransferDetailsView = () => {
  const cryptoBridge = CryptoBridge.getInstance();
  const downloader = useDownloader();
  const navigate = useNavigate();
  const [isNotFoundError, setIsNotFoundError] = useState(false);
  const [sharableUrl, setSharableUrl] = useState("");
  const [isDecryptingFragment, setIsDecryptingFragment] = useState(false);
  const { setHeaderTitle } = useAppHeader();
  const { transferID } = useParams();
  const user = useAuthStore((state) => state.user);
  const { mutate: markTransferAsViewed } = useMarkTransferAsViewedMutation();

  const {
    data: transferDetails,
    isPending,
    isError,
    error,
  } = useGetTransferDetailsQuery(transferID || "");

  useEffect(() => {
    setHeaderTitle(`Transfer Details`);
  }, [transferID, setHeaderTitle]);

  useEffect(() => {
    if (isError && error instanceof AxiosError) {
      if (error.response?.status === 404) {
        setIsNotFoundError(true);
      }
    }
  }, [isError, error]);

  useEffect(() => {
    let isMounted = true;

    if (transferDetails && transferDetails.transfer_type === "LINK") {
      setIsDecryptingFragment(true);

      (async () => {
        if (transferDetails.link_transfer?.encrypted_fragment) {
          try {
            const fragment = await cryptoBridge.decryptFragment(
              transferDetails.link_transfer.encrypted_fragment
            );

            if (isMounted) {
              setSharableUrl(
                `${BASE_SHAREABLE_URL}${transferDetails.link_transfer.slug}#${fragment}`
              );
            }
          } catch (error) {
            console.error("Failed to decrypt fragment:", error);
            // TODO: display a user-friendly error message or fallback UI
          }
        }
      })().finally(() => {
        if (isMounted) {
          setIsDecryptingFragment(false);
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [transferDetails, cryptoBridge]);

  useEffect(() => {
    if (
      transferDetails &&
      transferDetails.transfer_type === TRANSFER_TYPES.EMAIL &&
      !transferDetails.is_owner
    ) {
      markTransferAsViewed({ transfer_id: transferDetails.id });
    }
  }, [transferDetails, markTransferAsViewed]);

  const handleDownloadAll = () => {
    if (!transferDetails) return;
    downloader.downloadFiles({
      transfer_identifier:
        transferDetails.transfer_type === TRANSFER_TYPES.EMAIL
          ? transferDetails.id
          : transferDetails.link_transfer?.slug || "",
      type: transferDetails.transfer_type,
      file_ids: transferDetails.files.map((file) => file.id),
      sessionKeyArmored: transferDetails.is_owner
        ? transferDetails.owner_file_key
        : transferDetails.email_transfers[0].file_key,
      options: {
        sessionKeyOptions: {
          decryptWith: "privateKey",
        },
      },
    });
  };

  const handleFileDownload = (fileId: string) => {
    if (!transferDetails) return;

    downloader.downloadFiles({
      transfer_identifier:
        transferDetails.transfer_type === TRANSFER_TYPES.EMAIL
          ? transferDetails.id
          : transferDetails.link_transfer?.slug || "",
      type: transferDetails.transfer_type,
      file_ids: [fileId],
      sessionKeyArmored: transferDetails.is_owner
        ? transferDetails.owner_file_key
        : transferDetails.email_transfers[0].file_key,
      options: {
        sessionKeyOptions: {
          decryptWith: "privateKey",
        },
      },
    });
  };

  return (
    <>
      <GridSection>
        <div className="col-span-full pb-4 mb-8 border-b border-neutral-200">
          <span
            onClick={() => navigate(-1)}
            className="flex text-sm items-center gap-2 hover:underline cursor-pointer"
          >
            <FaArrowLeft /> Back
          </span>
        </div>
        {!isPending && isError && isNotFoundError && (
          <GenericErrorState
            className={transferStyles.state}
            title="We couldn't find this transfer"
            body="It looks like this transfer doesn't exist anymore. Double-check the link, or reach out to the sender if you think this is a mistake."
            primaryAction={() => navigate("/transfers")}
            primaryActionLabel={
              <Fragment>
                View all transfers <FaArrowRight />
              </Fragment>
            }
          />
        )}
        {!isPending && isError && !isNotFoundError && (
          <GenericErrorState
            className={transferStyles.state}
            title="Error fetching transfer details"
            body="There was an error fetching the transfer details. Please try again later."
            primaryAction={() => navigate("/transfers")}
            primaryActionLabel={
              <Fragment>
                View all transfers <FaArrowRight />
              </Fragment>
            }
          />
        )}
      </GridSection>
      {isPending && !isError && <SkeletonUi />}
      {!isPending && !isError && transferDetails && (
        <>
          <GridSection>
            {/* Header */}
            <section className={styles.header_section}>
              <div className={styles.header_info}>
                <span className={styles.header_title}>
                  {transferDetails.recommended_title}
                </span>
                <span className={styles.header_meta}>
                  {`${
                    transferDetails.transfer_type === "LINK"
                      ? "Created"
                      : transferDetails.is_owner
                      ? "Sent"
                      : "Received"
                  } `}
                  {formatDistance(
                    new Date(transferDetails.created_at),
                    new Date(),
                    { addSuffix: true }
                  )}
                </span>
              </div>
              <div className={styles.header_badges}>
                <TransferStatusBadge
                  size={"lg"}
                  status={transferDetails.status}
                />
                <TransferTypeBadge
                  size={"lg"}
                  type={transferDetails.transfer_type}
                />
              </div>
            </section>
          </GridSection>

          {/* Details */}
          <GridSection>
            <section className={styles.details_section}>
              <ul className={styles.details_list}>
                <li className={styles.detail}>
                  <span className={styles.detail_name}>Owner</span>
                  <div className="flex items-center gap-4">
                    <Avatar className="rounded-md w-10 h-10">
                      <AvatarImage
                        src={transferDetails.owner.profile_picture || ""}
                      />
                      <AvatarFallback className="bg-gray-200 text-gray-600 rounded-md">
                        <FaUser />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start">
                      <span>
                        {transferDetails.owner.email}
                        {transferDetails.is_owner && " (You)"}
                      </span>
                    </div>
                  </div>
                </li>
                <li className={styles.detail}>
                  <span className={`mb-auto ${styles.detail_name}`}>
                    Description
                  </span>
                  <p className="!text-black">
                    {transferDetails.description || "No description available"}
                  </p>
                </li>
                {transferDetails.transfer_type === "EMAIL" && (
                  <li className={styles.detail}>
                    <span className={`mb-auto ${styles.detail_name}`}>
                      Shared with
                    </span>
                    <div
                      className={`${styles.email_chips} scrollbar-always-visible`}
                    >
                      {transferDetails.email_transfers.map((transfer) => {
                        const label = `${transfer.recipient_user.email}${
                          transfer.recipient_user.id === user?.id
                            ? " (You)"
                            : ""
                        }`;

                        return (
                          <EmailChip
                            key={transfer.id}
                            email={label}
                            showDeleteButton={
                              transferDetails.is_owner &&
                              transfer.recipient_user.id !== user?.id
                            }
                            onDelete={() => {}}
                          />
                        );
                      })}
                      {transferDetails.is_owner &&
                        transferDetails.invites &&
                        transferDetails.invites
                          .filter(
                            (invite) =>
                              invite.status !==
                              TRANSFER_INVITATION_STATUS.APPROVED
                          )
                          .map((invite) => (
                            <EmailChip
                              key={invite.id}
                              email={`${invite.email} (Pending)`}
                              showDeleteButton={transferDetails.is_owner}
                              onDelete={() => {}}
                            />
                          ))}
                    </div>
                  </li>
                )}
                <li className={styles.detail}>
                  <span className={styles.detail_name}>
                    {transferDetails.is_expired ? "Expired " : "Expires in"}
                  </span>
                  <span>
                    {formatDistance(
                      new Date(transferDetails.expiration_date),
                      new Date(),
                      { addSuffix: transferDetails.is_expired }
                    )}
                  </span>
                </li>
              </ul>
            </section>
            {/* Files list */}
            <section className={styles.files_section}>
              <div className={styles.files_header}>
                <h3 className={styles.files_title}>Files</h3>
                <div className={styles.files_info}>
                  <div className={styles.files_summary}>
                    <span>
                      {transferDetails.total_files_count}{" "}
                      {`file${
                        transferDetails.total_files_count !== 1 ? "s" : ""
                      }`}
                    </span>
                    |
                    <span>
                      {formatFileSize(transferDetails.total_files_size_bytes)}
                    </span>
                  </div>
                  {!transferDetails.is_expired && (
                    <div
                      className={styles.files_download_icon}
                      onClick={handleDownloadAll}
                      title="Download All"
                    >
                      <MdOutlineFileDownload />
                    </div>
                  )}
                </div>
              </div>
              <div className={styles.files_list}>
                {transferDetails.files.map((file) => (
                  <FileCard
                    key={file.id}
                    name={file.name}
                    contentType={file.content_type}
                    size={file.size}
                    allowDownload={!transferDetails.is_expired}
                    onDownload={() => {
                      handleFileDownload(file.id);
                    }}
                  />
                ))}
              </div>
            </section>
            {/* Link Details */}
            {transferDetails.transfer_type === "LINK" &&
              transferDetails.link_transfer && (
                <section className={styles.link_section}>
                  <div className={styles.link_header}>
                    <span className={styles.link_title}>Link Details</span>
                  </div>
                  <div className={styles.link_container}>
                    <div className={styles.qr_code}>
                      {isDecryptingFragment ? (
                        <Skeleton className="w-full aspect-square" />
                      ) : (
                        <QRCode
                          value={sharableUrl || ""}
                          style={{
                            height: "auto",
                            width: "100%",
                            maxWidth: "100%",
                          }}
                        />
                      )}
                    </div>
                    <div className={styles.link_details}>
                      {isDecryptingFragment ? (
                        <Skeleton className="h-8 w-full" />
                      ) : (
                        <CopyText
                          text={sharableUrl || ""}
                          className={styles.copy_link}
                        />
                      )}
                      <div className={styles.link_meta}>
                        <div className={styles.link_detail}>
                          <span>Access Control:</span>
                          <span>
                            {prettierLinkAccessControl(
                              transferDetails.link_transfer.access_control
                            )}
                          </span>
                        </div>
                        <div className={styles.link_detail}>
                          <span>Downloads:</span>
                          <span>
                            {transferDetails.link_transfer.download_count}
                          </span>
                        </div>
                        <div className={styles.link_detail}>
                          <span>Last Accessed:</span>
                          <span>
                            {transferDetails.link_transfer.last_accessed
                              ? formatDistance(
                                  new Date(
                                    transferDetails.link_transfer.last_accessed
                                  ),
                                  new Date(),
                                  { addSuffix: true }
                                )
                              : "Never"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              )}
          </GridSection>
        </>
      )}
    </>
  );
};

const EmailChip = ({
  email,
  showDeleteButton,
  onDelete,
}: {
  email: string;
  showDeleteButton?: boolean;
  onDelete?: () => void;
} & {
  showDeleteButton: boolean;
  onDelete: () => void;
}) => {
  return (
    <div className={styles.email_chip}>
      <span className={styles.email_text}>{email}</span>
      {showDeleteButton && (
        <button className={styles.email_delete_button} onClick={onDelete}>
          <IoCloseCircleOutline />
        </button>
      )}
    </div>
  );
};

const SkeletonUi = () => {
  return (
    <>
      <GridSection>
        {/* Header */}
        <section className={styles.header_section}>
          <div className={styles.header_info}>
            <span className={styles.header_title}>
              <Skeleton className="h-8 w-96" />
            </span>
            <span className={styles.header_meta}>
              <Skeleton className="h-4 w-48" />
            </span>
          </div>
          <div className={styles.header_badges}>
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
        </section>
      </GridSection>

      {/* Details */}
      <GridSection>
        <section className={styles.details_section}>
          <ul className={styles.details_list}>
            <li className={styles.detail}>
              <span className={`mb-auto ${styles.detail_name}`}>
                <Skeleton className="h-4 w-32" />
              </span>
              <Skeleton className="h-4 w-48" />
            </li>
            <li className={styles.detail}>
              <span className={`mb-auto ${styles.detail_name}`}>
                <Skeleton className="h-4 w-32" />
              </span>
              <Skeleton className="h-4 w-48" />
            </li>
            <li className={styles.detail}>
              <span className={`mb-auto ${styles.detail_name}`}>
                <Skeleton className="h-4 w-32" />
              </span>
              <Skeleton className="h-4 w-48" />
            </li>
          </ul>
        </section>
        {/* Files list */}
        <section className={styles.files_section}>
          <div className={styles.files_header}>
            <h3 className={styles.files_title}>
              <Skeleton className="h-6 w-24 mb-2" />
            </h3>
            <div className={styles.files_info}>
              <div className={styles.files_summary}>
                <span>
                  <Skeleton className="h-4 w-20" />
                </span>
                |
                <span>
                  <Skeleton className="h-4 w-20" />
                </span>
              </div>
              <Skeleton className="size-8" />
            </div>
          </div>
          <div className={styles.files_list}>
            {Array.from({ length: 4 }).map((_, index) => (
              <FileCardSkeleton key={index} />
            ))}
          </div>
        </section>
        {/* Link Details */}
        <section className={styles.link_section}>
          <div className={styles.link_header}>
            <span className={styles.link_title}>
              <Skeleton className="h-6 w-32" />
            </span>
          </div>
          <div className={styles.link_container}>
            <div className={styles.qr_code}>
              <Skeleton className="w-full aspect-square" />
            </div>
            <div className={styles.link_details}>
              <Skeleton className="h-8 w-full" />
              <div className={styles.link_meta}>
                <div className={styles.link_detail}>
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className={styles.link_detail}>
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className={styles.link_detail}>
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </GridSection>
    </>
  );
};

export default TransferDetailsView;
