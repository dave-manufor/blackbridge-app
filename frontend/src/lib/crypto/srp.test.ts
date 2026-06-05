// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateSRPCredentials,
  generateSRPClientValues,
  verifyServerProof,
} from './srp';
import { SRP, SrpClient } from 'fast-srp-hap';

const mocks = vi.hoisted(() => {
  return {
    mockSrpClient: {
      setB: vi.fn(),
      computeA: vi.fn().mockReturnValue(Buffer.from('mockA')),
      computeM1: vi.fn().mockReturnValue(Buffer.from('mockM1')),
      computeK: vi.fn().mockReturnValue(Buffer.from('mockK')),
      checkM2: vi.fn(),
    }
  };
});

vi.mock('fast-srp-hap', () => {
  return {
    SRP: {
      genKey: vi.fn().mockResolvedValue(Buffer.from('mockKey')),
      computeVerifier: vi.fn().mockReturnValue(Buffer.from('mockVerifier')),
      params: {
        4096: {}
      }
    },
    SrpClient: class {
      setB = mocks.mockSrpClient.setB;
      computeA = mocks.mockSrpClient.computeA;
      computeM1 = mocks.mockSrpClient.computeM1;
      computeK = mocks.mockSrpClient.computeK;
      checkM2 = mocks.mockSrpClient.checkM2;
    },
  };
});

describe('srp.ts', () => {
  const identifier = 'testuser';
  const password = 'testpassword123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate SRP credentials', async () => {
    const creds = await generateSRPCredentials(identifier, password);
    expect(creds).toHaveProperty('saltBase64');
    expect(creds).toHaveProperty('verifierBase64');
    expect(creds.saltBase64).toBe(Buffer.from('mockKey').toString('base64'));
    expect(creds.verifierBase64).toBe(Buffer.from('mockVerifier').toString('base64'));
    expect(SRP.genKey).toHaveBeenCalled();
    expect(SRP.computeVerifier).toHaveBeenCalled();
  });

  it('should generate client values', async () => {
    const saltBase64 = Buffer.from('salt').toString('base64');
    const serverEphemeralBase64 = Buffer.from('serverB').toString('base64');

    const clientValues = await generateSRPClientValues(
      identifier,
      password,
      saltBase64,
      serverEphemeralBase64
    );

    expect(clientValues).toHaveProperty('clientEphemeralBase64', Buffer.from('mockA').toString('base64'));
    expect(clientValues).toHaveProperty('clientProofBase64', Buffer.from('mockM1').toString('base64'));
    expect(clientValues).toHaveProperty('sessionKeyBase64', Buffer.from('mockK').toString('base64'));
    expect(clientValues).toHaveProperty('secretBase64', Buffer.from('mockKey').toString('base64'));
  });

  it('should verify server proof', () => {
    const saltBase64 = Buffer.from('salt').toString('base64');
    const serverProofBase64 = Buffer.from('mockM2').toString('base64');
    const serverEphemeralBase64 = Buffer.from('serverB').toString('base64');
    const secretBase64 = Buffer.from('mockKey').toString('base64');

    const verifyResult = verifyServerProof(
      identifier,
      password,
      saltBase64,
      serverProofBase64,
      serverEphemeralBase64,
      secretBase64
    );

    expect(verifyResult.isValid).toBe(true);
    expect(verifyResult.sessionKeyBase64).toBe(Buffer.from('mockK').toString('base64'));
  });

  it('should handle invalid server proof', () => {
    const saltBase64 = Buffer.from('salt').toString('base64');
    const serverProofBase64 = Buffer.from('mockM2').toString('base64');
    const serverEphemeralBase64 = Buffer.from('serverB').toString('base64');
    const secretBase64 = Buffer.from('mockKey').toString('base64');

    // Make checkM2 throw to simulate invalid proof
    mocks.mockSrpClient.checkM2.mockImplementationOnce(() => { throw new Error('Invalid proof'); });

    const verifyResult = verifyServerProof(
      identifier,
      password,
      saltBase64,
      serverProofBase64,
      serverEphemeralBase64,
      secretBase64
    );

    expect(verifyResult.isValid).toBe(false);
    expect(verifyResult.sessionKeyBase64).toBeNull();
  });
});
