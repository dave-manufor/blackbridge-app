import { useSearchParams } from "react-router";
import {
  acceptTransferInvitation,
  approveTransferInvitation,
  getInvitationByToken,
  getTransferDetails,
} from "@/api/services/transferService";
import toast from "react-hot-toast";
import { isAxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { getPublicKeys } from "@/api/services/userService";
import { devOnly } from "@/utils/dev";
import { useEffect, useMemo } from "react";
import { CryptoBridge } from "@/lib/crypto/workers/CryptoBridge";
import { TRANSFER_INVITATION_STATUS } from "@/config/constants/transfers";

const useHandleGlobalAction = () => {
  const controller = useMemo(() => new AbortController(), []);
  const [searchParams] = useSearchParams();
  useEffect(() => {
    return () => {
      controller.abort();
    };
  }, [controller]);
  async function acceptInvite() {
    // TODO: More Verbose error handling (E.g invite not found, already accepted, etc)
    const token = searchParams.get("inviteToken");
    if (!token) {
      console.warn("No invite token provided");
      return;
    }
    const handleAccept = async () => {
      await acceptTransferInvitation({ token }, controller.signal);
    };
    try {
      const invite = await getInvitationByToken({ token }, controller.signal);
      if (invite.status !== TRANSFER_INVITATION_STATUS.PENDING) return;
      toast(
        (t) => (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <p className="!text-black">
                Invitation received from <strong>{invite.inviter.email}</strong>{" "}
                — accept to view the transfer
              </p>
            </div>
            <div className="flex gap-2 self-end">
              <Button
                onClick={() => {
                  toast.dismiss(t.id);
                }}
                variant={"outline"}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  toast.dismiss(t.id);
                  toast.promise(handleAccept(), {
                    loading: "Accepting invite...",
                    success: (
                      <span>{`Invite accepted! A notification has been sent to ${invite.inviter.email} to grant you access.`}</span>
                    ),
                    error: "Failed to accept invite. Please try again later.",
                  });
                }}
              >
                Accept Invitation
              </Button>
            </div>
          </div>
        ),
        { duration: Infinity }
      );
    } catch (error) {
      if (
        isAxiosError(error) &&
        error.response?.status !== 500 &&
        error.response?.data?.message
      ) {
        toast.error(error.response.data.message);
      } else {
        toast.error(
          "Looks like something went wrong while accepting the invite. Try refreshing the page."
        );
      }
      return;
    }
  }
  async function authorizeInvite() {
    const token = searchParams.get("acceptanceToken");
    if (!token) {
      console.warn("No authorize invite token provided");
      return;
    }
    const handleAuthorize = async (email: string, transferId: string) => {
      // TODO: More Verbose error handling (E.g invite not found, already authorized, etc)
      try {
        // Get transfer details to check if user is owner
        const transfer = await getTransferDetails(
          transferId,
          controller.signal
        );
        if (!transfer) {
          const message = "Transfer not found";
          toast.error(message);
          devOnly(() => console.error("Error approving invite: ", message));
          return;
        }
        if (!transfer.is_owner) {
          const message = "You are not the owner of the transfer";
          toast.error(message);
          devOnly(() => console.error("Error approving invite: ", message));
          return;
        }
        // Fetch public key for the email
        const [key] = await getPublicKeys([email], controller.signal);
        if (!key) {
          const message = `We couldn't seem to find an account for ${email}`;
          toast.error(message);
          devOnly(() => console.error("Error approving invite: ", message));
          return;
        }
        // Decrypt the transfer's file key with owner's private key, then encrypt it with invitee's public key
        const owner_file_key = transfer.owner_file_key;
        const cryptoBridge = CryptoBridge.getInstance();
        const sessionKey = await cryptoBridge.decryptSessionKey(
          owner_file_key,
          { decryptWith: "privateKey" }
        );
        const [inviteeFileKey] = await cryptoBridge.encryptSessionKeys(
          sessionKey,
          { publicKeys: [key.public_key], outputFormat: "armored" }
        );
        // Approve the invite
        await approveTransferInvitation(
          { token, file_key: inviteeFileKey },
          controller.signal
        );
      } catch (error) {
        toast.error(`Failed to authorize ${email}. Please try again later.`);
        devOnly(() => console.error("Error approving invite: ", error));
      }
    };
    let invite: Awaited<ReturnType<typeof getInvitationByToken>>;
    try {
      invite = await getInvitationByToken({ token }, controller.signal);
      if (invite.status !== TRANSFER_INVITATION_STATUS.ACCEPTED) return;
    } catch (error) {
      if (
        isAxiosError(error) &&
        error.response?.status !== 500 &&
        error.response?.data?.message
      ) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to authorize invite. Please try again later.");
      }
      return;
    }
    toast(
      (t) => (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="!text-black">
              <strong>{invite.email}</strong> has requested access to your
              transfer{" "}
              <strong>
                {invite.transfer.title
                  ? invite.transfer.title
                  : invite.transfer.files[0]?.name || ""}
              </strong>{" "}
              — authorize to share the file key with them
            </p>
          </div>
          <div className="flex gap-2 self-end">
            <Button
              onClick={() => {
                toast.dismiss(t.id);
              }}
              variant={"outline"}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                toast.dismiss(t.id);
                toast.promise(
                  handleAuthorize(invite.email, invite.transfer.id),
                  {
                    loading: "Authorizing",
                    success: (
                      <span>{`${invite.email} has been authorized to access the transfer!`}</span>
                    ),
                    error: (
                      <span>{`Failed to authorize ${invite.email}. Please try again later.`}</span>
                    ),
                  }
                );
              }}
            >
              Authorize
            </Button>
          </div>
        </div>
      ),
      { duration: Infinity }
    );
  }
  return async () => {
    const action = searchParams.get("action");
    if (!action) return;

    switch (action) {
      case "acceptInvite": {
        await acceptInvite();
        break;
      }
      case "authorizeInvite": {
        await authorizeInvite();
        break;
      }

      default:
        return;
    }
  };
};

export default useHandleGlobalAction;
