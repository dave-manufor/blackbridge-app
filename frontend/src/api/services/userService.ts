import { ApiRoutes } from "..";
import API from "../API";

export async function verifyAccount({
  verification_token,
}: {
  verification_token: string;
}): Promise<boolean> {
  await API.post(ApiRoutes.user.verifyAccount, undefined, {
    headers: {
      "X-OTP-AUTHORIZATION": `Bearer ${verification_token}`,
    },
  });
  return true;
}

export async function getPublicKeys(emails: string[]): Promise<
  {
    email: string;
    public_key: string;
  }[]
> {
  try {
    const response = await API.post(ApiRoutes.user.getPublicKeys, { emails });
    return response.data?.data || [];
  } catch (error) {
    throw new Error(`Failed to fetch public keys: ${error}`);
  }
}
