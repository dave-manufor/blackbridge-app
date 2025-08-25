import { useRef, useCallback, useEffect } from "react";

/**
 * Returns a debounced version of the given callback.
 *
 * @param action - Function to debounce
 * @param delay - Delay in ms
 * @returns A debounced function
 */
function useDebounceCallback<T extends unknown[]>(
  action: (...args: T) => void,
  delay: number
): (...args: T) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debounced = useCallback(
    (...args: T) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        action(...args);
      }, delay);
    },
    [action, delay]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debounced;
}

export default useDebounceCallback;
