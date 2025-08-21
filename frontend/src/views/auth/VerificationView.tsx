import { useState } from "react";
import authStyles from "./Auth.module.css";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";
import Logo from "@/assets/img/blackbridge-logo.svg";
import { Navigate } from "react-router";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { AxiosError } from "axios";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useShallow } from "zustand/react/shallow";
import { useEffect, useCallback } from "react";
import {
  useConfirmVerificationMutation,
  useRequestVerificationMutation,
  useVerifyAccountMutation,
} from "@hooks/mutations";
import { toast } from "react-hot-toast";

const VerificationView = () => {
  const { user, logout } = useAuthStore(
    useShallow((state) => ({
      user: state.user,
      logout: state.signOut,
    }))
  );
  const [otp, setOTP] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [requestId, setRequestId] = useState("");

  const confirmVerificationMutation = useConfirmVerificationMutation();
  const requestVerificationMutation = useRequestVerificationMutation();
  const verifyAccountMutation = useVerifyAccountMutation();

  const startCooldown = useCallback((cooldownTimestamp: number) => {
    const now = new Date().getTime();
    const remaining = Math.max(0, Math.floor((cooldownTimestamp - now) / 1000));
    setCooldown(remaining);
  }, []);

  // 1. Request OTP on initial component mount
  useEffect(() => {
    requestVerificationMutation.mutate(
      { action_type: "ACCOUNT_VERIFICATION" },
      {
        onSuccess: (data) => {
          if (data?.request_id) {
            setRequestId(data.request_id);
          }
          if (data?.cooldown_at) {
            startCooldown(data.cooldown_at);
          }
          setOTP(""); // Reset OTP input on new request
        },
        onError: (error) => {
          if (
            error instanceof AxiosError &&
            error.response?.data?.data?.cooldown_at
          ) {
            startCooldown(error.response.data.data.cooldown_at);
          }
        },
      }
    );
    // The dependency array is empty to ensure this runs only once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startCooldown]);

  // 2. Countdown timer logic
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => {
        setCooldown((prevCooldown) => prevCooldown - 1);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [cooldown]);

  const handleVerify = () => {
    if (otp.length === 6) {
      confirmVerificationMutation.mutate(
        { request_id: requestId, code: otp },
        {
          onSuccess: (data) => {
            verifyAccountMutation.mutate({
              verification_token: data.verification_token,
            });
          },
          onError: (error) => {
            if (error instanceof AxiosError && error.status === 429) {
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
    }
  };

  const handleResend = () => {
    requestVerificationMutation.mutate(
      { action_type: "ACCOUNT_VERIFICATION" },
      {
        onSuccess: (data) => {
          if (data?.request_id) {
            setRequestId(data.request_id);
          }
          if (data?.expires_at) {
            startCooldown(data.expires_at);
          }
          setOTP("");
        },
        onError: (error) => {
          if (
            error instanceof AxiosError &&
            error.response?.data?.data?.cooldown_at
          ) {
            startCooldown(error.response.data.data.cooldown_at);
          }
        },
      }
    );
  };

  if (user?.verified) {
    return <Navigate to="/" replace />;
  }

  const isVerifying = confirmVerificationMutation.isPending;
  const isResending = requestVerificationMutation.isPending;
  const isVerifyingAccount = verifyAccountMutation.isPending;

  return (
    <div className={authStyles.container}>
      <div className={authStyles.banner}>
        <img
          src={Logo}
          alt="Blackbridge Logo"
          className="max-w-[70%] h-auto mb-4"
        />
      </div>
      <Card className={authStyles.formWrapper}>
        <CardHeader className={`text-center ${authStyles.formHeader}`}>
          <h1>Verify your email to continue</h1>
          <p>
            Enter the code we've sent to <strong>{user?.email}</strong>.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col item-center gap-6">
          <InputOTP
            maxLength={6}
            value={otp}
            onChange={setOTP}
            onComplete={handleVerify}
            containerClassName="justify-center"
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
            disabled={otp.length < 6 || isVerifying}
            onClick={handleVerify}
          >
            Verify Email
          </Button>
        </CardContent>
        <CardFooter className={authStyles.formFooter}>
          <div className="flex flex-col items-center gap-3">
            <div className="flex flex-col justify-center">
              Didn&apos;t receive a code?
              <Button
                disabled={isResending || isVerifyingAccount || cooldown > 0}
                onClick={handleResend}
                variant="link"
                className="link font-semibold cursor-pointer -mt-2"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
              </Button>
            </div>
            <Button
              variant="link"
              onClick={logout}
              className="font-semibold cursor-pointer"
            >
              Logout
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default VerificationView;
