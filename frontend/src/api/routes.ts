export default {
  auth: {
    signIn: "/auth",
    register: "/auth/register",
    challenge: "/auth/challenge",
    refresh: "/auth/refresh",
    requestVerification: "/auth/verification/request",
    confirmVerification: "/auth/verification/confirm",
    putLocalSessionKey: "/auth/sessions/local/key",
    getLocalSessionKey: "/auth/sessions/local/key",
    signOut: "/auth/logout",
    resetPassword: "/auth/reset-password",
    changePassword: "/auth/change-password",
  },
  user: {
    me: "/users/me",
    verifyAccount: "/users/me/verify",
    getPublicKeys: "/users/keys",
  },
  files: {
    requestUpload: "files/upload/request",
    announceUpload: "files/upload/announce",
    retryParts: "files/upload/retry",
    finalizeBlock: "files/upload/finalize/block",
    finalizeFile: "files/upload/finalize",
  },
  transfer: {
    getTransfers: "transfers",
    initiateEmailTransfer: "transfers/emails/initiate",
    commitEmailTransfer: ({ transferId }: { transferId: string }) =>
      `transfers/emails/commit/${transferId}`,
    initiateLinkTransfer: "transfers/links/initiate",
    commitLinkTransfer: ({ transferId }: { transferId: string }) =>
      `transfers/links/commit/${transferId}`,
  },
};
