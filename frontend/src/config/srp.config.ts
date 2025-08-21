import { SRP, SrpParams } from "fast-srp-hap";

interface SrpConfig {
  params: SrpParams;
  keyBytes: number;
}

const srpConfig: SrpConfig = {
  params: SRP.params[4096], // 4096-bit group
  keyBytes: 32,
};

export default srpConfig;
