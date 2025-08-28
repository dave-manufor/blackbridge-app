import { LINK_TRANSFER_ACCESS_CONTROL } from "@/config/constants/transfers";

export const formatFileSize = (size: number): string => {
  if (size < 1024) return `${size} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let unitIndex = -1;
  do {
    size /= 1024;
    unitIndex++;
  } while (size >= 1024 && unitIndex < units.length - 1);
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

export const formatObjectToQueryString = (
  obj: Record<string, string | number | boolean | null | undefined>
): string => {
  const queryString = Object.entries(obj)
    .filter(([_, value]) => value !== null && value !== undefined)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
    )
    .join("&");
  return queryString;
};

export const sentenceCase = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const prettierLinkAccessControl = (
  ac: (typeof LINK_TRANSFER_ACCESS_CONTROL)[keyof typeof LINK_TRANSFER_ACCESS_CONTROL]
) => {
  switch (ac) {
    case LINK_TRANSFER_ACCESS_CONTROL.PUBLIC:
      return "Public";
    case LINK_TRANSFER_ACCESS_CONTROL.REQUIRE_AUTH:
      return "Require Authentication";
    case LINK_TRANSFER_ACCESS_CONTROL.PRIVATE:
      return "Private";
    default:
      return ac;
  }
};
