import transferStyles from "./TransferStyles.module.css";
import styles from "./TransferDetailsView.module.css";
import GenericErrorState from "@/components/ui/GenericErrorState";
import GridSection from "@/components/ui/GridSection";
import useAppHeader from "@/hooks/context/useAppHeader";
import { useGetTransferDetailsQuery } from "@/hooks/queries";
import { AxiosError } from "axios";
import { Fragment, useEffect, useState } from "react";
import { FaArrowLeft, FaArrowRight, FaUser } from "react-icons/fa6";
import { Link, useNavigate, useParams } from "react-router";
import { formatDistance } from "date-fns";
import { TransferStatusBadge, TransferTypeBadge } from "@/components/ui/badge";
import { Avatar } from "@radix-ui/react-avatar";
import { AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/stores/authStore";
import { formatFileSize } from "@/utils/format";
import { MdOutlineFileDownload } from "react-icons/md";
import { TransferDetailsData } from "@/api/services/transferService";
import { defaultStyles, FileIcon } from "react-file-icon";
import { IoCloseCircleOutline } from "react-icons/io5";

const TransferDetailsView = () => {
  const navigate = useNavigate();
  const [isNotFoundError, setIsNotFoundError] = useState(false);
  const { setHeaderTitle } = useAppHeader();
  const { transferID } = useParams();
  const user = useAuthStore((state) => state.user);

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

  return (
    <GridSection>
      <div className="col-span-full pb-4 mb-8 border-b border-neutral-200">
        <Link
          to="/transfers"
          className="flex text-sm items-center gap-2 hover:underline"
        >
          <FaArrowLeft /> Back to Transfers
        </Link>
      </div>
      {!isPending && isError && isNotFoundError && (
        <GenericErrorState
          className={transferStyles.state}
          title="We couldn't find that transfer"
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
      {!isPending && transferDetails && (
        <>
          {/* Header */}
          <section className={styles.header_section}>
            <div className={styles.header_info}>
              <span className={styles.header_title}>
                {transferDetails.recommended_title}
              </span>
              <span className={styles.header_meta}>
                {`${transferDetails.is_owner ? "Sent" : "Received"} `}
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
          {/* Details */}
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
                <p className="!text-black">{transferDetails.description}</p>
              </li>
              <li className={styles.detail}>
                <span className={`mb-auto ${styles.detail_name}`}>
                  Shared with
                </span>
                <div
                  className={`${styles.email_chips} scrollbar-always-visible`}
                >
                  {transferDetails.email_transfers.map((transfer) => {
                    const label = `${transfer.recipient_user.email}${
                      transfer.recipient_user.id === user?.id ? " (You)" : ""
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
                </div>
              </li>
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
                <div className={styles.files_download_icon}>
                  <MdOutlineFileDownload />
                </div>
              </div>
            </div>
            <ul className={styles.files_list}>
              {transferDetails.files.map((file) => (
                <FileCard key={file.id} file={file} />
              ))}
            </ul>
          </section>
        </>
      )}
    </GridSection>
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

const FileCard = ({ file }: { file: TransferDetailsData["files"][0] }) => {
  const iconStyle =
    defaultStyles[file.content_type as keyof typeof defaultStyles];
  return (
    <li className={styles.file_item}>
      <div className={styles.file_info}>
        <div className={styles.file_icon}>
          <FileIcon extension={file.name.split(".").pop()} {...iconStyle} />
        </div>
        <div className={styles.file_details}>
          <span className={styles.file_name}>{file.name}</span>
          <span className={styles.file_meta}>
            {file.size ? formatFileSize(file.size) : "Unknown size"} |{" "}
            {file.content_type || "Unknown type"}
          </span>
        </div>
      </div>
      <div className={styles.files_download_icon}>
        <MdOutlineFileDownload />
      </div>
    </li>
  );
};

export default TransferDetailsView;
