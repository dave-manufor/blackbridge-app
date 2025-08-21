import { useMutation } from "@tanstack/react-query";
import { confirmVerification } from "@/api/services/authService";

const useConfirmVerificationMutation = () => {
  return useMutation({
    mutationFn: (data: { request_id: string; code: string }) =>
      confirmVerification(data),
  });
};

export default useConfirmVerificationMutation;
