export class CommerceError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "CommerceError";
    this.code = code;
  }
}

export function isCommerceError(error: unknown): error is CommerceError {
  return error instanceof CommerceError;
}
