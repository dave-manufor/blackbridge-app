export const TRANSFER_TYPES = {
  EMAIL: "EMAIL",
  LINK: "LINK",
};

export const LINK_TRANSFER_ACCESS_CONTROL = {
  PUBLIC: "PUBLIC",
  REQUIRE_AUTH: "REQUIRE_AUTH",
  PRIVATE: "PRIVATE",
};

export const TRANSFER_STATUS = {
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
  REVOKED: "REVOKED",
};

export const TRANSFER_DIRECTION = {
  ALL: "ALL",
  SENT: "SENT",
  RECEIVED: "RECEIVED",
};

export const TRANSFER_INVITATION_STATUS = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  APPROVED: "APPROVED",
};

/**
 *
 * Defines constants for various transfer durations in seconds.
 */
export const TRANSFER_DURATIONS: Record<string, number> = {
  "1 day": 86400,
  "3 days": 259200,
  "7 days": 604800,
  "30 days": 2592000,
  "60 days": 5184000,
};

export const BASE_SHAREABLE_URL = `${
  import.meta.env.VITE_APP_BASE_URL
}/p/shares/`;

export const MAX_TRANSFER_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10 GB in bytes
