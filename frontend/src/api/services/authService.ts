import { OTP_ACTION_TYPES } from "@/config/constants/otp";
import API from "../API";
import ApiRoutes from "../routes";

export type OtpActionType =
  (typeof OTP_ACTION_TYPES)[keyof typeof OTP_ACTION_TYPES];
export async function requestVerification(
  {
    action_type,
  }: {
    action_type: OtpActionType;
  },
  signal?: AbortSignal
): Promise<{
  request_id: string;
  expires_at: number;
  cooldown_at: number;
}> {
  const response = await API.post(
    ApiRoutes.auth.requestVerification,
    {
      action_type,
    },
    { signal }
  );

  return response?.data?.data;
}

export async function confirmVerification(
  {
    request_id,
    code,
  }: {
    request_id: string;
    code: string;
  },
  signal?: AbortSignal
): Promise<{
  verification_token: string;
}> {
  const response = await API.post(
    ApiRoutes.auth.confirmVerification,
    {
      request_id,
      code,
    },
    { signal }
  );

  return response?.data?.data;
}

export async function putLocalSessionKey(
  {
    sessionKey,
  }: {
    sessionKey: string;
  },
  signal?: AbortSignal
): Promise<void> {
  await API.put(
    ApiRoutes.auth.putLocalSessionKey,
    {
      key: sessionKey,
    },
    { signal }
  );
}

export async function getLocalSessionKey(
  signal?: AbortSignal
): Promise<string> {
  const response = await API.get(ApiRoutes.auth.getLocalSessionKey, { signal });
  return response?.data?.data?.session_key || "";
}

export async function resetPassword(
  {
    key,
    srp,
    verification_token,
  }: {
    key: { salt: string; armored: string };
    srp: { salt: string; verifier: string };
    verification_token: string;
  },
  signal?: AbortSignal
): Promise<void> {
  await API.post(
    ApiRoutes.auth.changePassword,
    {
      key: {
        salt: key.salt,
        armored_private_key: key.armored,
      },
      credentials: {
        salt: srp.salt,
        verifier: srp.verifier,
      },
    },
    {
      signal,
      headers: {
        "X-OTP-AUTHORIZATION": `Bearer ${verification_token}`,
      },
    }
  );
}
