export const formatFileSize = (size: number): string => {
  if (size < 1024) return `${size} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let unitIndex = -1;
  do {
    size /= 1024;
    unitIndex++;
  } while (size >= 1024 && unitIndex < units.length - 1);
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};
