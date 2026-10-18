export class PartnerRequestError extends Error {
  constructor(
    message: string,
    readonly isRetryable: boolean,
  ) {
    super(message);
  }
}
