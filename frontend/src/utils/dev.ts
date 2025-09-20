export const devOnly = (fn: () => void) => {
  if (isDevEnvironment()) {
    fn();
  }
};

export const devOnlyAsync = async (fn: () => Promise<void>) => {
  if (isDevEnvironment()) {
    await fn();
  }
};

export const isDevEnvironment = () => {
  return (
    import.meta.env.VITE_ENVIRONMENT &&
    (import.meta.env.VITE_ENVIRONMENT === "dev" ||
      import.meta.env.VITE_ENVIRONMENT === "development")
  );
};
