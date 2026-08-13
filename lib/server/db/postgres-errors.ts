export function isPostgresErrorWithCode(
  error: unknown,
  code: string
): error is Error & { code: string } {
  return (
    error instanceof Error &&
    "code" in error &&
    typeof error.code === "string" &&
    error.code === code
  );
}
