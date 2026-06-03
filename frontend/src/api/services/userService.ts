import { ApiRoutes } from "..";
import API from "../API";

export async function verifyAccount(
  {
    verification_token,
  }: {
    verification_token: string;
  },
  signal?: AbortSignal
): Promise<boolean> {
  await API.post(ApiRoutes.user.verifyAccount, undefined, {
    headers: {
      "X-OTP-AUTHORIZATION": `Bearer ${verification_token}`,
    },
    signal,
  });
  return true;
}

export async function getPublicKeys(
  emails: string[],
  signal?: AbortSignal
): Promise<
  {
    email: string;
    public_key: string;
  }[]
> {
  try {
    const response = await API.post(
      ApiRoutes.user.getPublicKeys,
      { emails },
      { signal }
    );
    return response.data?.data || [];
  } catch (error) {
    throw new Error(`Failed to fetch public keys: ${error}`);
  }
}

export const searchUsersByEmail = async (
  query: string,
  signal?: AbortSignal
): Promise<
  {
    id: string;
    email: string;
    name: string;
  }[]
> => {
  const response = await API.get(ApiRoutes.user.searchUsersByEmail, {
    params: { search: query },
    signal,
  });
  return response.data?.data || [];
};
