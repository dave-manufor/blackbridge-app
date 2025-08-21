import { SRP, SrpParams } from 'fast-srp-hap';

interface SrpConfig {
  params: SrpParams;
  keyBytes: number;
  challengeExpiration: number;
}

const srpConfig: SrpConfig = {
  params: SRP.params[4096],
  keyBytes: 32,
  challengeExpiration: 3 * 60, // 3 minutes
};

export default srpConfig;
