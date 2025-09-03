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
    getUnviewedTransfersCount: "transfers/unviewed/count",
    markTransfersAsViewed: ({ transfer_id }: { transfer_id: string }) =>
      `transfers/emails/${transfer_id}/viewed`,
    getTransferDetails: ({ transferId }: { transferId: string }) =>
      `transfers/${transferId}`,
    getLinkTransfer: ({ slug }: { slug: string }) => `transfers/links/${slug}`,
    initiateEmailTransfer: "transfers/emails/initiate",
    commitEmailTransfer: ({ transferId }: { transferId: string }) =>
      `transfers/emails/commit/${transferId}`,
    initiateLinkTransfer: "transfers/links/initiate",
    commitLinkTransfer: ({ transferId }: { transferId: string }) =>
      `transfers/links/commit/${transferId}`,
    getEmailTransferDownloadRequest: ({ transferId }: { transferId: string }) =>
      `transfers/emails/${transferId}/download-request`,
    getLinkTransferDownloadRequest: ({ slug }: { slug: string }) =>
      `transfers/links/${slug}/download-request`,
    getDownloadUrls: ({ fileId }: { fileId: string }) =>
      `files/${fileId}/download-urls`,
  },
};
