import srpConfig from '../config/srp.config';
import { SRP, SrpServer, VerifierIdentity } from 'fast-srp-hap';

export const generateChallenge = async (
  identifier: string,
  saltBase64: string,
  verifierBase64: string,
): Promise<{ serverEphemeralBase64: string; secretBase64: string }> => {
  const user = {
    username: identifier,
    salt: Buffer.from(saltBase64, 'base64'),
    verifier: Buffer.from(verifierBase64, 'base64'),
  };

  const secret = await SRP.genKey(srpConfig.keyBytes);

  const server = new SrpServer(srpConfig.params, user, secret);

  const ephemeralBase64 = server.computeB().toString('base64');

  return {
    serverEphemeralBase64: ephemeralBase64,
    secretBase64: secret.toString('base64'),
  };
};

export const verifyClientProof = async (
  identifier: string,
  saltBase64: string,
  verifierBase64: string,
  secretBase64: string,
  clientProofBase64: string,
  clientEphemeralBase64: string,
): Promise<{ isValid: boolean; serverProofBase64: string; sessionKeyBase64: string }> => {
  const user: VerifierIdentity = {
    username: identifier,
    salt: Buffer.from(saltBase64, 'base64'),
    verifier: Buffer.from(verifierBase64, 'base64'),
  };
  const server = new SrpServer(srpConfig.params, user, Buffer.from(secretBase64, 'base64'));
  server.setA(Buffer.from(clientEphemeralBase64, 'base64'));

  let isValid = false;

  try {
    server.checkM1(Buffer.from(clientProofBase64, 'base64'));
    isValid = true;
  } catch (error) {
    isValid = false;
  }

  const serverProofBase64 = server.computeM2().toString('base64');
  const sessionKeyBase64 = server.computeK().toString('base64');

  return { isValid, serverProofBase64, sessionKeyBase64 };
};
