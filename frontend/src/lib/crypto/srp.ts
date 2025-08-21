import srpConfig from "@/config/srp.config";
import { SRP, SrpClient } from "fast-srp-hap";

export const generateSRPCredentials = async (
  identifier: string,
  password: string
): Promise<{ saltBase64: string; verifierBase64: string }> => {
  const salt = await SRP.genKey(srpConfig.keyBytes);
  const verifier = SRP.computeVerifier(
    srpConfig.params,
    salt,
    Buffer.from(identifier),
    Buffer.from(password)
  );

  return {
    saltBase64: salt.toString("base64"),
    verifierBase64: verifier.toString("base64"),
  };
};

export const generateSRPClientValues = async (
  identifier: string,
  password: string,
  saltBase64: string,
  serverEphemeralBase64: string
): Promise<{
  clientEphemeralBase64: string;
  clientProofBase64: string;
  sessionKeyBase64: string;
  secretBase64: string;
}> => {
  const secret = await SRP.genKey(srpConfig.keyBytes);

  const srpClient = new SrpClient(
    srpConfig.params,
    Buffer.from(saltBase64, "base64"),
    Buffer.from(identifier),
    Buffer.from(password),
    secret
  );

  const serverEphemeralBuffer = Buffer.from(serverEphemeralBase64, "base64");
  srpClient.setB(serverEphemeralBuffer);
  const clientEphemeralBase64 = srpClient.computeA().toString("base64");
  const clientProofBase64 = srpClient.computeM1().toString("base64");
  const sessionKeyBase64 = srpClient.computeK().toString("base64");

  return {
    clientEphemeralBase64,
    clientProofBase64,
    sessionKeyBase64,
    secretBase64: secret.toString("base64"),
  };
};

export const verifyServerProof = (
  identifier: string,
  password: string,
  saltBase64: string,
  serverProofBase64: string,
  serverEphemeralBase64: string,
  secretBase64: string
): { isValid: boolean; sessionKeyBase64: string | null } => {
  const srpClient = new SrpClient(
    srpConfig.params,
    Buffer.from(saltBase64, "base64"),
    Buffer.from(identifier),
    Buffer.from(password),
    Buffer.from(secretBase64, "base64")
  );

  srpClient.setB(Buffer.from(serverEphemeralBase64, "base64"));

  let isValid = false;
  let sessionKeyBase64 = null;

  try {
    srpClient.checkM2(Buffer.from(serverProofBase64, "base64"));
    sessionKeyBase64 = srpClient.computeK().toString("base64");
    isValid = true;
  } catch (error) {
    console.error("Unable to verify server:", error);
    isValid = false;
  }

  return { isValid, sessionKeyBase64 };
};
