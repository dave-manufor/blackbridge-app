/**
 * Executes a list of async task functions in parallel with a limited concurrency.
 *
 * @param tasks - An array of zero-argument functions that return a promise.
 * @param limit - The maximum number of tasks to run at the same time.
 * @returns A promise that resolves with an array of all task results.
 */
export async function runInParallel<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<T[]> {
  const results: T[] = [];
  const active: Promise<void>[] = [];
  let currentIndex = 0;

  const executeTask = async (index: number): Promise<void> => {
    const task = tasks[index];
    if (!task) return;

    const result = await task();
    results[index] = result;

    // When one task finishes, start the next one.
    return executeTask(currentIndex++);
  };

  // Start the initial batch of tasks.
  while (currentIndex < Math.min(tasks.length, limit)) {
    active.push(executeTask(currentIndex++));
  }

  await Promise.all(active);
  return results;
}
