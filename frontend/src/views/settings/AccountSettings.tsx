import {
  Modal,
  ModalBody,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/components/overlay/modal";
import { StyledAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import GridSection from "@/components/ui/GridSection";
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

const AccountSettings = () => {
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const user = useAuthStore((state) => state.user);
  const handleOpenPasswordModal = () => {
    setShowChangePasswordModal(true);
  };
  const handleClosePasswordModal = () => {
    setShowChangePasswordModal(false);
  };
  return (
    <>
      <GridSection>
        <div className="col-span-full flex flex-col items-center">
          <div className="flex items-center gap-4 mb-8 max-sm:flex-col sm:gap-2">
            <StyledAvatar
              className="size-18"
              profile_url={user?.profile_picture || undefined}
            />
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Button>Upload Image</Button>
                <Button variant="secondary">Remove Image</Button>
              </div>
              <span className="text-[14px] text-neutral-400 font-light">
                We support JPEG and PNG under 2MB
              </span>
            </div>
          </div>
          <div className=" flex gap-12">
            <div className="flex flex-col gap-1 text-center max-sm:text-left">
              <h4>Email</h4>
              <span className="text-[14px] text-neutral-400">
                {user?.email}
              </span>
            </div>
            <div className="flex flex-col gap-1 text-center max-sm:text-left">
              <h4>Current Plan</h4>
              <span className="text-[14px] text-neutral-400">
                {"Free Plan"}
              </span>
            </div>
          </div>
        </div>
      </GridSection>
      <GridSection>
        <div className="col-span-full">
          <hr className="h-[1px] text-neutral-200 w-full" />
        </div>
      </GridSection>
      <GridSection>
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
      </GridSection>
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={handleClosePasswordModal}
      />
    </>
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
    <div className="col-span-full max-w-[652px] mx-auto border border-neutral-200 rounded-lg overflow-hidden">
      <div className="w-full flex flex-col gap-4 p-4 border-b border-neutral-200">
        <span className="text-xl font-semibold mb-2">{title}</span>
        <p className="text-[14px] text-neutral-400">{description}</p>
      </div>
      <div className="flex justify-end p-2">
        <Button
          disabled={disabled}
          variant={isDestructive ? "destructive" : "default"}
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      </div>
    </div>
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
