import { cn, getContrastingTextColor } from "@/lib/utils";
import FileCard from "@/components/ui/FileCard";
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
import { useAuthStore } from "@/stores/authStore";
import { useShallow } from "zustand/react/shallow";
import LogoWhite from "@/assets/img/blackbridge-logo.svg";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GoHome } from "react-icons/go";
import { MdLogout } from "react-icons/md";
import { IoMenu } from "react-icons/io5";
import { Card } from "@/components/ui/card";

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

  const { authenticated, user, signOut } = useAuthStore(
    useShallow((state) => ({
      authenticated: state.authenticated,
      user: state.user,
      signOut: state.signOut,
    }))
  );

  const handleSignOut = async () => {
    await signOut();
    navigate("/sign-in");
  };

  const displayLogo = linkData?.brand_settings?.logo_url || LogoWhite;
  const headerBackgroundColor =
    linkData?.brand_settings?.primary_color || "bg-sidebar";
  const headerTextColor = getContrastingTextColor(headerBackgroundColor);

  console.log("displayLogo", linkData?.brand_settings);

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
      password,
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
      password,
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
    <div className="w-screen min-h-screen bg-surface-50">
      <header
        className="w-full px-6 h-22 flex items-center justify-between"
        style={{
          backgroundColor: headerBackgroundColor.startsWith("#")
            ? headerBackgroundColor
            : "#000",
        }}
      >
        <img
          src={displayLogo}
          alt="Blackbridge Logo"
          className="max-w-[154px] h-auto"
        />
        {authenticated && user ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="outline-none">
              <div className="max-sm:hidden cursor-pointer">
                <ProfileSummary
                  email={user.email}
                  profile_url={user.profile_picture_url || undefined}
                  subText="Free plan"
                  className="text-white cursor-pointer"
                  dark={headerTextColor === "#000000"}
                />
              </div>
              <StyledAvatar
                profile_url={user.profile_picture_url || undefined}
                className="hidden max-sm:flex cursor-pointer"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" className="p-2 mt-2 w-full">
              <DropdownMenuItem
                onClick={() => navigate("/")}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <GoHome />
                  <span>Go to Dashboard</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleSignOut()}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <MdLogout />
                  <span>Log Out</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <>
            <div className="flex items-center gap-2 max-sm:hidden">
              <Button
                onClick={() => navigate("/sign-in")}
                variant={"link"}
                className="text-white"
                style={{ color: headerTextColor }}
              >
                Sign In
              </Button>
              <Button
                onClick={() => navigate("/sign-up")}
                variant={"default"}
                className={cn(`text-[${headerTextColor}]`, {
                  "bg-black text-white hover:bg-neutral-700":
                    headerTextColor === "#FFFFFF",
                  "bg-white text-black hover:bg-neutral-200":
                    headerTextColor === "#000000",
                })}
              >
                Create Account
              </Button>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger className="outline-none hidden max-sm:flex">
                <IoMenu className="text-white text-3xl" />
              </DropdownMenuTrigger>
              <DropdownMenuContent side="bottom" className="p-2 mt-2 w-full">
                <DropdownMenuItem
                  onClick={() => navigate("/")}
                  className="cursor-pointer"
                >
                  <span className="text-center w-full">Sign In</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleSignOut()}
                  className="cursor-pointer"
                >
                  <Button>Create Account</Button>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </header>
      <main className="w-full max-w-[1504px] mx-auto px-8 py-8 max-sm:px-6">
        <div className="w-full max-w-4xl mx-auto">
          {/* Skeleton loading UI - Show while data is still fetching or key is yet to be decrypted without error*/}
          {(isPending || !isKeyDecrypted) &&
            !isError &&
            !isKeyDecryptFailed && <SkeletonUI />}
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
                  The owner has protected this link so only authenticated
                  viewers can access it. Please sign in to continue and securely
                  view the transfer.
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
                      To open this transfer, you&apos;ll need the password set
                      by the owner. Enter it below to proceed.
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
            <div className="flex flex-col gap-8">
              <Card className="p-6">
                <div className="flex items-center justify-between gap-16 border-b border-neutral-200 pb-2 max-md:flex-wrap-reverse max-md:gap-x-8 max-md:gap-y-4">
                  <div className="flex-grow flex flex-col items-start">
                    <span className="max-w-[90%] text-2xl font-semibold line-clamp-2 max-lg:max-w-full max-sm:line-clamp-3 max-sm:text-xl">
                      {linkData.recommended_title}
                    </span>
                    <span className="text-sm font-normal text-neutral-400">
                      Created{" "}
                      {formatDistance(
                        new Date(linkData.created_at),
                        new Date(),
                        {
                          addSuffix: true,
                        }
                      )}
                    </span>
                  </div>
                  <div className="max-sm:hidden">
                    <ProfileSummary
                      dark={true}
                      email={
                        linkData.brand_settings?.name ||
                        linkData.transfer.owner.email
                      }
                      profile_url={
                        linkData.brand_settings?.logo_mark_url ||
                        linkData.transfer.owner.profile_picture_url ||
                        ""
                      }
                      className="text-neutral-900"
                    />
                  </div>
                  <StyledAvatar
                    profile_url={
                      linkData.brand_settings?.logo_mark_url ||
                      linkData.transfer.owner.profile_picture_url ||
                      undefined
                    }
                    className="hidden max-sm:flex"
                  />
                </div>
              </Card>
              
              <Card className="p-6 flex flex-col gap-8">
                {linkData.transfer.description && (
                  <div className="text-center max-w-2xl mx-auto">
                    <h4 className="text-lg font-semibold mb-2">Description</h4>
                    <p className="text-base font-normal text-neutral-400">
                      {linkData.transfer.description}
                    </p>
                  </div>
                )}
                <div className="w-full max-w-2xl mx-auto">
                  <div className="w-full flex flex-col items-start border-b border-neutral-200 pb-2 mb-2">
                    <h3 className="text-lg font-semibold">Files</h3>
                    <div className="w-full flex items-center justify-between gap-4 text-neutral-400 -mt-1">
                      <div className="flex items-center gap-2">
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
                        className="text-2xl text-black p-2 rounded-md cursor-pointer hover:bg-neutral-100"
                        onClick={handleDownloadAll}
                      >
                        <MdOutlineFileDownload />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 w-full">
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
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const SkeletonUI = () => {
  return (
    <div className="flex flex-col gap-8">
      <Card className="p-6">
        <div className="flex items-center justify-between gap-16 border-b border-neutral-200 pb-2 max-md:flex-wrap-reverse max-md:gap-x-8 max-md:gap-y-4">
          <div className="flex-grow flex flex-col items-start">
            <span className="max-w-[90%] text-2xl font-semibold line-clamp-2 max-lg:max-w-full max-sm:line-clamp-3 max-sm:text-xl">
              <Skeleton className="h-8 w-64 mb-2" />
            </span>
            <span className="text-sm font-normal text-neutral-400">
              <Skeleton className="h-4 w-32" />
            </span>
          </div>
          <div className="max-sm:hidden">
            <div className="flex items-center gap-3">
              <Skeleton className="size-12 rounded-md" />
              <div className="flex flex-col items-start flex-1 overflow-hidden">
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>
          <Skeleton className="size-12 rounded-md hidden max-sm:flex" />
        </div>
      </Card>
      
      <Card className="p-6 flex flex-col gap-8">
        <div className="text-center max-w-2xl mx-auto w-full">
          <h4 className="text-lg font-semibold mb-2 flex justify-center">
            <Skeleton className="h-6 w-24" />
          </h4>
          <div className="text-base font-normal text-neutral-400 flex flex-col items-center">
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-2/3 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
        <div className="w-full max-w-2xl mx-auto">
          <div className="w-full flex flex-col items-start border-b border-neutral-200 pb-2 mb-2">
            <h3 className="text-lg font-semibold">
              <Skeleton className="h-6 w-24" />
            </h3>
            <div className="w-full flex items-center justify-between gap-4 text-neutral-400 -mt-1">
              <div className="flex items-center gap-2">
                <span>
                  <Skeleton className="h-4 w-16" />
                </span>
                |
                <span>
                  <Skeleton className="h-4 w-24" />
                </span>
              </div>
              <div className="text-2xl text-black p-2 rounded-md">
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 w-full">
            {Array.from({ length: 4 }).map((_, index) => (
              <FileCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PublicLinkView;
