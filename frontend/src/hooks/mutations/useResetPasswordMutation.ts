import { putLocalSessionKey, resetPassword } from "@/api/services/authService";
import { generateSRPCredentials } from "@/lib/crypto/srp";
import { CryptoBridge } from "@/lib/crypto/workers/CryptoBridge";
import { useAuthStore } from "@/stores/authStore";
import { devOnly } from "@/utils/dev";
import { useMutation } from "@tanstack/react-query";
import bcrypt from "bcryptjs";
import toast from "react-hot-toast";

const useResetPasswordMutation = () => {
  const user = useAuthStore((state) => state.user);
  const primaryKeys = useAuthStore((state) => state.primaryKeys);
  const cryptoBridge = CryptoBridge.getInstance();
  return useMutation({
    mutationFn: async ({
      oldPassword,
      newPassword,
      verificationToken,
    }: {
      oldPassword: string;
      newPassword: string;
      verificationToken: string;
    }) => {
      if (!user) throw new Error("User not found");
      // Generate SRP credentials
      const credentials = await generateSRPCredentials(user.email, newPassword);
      // Rewrap private key with new password
      const { armoredKey, salt: keySalt } =
        await cryptoBridge.changePrivateKeyPassphrase(
          oldPassword,
          primaryKeys ? primaryKeys.salt : "",
          newPassword,
          primaryKeys ? primaryKeys.private_key : ""
        );
      // Update password and private key on server
      await resetPassword({
        key: {
          armored: armoredKey,
          salt: keySalt,
        },
        srp: {
          salt: credentials.saltBase64,
          verifier: credentials.verifierBase64,
        },
        verification_token: verificationToken,
      });

      const passphrase = await bcrypt.hash(newPassword, keySalt);
      const localKey = await cryptoBridge.initialize(
        user.id,
        armoredKey,
        passphrase
      );
      await putLocalSessionKey({ sessionKey: localKey });
    },
    onSuccess: () => toast.success("Password reset successfully"),
    onError: (error) => {
      devOnly(() => console.error("Reset password error:", error));
      toast.error("Failed to reset password. Please try again");
    },
  });
};

export default useResetPasswordMutation;
