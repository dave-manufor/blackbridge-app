import GenericErrorState from "@/components/ui/GenericErrorState";
import useAppHeader from "@/hooks/context/useAppHeader";
import { useGetTransferDetailsQuery } from "@/hooks/queries";
import { AxiosError } from "axios";
import { Fragment, useEffect, useState } from "react";
import { FaArrowLeft, FaArrowRight, FaUser } from "react-icons/fa6";
import { useNavigate, useParams } from "react-router";
import { formatDistance } from "date-fns";
import { TransferStatusBadge, TransferTypeBadge } from "@/components/ui/badge";
import { AvatarFallback, AvatarImage, Avatar } from "@/components/ui/avatar";
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
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
      transferDetails.email_transfers[0].recipient_user.id === user?.id
    ) {
      markTransferAsViewed({ transfer_id: transferDetails.id });
    }
  }, [transferDetails, markTransferAsViewed, user]);

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
    <div className="flex flex-col gap-6 w-full mx-auto pb-10">
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="text-neutral-500 hover:text-neutral-900 -ml-2"
        >
          <FaArrowLeft className="mr-2" /> Back
        </Button>
      </div>

      {!isPending && isError && isNotFoundError && (
        <GenericErrorState
          className="col-span-full"
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
          className="col-span-full"
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

      {isPending && !isError && <SkeletonUi />}

      {!isPending && !isError && transferDetails && (
        <>
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-bold text-neutral-900 break-words">
                {transferDetails.recommended_title}
              </h1>
              <span className="text-neutral-500">
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
            <div className="flex items-center gap-2">
              <TransferStatusBadge
                size={"lg"}
                status={transferDetails.status}
              />
              <TransferTypeBadge
                size={"lg"}
                type={transferDetails.transfer_type}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Details & Link */}
            <div className="lg:col-span-2 flex flex-col gap-8">
              {/* Details Card */}
              <Card className="p-6 rounded-2xl shadow-sm border-neutral-100 bg-white">
                <h3 className="text-lg font-semibold text-neutral-900 mb-6 border-b border-neutral-100 pb-4">
                  Transfer Information
                </h3>
                <ul className="flex flex-col gap-0">
                  <li className="flex flex-col sm:flex-row sm:items-center gap-4 py-4 border-b border-neutral-100 last:border-0">
                    <span className="text-neutral-500 min-w-[140px]">
                      Owner
                    </span>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-10">
                        <AvatarImage
                          src={transferDetails.owner.profile_picture_url || ""}
                        />
                        <AvatarFallback>
                          {transferDetails.owner.email.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-neutral-900">
                          {transferDetails.owner.email}
                        </p>
                        <p className="text-xs text-neutral-500">Sender</p>
                      </div>
                    </div>
                  </li>

                  <li className="flex flex-col sm:flex-row gap-4 py-4 border-b border-neutral-100 last:border-0">
                    <span className="text-neutral-500 min-w-[140px]">
                      Description
                    </span>
                    <p className="text-neutral-900 flex-1">
                      {transferDetails.description ||
                        "No description available"}
                    </p>
                  </li>

                  {transferDetails.transfer_type === "EMAIL" && (
                    <li className="flex flex-col sm:flex-row gap-4 py-4 border-b border-neutral-100 last:border-0">
                      <span className="text-neutral-500 min-w-[140px]">
                        Shared with
                      </span>
                      <div className="flex flex-wrap gap-2 flex-1">
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
                              profile_url={
                                transfer.recipient_user.profile_picture_url
                              }
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

                  <li className="flex flex-col sm:flex-row sm:items-center gap-4 py-4 border-b border-neutral-100 last:border-0">
                    <span className="text-neutral-500 min-w-[140px]">
                      {transferDetails.is_expired ? "Expired " : "Expires in"}
                    </span>
                    <span className="text-neutral-900 font-medium">
                      {formatDistance(
                        new Date(transferDetails.expiration_date),
                        new Date(),
                        { addSuffix: transferDetails.is_expired }
                      )}
                    </span>
                  </li>
                </ul>
              </Card>

              {/* Link Details Card */}
              {transferDetails.transfer_type === "LINK" &&
                transferDetails.link_transfer && (
                  <Card className="p-6 rounded-2xl shadow-sm border-neutral-100 bg-white">
                    <h3 className="text-lg font-semibold text-neutral-900 mb-6 border-b border-neutral-100 pb-4">
                      Link Details
                    </h3>
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="w-full md:w-48 shrink-0 p-4 border border-neutral-200 rounded-xl flex items-center justify-center bg-white">
                        {isDecryptingFragment ? (
                          <Skeleton className="w-full aspect-square rounded-lg" />
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
                      <div className="flex-1 flex flex-col gap-6">
                        {isDecryptingFragment ? (
                          <Skeleton className="h-10 w-full rounded-lg" />
                        ) : (
                          <CopyText
                            text={sharableUrl || ""}
                            className="w-full"
                          />
                        )}
                        <div className="grid grid-cols-1 gap-4">
                          <div className="flex items-center justify-between py-2 border-b border-neutral-100">
                            <span className="text-neutral-500">
                              Access Control
                            </span>
                            <span className="font-medium text-neutral-900">
                              {prettierLinkAccessControl(
                                transferDetails.link_transfer.access_control
                              )}
                            </span>
                          </div>
                          <div className="flex items-center justify-between py-2 border-b border-neutral-100">
                            <span className="text-neutral-500">Downloads</span>
                            <span className="font-medium text-neutral-900">
                              {transferDetails.link_transfer.download_count}
                            </span>
                          </div>
                          <div className="flex items-center justify-between py-2 border-b border-neutral-100">
                            <span className="text-neutral-500">
                              Last Accessed
                            </span>
                            <span className="font-medium text-neutral-900">
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
                  </Card>
                )}
            </div>

            {/* Right Column: Files */}
            <div className="lg:col-span-1">
              <Card className="p-6 rounded-2xl shadow-sm border-neutral-100 bg-white h-full max-h-[calc(100vh-100px)] flex flex-col">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-100">
                  <h3 className="text-lg font-semibold text-neutral-900">
                    Files
                  </h3>
                  {!transferDetails.is_expired && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleDownloadAll}
                      title="Download All"
                      className="text-neutral-500 hover:text-primary-600 hover:bg-primary-50"
                    >
                      <MdOutlineFileDownload size={24} />
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm text-neutral-500 mb-4">
                  <span>
                    {transferDetails.total_files_count}{" "}
                    {`file${
                      transferDetails.total_files_count !== 1 ? "s" : ""
                    }`}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-neutral-300"></span>
                  <span>
                    {formatFileSize(transferDetails.total_files_size_bytes)}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-thin">
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
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const EmailChip = ({
  email,
  showDeleteButton,
  onDelete,
  profile_url,
}: {
  email: string;
  showDeleteButton?: boolean;
  onDelete?: () => void;
  profile_url?: string;
} & {
  showDeleteButton: boolean;
  onDelete: () => void;
}) => {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-100 rounded-lg border border-neutral-200">
      <Avatar className="size-5">
        <AvatarImage src={profile_url || ""} />
        <AvatarFallback>{email.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className="text-sm text-neutral-700 font-medium">{email}</span>
      {showDeleteButton && (
        <button
          className="text-neutral-400 hover:text-error-red-500 transition-colors"
          onClick={onDelete}
        >
          <IoCloseCircleOutline size={16} />
        </button>
      )}
    </div>
  );
};

const SkeletonUi = () => {
  return (
    <div className="flex flex-col gap-8">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-1/2 rounded-lg" />
        <Skeleton className="h-6 w-1/4 rounded-lg" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-8">
          <Card className="p-6 rounded-2xl">
            <Skeleton className="h-8 w-48 mb-6" />
            <div className="space-y-6">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </Card>
        </div>
        <div className="lg:col-span-1">
          <Card className="p-6 rounded-2xl h-full min-h-[400px]">
            <div className="flex justify-between mb-6">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <FileCardSkeleton key={index} />
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TransferDetailsView;
