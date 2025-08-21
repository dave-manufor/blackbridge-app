import { useMutation } from "@tanstack/react-query";
import { OtpActionType, requestVerification } from "@api/services/authService";
import { toast } from "react-hot-toast";

const useRequestVerificationMutation = () => {
  const mutation = useMutation({
    mutationFn: (data: { action_type: OtpActionType }) =>
      requestVerification(data),
    onSuccess: () => {
      toast.success("A new verification code has been sent to your email.");
    },
  });

  return mutation;
};

export default useRequestVerificationMutation;
