import API from "../API";
import ApiRoutes from "../routes";

export type OtpActionType = "ACCOUNT_VERIFICATION" | "PASSWORD_RESET";
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
