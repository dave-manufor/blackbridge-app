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
    searchUsersByEmail: "/users/search",
    verifyAccount: "/users/me/verify",
    getPublicKeys: "/users/keys",
    getBrandSettings: "/users/brand-settings",
    createBrandSettings: "/users/brand-settings",
    updateBrandSettings: "/users/brand-settings",
  },
  files: {
    requestUpload: "files/upload/request",
    announceUpload: "files/upload/announce",
    retryParts: "files/upload/retry",
    finalizeBlock: "files/upload/finalize/block",
    finalizeFile: "files/upload/finalize",
    getDownloadUrls: ({ fileId }: { fileId: string }) =>
      `files/${fileId}/download-urls`,
  },
  transfer: {
    getTransfers: "transfers",
    getUnviewedTransfersCount: "transfers/unviewed/count",
    markTransfersAsViewed: ({ transfer_id }: { transfer_id: string }) =>
      `transfers/emails/${transfer_id}/viewed`,
    getTransferDetails: ({ transferId }: { transferId: string }) =>
      `transfers/${transferId}`,
    getP2PSessionDetails: ({ sessionId }: { sessionId: string }) =>
      `transfers/peers/${sessionId}`,
    getLinkTransfer: ({ slug }: { slug: string }) => `transfers/links/${slug}`,
    initiateEmailTransfer: "transfers/emails/initiate",
    commitEmailTransfer: ({ transferId }: { transferId: string }) =>
      `transfers/emails/commit/${transferId}`,
    initiateLinkTransfer: "transfers/links/initiate",
    commitLinkTransfer: ({ transferId }: { transferId: string }) =>
      `transfers/links/commit/${transferId}`,
    initiateP2PSession: "transfers/peers/initiate",
    getEmailTransferDownloadRequest: ({ transferId }: { transferId: string }) =>
      `transfers/emails/${transferId}/download-request`,
    getLinkTransferDownloadRequest: ({ slug }: { slug: string }) =>
      `transfers/links/${slug}/download-request`,
    getInvitationDetails: ({ invitationId }: { invitationId: string }) =>
      `transfers/invitations/${invitationId}`,
    getInvitationByToken: "transfers/invitations/details",
    acceptTransferInvitation: "transfers/invitations/accept",
    approveTransferInvitation: "transfers/invitations/approve",
    initiateRequestFulfillment: "transfers/requests/initiate",
    commitRequestFulfillment: "transfers/requests/commit",
  },
};
