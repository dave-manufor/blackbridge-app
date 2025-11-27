import {
  Modal,
  ModalBody,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/components/overlay/modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PasswordInput } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { OTP_ACTION_TYPES } from "@/config/constants/otp";
import {
  useConfirmVerificationMutation,
  useRequestVerificationMutation,
  useResetPasswordMutation,
} from "@/hooks/mutations";
import { changePasswordSchema } from "@/lib/validators";
import { useAuthStore } from "@/stores/authStore";
import { zodResolver } from "@hookform/resolvers/zod";
import FormControl from "@mui/material/FormControl";
import { isAxiosError } from "axios";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { LuLoaderCircle } from "react-icons/lu";
import { MdOutlinePassword } from "react-icons/md";
import { z } from "zod";
import useAppHeader from "@/hooks/context/useAppHeader";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { useUploadProfilePicture, useDeleteProfilePicture } from "@/hooks/mutations/useUploadProfilePicture";

const AccountSettings = () => {
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const user = useAuthStore((state) => state.user);
  const { setHeaderTitle } = useAppHeader();
  const uploadProfilePicture = useUploadProfilePicture();
  const deleteProfilePicture = useDeleteProfilePicture();

  const handleOpenPasswordModal = () => {
    setShowChangePasswordModal(true);
  };
  const handleClosePasswordModal = () => {
    setShowChangePasswordModal(false);
  };

  useEffect(() => {
    setHeaderTitle("Account Settings");
  }, [setHeaderTitle]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold text-neutral-900">Account Settings</h2>
        <p className="text-sm text-neutral-500">Manage your account preferences and security.</p>
      </div>

      {/* Profile Picture Section */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">Profile Picture</h3>
            <p className="text-sm text-neutral-500 mt-1">Upload a profile picture to personalize your account</p>
          </div>
          <ImageUpload
            currentImageUrl={user?.profile_picture_url}
            onUpload={async (file) => { await uploadProfilePicture.mutateAsync(file); }}
            onDelete={async () => await deleteProfilePicture.mutateAsync()}
            isUploading={uploadProfilePicture.isPending}
            isDeleting={deleteProfilePicture.isPending}
            maxSizeMB={5}
          />
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex flex-col items-center">
          <div className="flex gap-16 w-full justify-center border-t border-neutral-100 pt-6">
            <div className="flex flex-col gap-1 text-center">
              <h4 className="font-medium text-neutral-900">Email</h4>
              <span className="text-sm text-neutral-500">
                {user?.email}
              </span>
            </div>
            <div className="flex flex-col gap-1 text-center">
              <h4 className="font-medium text-neutral-900">Current Plan</h4>
              <span className="text-sm text-neutral-500">
                {"Free Plan"}
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold text-neutral-900">Security</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ActionCard
            title="Change Password"
            description="If you suspect your account has been compromised, update your password immediately to protect your files and data. This will log you out of all other devices."
            actionLabel="Change Password"
            onAction={handleOpenPasswordModal}
          />
          <ActionCard
            title="Delete Account"
            description="This action is irreversible. Deleting your account will permanently remove all your data, including files, settings, and preferences."
            actionLabel="Delete Account"
            isDestructive
            disabled
            onAction={() => {}}
          />
        </div>
      </div>
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={handleClosePasswordModal}
      />
    </div>
  );
};

const ActionCard = ({
  title,
  description,
  actionLabel,
  isDestructive = false,
  disabled = false,
  onAction,
}: {
  title: string;
  description: string;
  isDestructive?: boolean;
  disabled?: boolean;
  actionLabel: string;
  onAction: () => void;
}) => {
  return (
    <Card className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 p-6 flex flex-col gap-3">
        <span className="text-lg font-semibold text-neutral-900">{title}</span>
        <p className="text-sm text-neutral-500 leading-relaxed">{description}</p>
      </div>
      <div className="p-4 bg-surface-50 border-t border-neutral-100 flex justify-end">
        <Button
          disabled={disabled}
          variant={isDestructive ? "destructive" : "outline"}
          onClick={onAction}
          className={!isDestructive ? "bg-white" : ""}
        >
          {actionLabel}
        </Button>
      </div>
    </Card>
  );
};

const ChangePasswordModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const user = useAuthStore((state) => state.user);
  const [otpRequested, setOtpRequested] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [requestId, setRequestId] = useState("");
  const requestVerificationMutation = useRequestVerificationMutation();
  const confirmVerificationMutation = useConfirmVerificationMutation();
  const passwordResetMutation = useResetPasswordMutation();
  const startCooldown = useCallback((cooldownTimestamp: number) => {
    const now = new Date().getTime();
    const remaining = Math.max(0, Math.floor((cooldownTimestamp - now) / 1000));
    setCooldown(remaining);
  }, []);
  const form = useForm({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
      otp: "",
    },
    mode: "onBlur",
    resolver: zodResolver(changePasswordSchema),
  });
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => {
        setCooldown((prevCooldown) => prevCooldown - 1);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [cooldown]);
  useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen, form]);
  const handleRequestOTP = () => {
    setOtpRequested(true);
    requestVerificationMutation.mutate(
      { action_type: OTP_ACTION_TYPES.PASSWORD_RESET },
      {
        onSuccess: (data) => {
          if (data?.request_id) {
            setRequestId(data.request_id);
          }
          if (data?.cooldown_at) {
            startCooldown(data.cooldown_at);
          }
        },
        onError: (error) => {
          if (isAxiosError(error) && error.response?.data?.data?.cooldown_at) {
            startCooldown(error.response.data.data.cooldown_at);
          }
        },
      }
    );
  };
  const handleVerify = async (otp: string): Promise<string | null> => {
    let verificationToken: string | null = null;
    if (otp.length === 6) {
      const { verification_token } =
        await confirmVerificationMutation.mutateAsync(
          { request_id: requestId, code: otp },
          {
            onError: (error) => {
              if (isAxiosError(error) && error.status === 429) {
                toast.error(
                  "Too many attempts. Please wait before trying again."
                );
              } else {
                toast.error(
                  "Verification failed. Please check the code and try again."
                );
              }
            },
          }
        );
      verificationToken = verification_token;
    }
    return verificationToken;
  };
  const onSubmit = async (data: z.infer<typeof changePasswordSchema>) => {
    let verification_token: string | null = null;
    try {
      verification_token = await handleVerify(data.otp);
    } catch {
      return;
    }
    if (verification_token && user) {
      try {
        await passwordResetMutation.mutateAsync({
          oldPassword: data.currentPassword,
          newPassword: data.newPassword,
          verificationToken: verification_token,
        });
        form.reset();
        setOtpRequested(false);
        onClose();
      } catch {
        return;
      }
    }
  };
  const isResend = otpRequested;
  const isRequesting = requestVerificationMutation.isPending;
  const isVerifying = confirmVerificationMutation.isPending;
  const isResetting = passwordResetMutation.isPending;
  return (
    <Modal onClose={onClose} isOpen={isOpen}>
      <ModalContent>
        <ModalHeader>
          <div className="flex items-center gap-2">
            <div className="size-8 flex items-center justify-center bg-neutral-200 rounded-sm">
              <MdOutlinePassword />
            </div>
            Change Password
          </div>
        </ModalHeader>
        <ModalBody>
          <Form {...form}>
            <form
              className="flex flex-col gap-6"
              onSubmit={form.handleSubmit(onSubmit)}
            >
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <PasswordInput
                        {...field}
                        placeholder="Current Password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <PasswordInput {...field} placeholder="New Password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <PasswordInput
                        {...field}
                        placeholder="Confirm Password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="otp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmation Code</FormLabel>
                    <FormControl>
                      <div className="flex items-center">
                        <InputOTP
                          {...field}
                          disabled={isVerifying || isRequesting}
                          maxLength={6}
                        >
                          <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                          </InputOTPGroup>
                        </InputOTP>
                        <Button
                          disabled={isVerifying || isRequesting || cooldown > 0}
                          variant={"link"}
                          className="underline"
                          type="button"
                          onClick={handleRequestOTP}
                        >
                          {isResend ? "Resend" : "Send"} Code
                          {cooldown > 0 ? ` in ${cooldown}s` : " "}
                          {(isRequesting || isVerifying) && (
                            <LuLoaderCircle className="animate-spin" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </ModalBody>
        <ModalFooter>
          <ModalClose />
          <Button disabled={isResetting} onClick={form.handleSubmit(onSubmit)}>
            {isResetting ? (
              <LuLoaderCircle className="animate-spin" />
            ) : (
              "Change Password"
            )}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default AccountSettings;
