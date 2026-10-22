export type ActionResult = { ok: boolean; message: string } | null;

export const ok = (message = ""): ActionResult => ({ ok: true, message });
export const fail = (message: string): ActionResult => ({ ok: false, message });

/** Turns thrown errors into a message safe to show; unknown errors stay generic and are logged. */
export function errorMessage(error: unknown, known: (new (...args: never[]) => Error)[] = []): string {
  if (known.some((K) => error instanceof K)) return (error as Error).message;
  if (error && typeof error === "object" && "issues" in error) return "Some of the values entered aren't valid.";
  console.error(error);
  return "Something went wrong. Please try again.";
}
