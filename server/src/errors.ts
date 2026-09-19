export class AppError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
    public readonly code = 'APP_ERROR',
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function notFound(entity: string): AppError {
  return new AppError(`${entity} was not found`, 404, 'NOT_FOUND');
}
