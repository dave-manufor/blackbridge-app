import {
  initiateP2PSession,
  InitiateP2PSessionPayload,
} from "@/api/services/transferService";
import { devOnly } from "@/utils/dev";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";

const useInitiateP2PSessionMutation = () => {
  return useMutation({
    mutationFn: async (payload: InitiateP2PSessionPayload) => {
      return await initiateP2PSession(payload);
    },
    onSuccess: () => toast.success("P2P session initiated successfully"),
    onError: (error) => {
      devOnly(() => console.error("Initiate P2P session error:", error));
      toast.error("Failed to initiate P2P session. Please try again.");
    },
  });
};

export default useInitiateP2PSessionMutation;
