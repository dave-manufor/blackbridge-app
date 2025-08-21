export default {
  /** Hashing Config */
  hashing: {
    /**  */
    saltRounds: 12,
  },

  /** Encryption Config */
  encryption: {
    file: {
      /** AES Algorithm */
      algorithm: "AES-GCM",
      /** AES GCM IV Bytes */
      ivBytes: 12, // 96-bit IV for GCM
      /** AES GCM Key Length */
      keyLength: 256,
    },
  },
};
