import { useMutation, useQuery } from "@tanstack/react-query";
import API from "@/api/API";
import { brandSettingsSchema } from "@/lib/validators";
import { z } from "zod";
import { isAxiosError } from "axios";

export const useBrandSettings = () => {
  return useQuery({
    queryKey: ["brand-settings"],
    queryFn: async () => {
      const response = await API.get("/users/brand-settings");
      return response.data.data;
    },
    retry: (_, error) => {
      if (error && isAxiosError(error) && error.response?.status === 404) {
        // Don't retry on 404 (Not Found), means that brand settings do not exist
        return false;
      }
      return true;
    },
  });
};

export const useCreateBrandSettings = () => {
  return useMutation({
    mutationFn: async (data: z.infer<typeof brandSettingsSchema>) => {
      const response = await API.post("/users/brand-settings", data);
      return response.data.data;
    },
  });
};

export const useUpdateBrandSettings = () => {
  return useMutation({
    mutationFn: async (data: z.infer<typeof brandSettingsSchema>) => {
      const response = await API.put("/users/brand-settings", data);
      return response.data.data;
    },
  });
};
