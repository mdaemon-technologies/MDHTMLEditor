/**
 * Shared test helpers. Not a test file: Jest only runs `*.test.ts`.
 */

/** Wait for the next animation frame, where TipTap's focus() lands. */
export const nextFrame = (): Promise<unknown> => new Promise((resolve) => requestAnimationFrame(resolve));

/**
 * Focus a new input outside the editor, run `body`, then remove the input,
 * even when `body` throws, so a failed assertion cannot leave focus outside the
 * editor for the tests that follow.
 */
export async function withFocusElsewhere(body: () => Promise<void>): Promise<void> {
  const field = document.createElement('input');
  document.body.appendChild(field);
  try {
    field.focus();
    await body();
  } finally {
    field.remove();
  }
}
