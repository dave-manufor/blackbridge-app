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
import { useCallback, useEffect, useMemo, useState } from "react";
import { MdOutlineFileDownload } from "react-icons/md";
import { Navigate, useLocation, useNavigate, useParams } from "react-router";
import { StyledAvatar } from "@/components/ui/avatar";
import { FaSpinner } from "react-icons/fa6";
import { Skeleton } from "@/components/ui/skeleton";
import FileCardSkeleton from "@/components/ui/FileCardSkeleton";
import {
  Modal,
  ModalBody,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalPrimaryAction,
} from "@/components/overlay/modal";
import GenericErrorState from "@/components/ui/GenericErrorState";
import { PasswordInput } from "@/components/ui/input";
import { CryptoBridge } from "@/lib/crypto/workers/CryptoBridge";
import { devOnly } from "@/utils/dev";
import useDownloader from "@/hooks/useDownloader";
import { TRANSFER_TYPES } from "@/config/constants/transfers";
import toast from "react-hot-toast";

const PublicLinkView = () => {
  const downloader = useDownloader();
  const cryptoBridge = useMemo(() => CryptoBridge.getInstance(), []);
  const navigate = useNavigate();
  const [isNotFoundError, setIsNotFoundError] = useState(false);
  const [isServerError, setIsServerError] = useState(false);
  const [isAuthError, setIsAuthError] = useState(false);
  const [password, setPassword] = useState("");
  const [isKeyDecrypting, setIsKeyDecrypting] = useState(false);
  const [isKeyDecryptFailed, setIsKeyDecryptFailed] = useState(false);
  const [isKeyDecrypted, setIsKeyDecrypted] = useState(false);
  const storage = useMemo(() => new SessionStorageService(), []);
  const { pathname, search, hash } = useLocation();
  const fragment = useMemo(() => {
    const _fragment = hash.split("#").pop();
    return _fragment;
  }, [hash]);
  const { slug } = useParams<{ slug: string }>();
  const {
    data: linkData,
    isPending,
    isError,
    error,
  } = useGetLinkDetails({
    slug: slug || "",
  });

  const resetErrors = () => {
    setIsNotFoundError(false);
    setIsServerError(false);
    setIsAuthError(false);
  };

  const handleAuthRedirect = () => {
    // Save redirect path to session storage
    const redirectPath = `${pathname}${search ? `?${search}` : ""}${
      hash ? `${hash}` : ""
    }`;
    storage.setItem(storageKeys.AUTH.REDIRECT, redirectPath);

    //redirect to login
    navigate("/sign-in");
  };

  const checkKey = useCallback(
    async ({
      sessionKey,
      password,
    }: {
      sessionKey: string;
      password?: string;
    }): Promise<{ isValid: boolean; passphrase?: string }> => {
      if (!fragment) return { isValid: false };
      let passphrase = fragment;
      if (password) {
        passphrase += password;
      }
      try {
        await cryptoBridge.decryptSessionKey(sessionKey, {
          decryptWith: "passphrase",
          passphrase,
        });
        return { isValid: true, passphrase };
      } catch (error) {
        devOnly(() => console.error("Failed to decrypt session key", error));
        return { isValid: false };
      }
    },
    [cryptoBridge, fragment]
  );

  const handlePasswordSubmit = async () => {
    if (!linkData || !password) return;
    setIsKeyDecrypting(true);
    setIsKeyDecryptFailed(false);
    const { isValid } = await checkKey({
      sessionKey: linkData.file_key,
      password,
    });
    // Check if key decryption was successful and update state
    if (isValid) {
      setIsKeyDecrypted(true);
    } else {
      setIsKeyDecryptFailed(true);
    }
    setIsKeyDecrypting(false);
  };

  const handleDownloadAll = async () => {
    const genericErrorMessage = "Unable to download files";
    if (!linkData) {
      devOnly(() => console.error("Link data not loaded"));
      toast.error(genericErrorMessage);
      return;
    }
    const { isValid, passphrase } = await checkKey({
      sessionKey: linkData.file_key,
    });
    if (!isValid || !passphrase) {
      toast.error(genericErrorMessage);
      devOnly(() =>
        console.error(genericErrorMessage, "Invalid or missing passphrase")
      );
      return;
    }
    downloader.downloadFiles({
      transfer_identifier: linkData.slug,
      type: TRANSFER_TYPES.LINK,
      file_ids: linkData.transfer.files.map((file) => file.id),
      sessionKeyArmored: linkData.file_key,
      options: {
        sessionKeyOptions: {
          decryptWith: "passphrase",
          passphrase,
        },
      },
    });
  };

  const handleFileDownload = async (fileId: string) => {
    const genericErrorMessage = "Unable to download file";
    if (!linkData) {
      devOnly(() => console.error(genericErrorMessage, "Link data not loaded"));
      toast.error(genericErrorMessage);
      return;
    }
    const { isValid, passphrase } = await checkKey({
      sessionKey: linkData.file_key,
    });
    if (!isValid || !passphrase) {
      toast.error(genericErrorMessage);
      devOnly(() =>
        console.error(genericErrorMessage, "Invalid or missing passphrase")
      );
      return;
    }
    downloader.downloadFiles({
      transfer_identifier: linkData.slug,
      type: TRANSFER_TYPES.LINK,
      file_ids: [fileId],
      sessionKeyArmored: linkData.file_key,
      options: {
        sessionKeyOptions: {
          decryptWith: "passphrase",
          passphrase,
        },
      },
    });
  };

  useEffect(() => {
    resetErrors();
    // Check link access
    if (isError) {
      if (error instanceof AxiosError) {
        if (error.response?.status === 401) {
          // Link access requires authentication
          setIsAuthError(true);
          return;
        }
        if (error.response?.status === 403) {
          // User has insufficient permissions
          // Show permissions denied modal
          return;
        }
        if (error.response?.status === 404) {
          // Link not found
          setIsNotFoundError(true);
          return;
        }
      }
      // If we reached here, it means it's a server error or some other error
      setIsServerError(true);
      return;
    }

    // Link Data loaded
    if (linkData) {
      // If link is password protected, skip. The check will be done handlePasswordSubmit
      if (linkData.is_password_protected) {
        return;
      }

      // Attempt key decryption with fragment only
      (async () => {
        // Set loading state
        setIsKeyDecrypting(true);
        // Attempt to decrypt file key
        const { isValid } = await checkKey({
          sessionKey: linkData.file_key,
        });
        // Check if key decryption was successful and update state
        if (isValid) {
          setIsKeyDecrypted(true);
        } else {
          setIsKeyDecryptFailed(true);
        }
      })().finally(() => {
        // Reset loading state
        setIsKeyDecrypting(false);
      });
    }
  }, [linkData, isKeyDecrypted, isPending, isError, error, checkKey]);

  const readyToView =
    !isPending && !isError && !isKeyDecryptFailed && isKeyDecrypted && linkData;

  if (!slug) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      {/* Skeleton loading UI - Show while data is still fetching or key is yet to be decrypted without error*/}
      {(isPending || !isKeyDecrypted) && !isError && !isKeyDecryptFailed && (
        <SkeletonUI />
      )}
      {/* Server error UI - Show when there is a server error */}
      {!isPending && isServerError && <GenericErrorState />}
      {/* Not found error UI - Show when link is not found */}
      {!isPending && isNotFoundError && (
        <GenericErrorState
          title="We couldn’t find this transfer"
          body="The link may be incorrect, or the transfer might have been deleted or expired. Double-check the link and reach out to the owner if you think this is a mistake."
        />
      )}
      {/* Auth required UI - Show when link requires authentication */}
      {isAuthError && (
        <Modal isOpen={isAuthError} canClose={false}>
          <ModalContent>
            <ModalHeader>Sign in to view this transfer</ModalHeader>
            <ModalBody>
              The owner has protected this link so only authenticated viewers
              can access it. Please sign in to continue and securely view the
              transfer.
            </ModalBody>
            <ModalFooter>
              <ModalPrimaryAction onClick={handleAuthRedirect}>
                Sign in to continue
              </ModalPrimaryAction>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
      {/* Key decryption failed UI - Show when key decryption fails without password */}
      {!isError &&
        !isPending &&
        linkData &&
        !linkData.is_password_protected &&
        isKeyDecryptFailed && (
          <GenericErrorState
            title="We couldn’t decrypt this transfer"
            body="The link may be incorrect, or the transfer might have been deleted or expired. Double-check the link and reach out to the owner if you think this is a mistake."
          />
        )}
      {/* Password required UI - Show when link is password protected and key is yet to be decrypted */}
      {!isError &&
        !isPending &&
        linkData &&
        linkData.is_password_protected &&
        !isKeyDecrypted && (
          <Modal isOpen={true} onClose={() => navigate("/")}>
            <ModalContent>
              <ModalHeader>
                Password required{" "}
                {isKeyDecrypting && <FaSpinner className="animate-spin" />}
              </ModalHeader>
              <ModalBody>
                <p className="mb-4">
                  To open this transfer, you&apos;ll need the password set by
                  the owner. Enter it below to proceed.
                </p>
                <PasswordInput
                  className="text-black mb-2"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && password && !isKeyDecrypting) {
                      handlePasswordSubmit();
                    }
                  }}
                />
                {isKeyDecryptFailed && (
                  <span className="text-sm text-red-400 w-full">
                    Password seems to be incorrect. Ensure you are using the
                    right link and try again.
                  </span>
                )}
              </ModalBody>
              <ModalFooter>
                <ModalClose />
                <ModalPrimaryAction
                  disabled={!password || isKeyDecrypting}
                  onClick={handlePasswordSubmit}
                >
                  Unlock Transfer
                </ModalPrimaryAction>
              </ModalFooter>
            </ModalContent>
          </Modal>
        )}
      {/* Ready to view UI - Show when all conditions are met and data is loaded*/}
      {readyToView && linkData && (
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
              <StyledAvatar
                profile_url={
                  linkData.transfer.owner.profile_picture || undefined
                }
                className="hidden max-sm:flex"
              />
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
                  <div
                    className={styles.files_download_icon}
                    onClick={handleDownloadAll}
                  >
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
                    allowDownload={true} // Link details are only returned if not expired
                    onDownload={() => {
                      handleFileDownload(file.id);
                    }}
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
          <div className={styles.description_text}>
            <Skeleton className="h-4 w-full mx-auto mb-2" />
            <Skeleton className="h-4 w-2/3 mx-auto mb-2" />
            <Skeleton className="h-4 w-1/2 mx-auto" />
          </div>
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
