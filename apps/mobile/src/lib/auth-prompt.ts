let depth = 0;
let lastEnded = 0;

/** True while a system Face ID prompt is up, and for a moment after, so it is not mistaken for leaving the app. */
export const authPromptActive = () => depth > 0 || Date.now() - lastEnded < 1500;

/** Wraps anything that shows the system Face ID prompt. */
export async function withAuthPrompt<T>(run: () => Promise<T>): Promise<T> {
  depth += 1;
  try {
    return await run();
  } finally {
    depth -= 1;
    lastEnded = Date.now();
  }
}
