import { verifyAccount } from "@/api/services/userService";
import { useMutation } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { useAuthStore } from "@/stores/authStore";

const authStore = useAuthStore.getState();

const useVerifyAccountMutation = () => {
  return useMutation({
    mutationFn: (data: { verification_token: string }) => verifyAccount(data),
    onSuccess: () => {
      toast.success("Account verified successfully!");
      authStore.refreshUser();
    },
    onError: () => toast.error("Failed to verify account. Please try again."),
  });
};

export default useVerifyAccountMutation;
