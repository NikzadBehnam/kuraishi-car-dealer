export const actionErrorCodes = [
  "VALIDATION_ERROR",
  "AUTHENTICATION_REQUIRED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "RATE_LIMITED",
  "EXTERNAL_SERVICE_ERROR",
  "INTERNAL_ERROR",
] as const;

export type ActionErrorCode = (typeof actionErrorCodes)[number];

export type ActionFieldErrors = Record<string, string[]>;

export type ActionFailure = {
  ok: false;
  error: {
    code: ActionErrorCode;
    message: string;
    fieldErrors?: ActionFieldErrors;
  };
};

export type ActionSuccess<TData> = {
  ok: true;
  data: TData;
};

export type ActionResult<TData> = ActionSuccess<TData> | ActionFailure;

export function actionSuccess<TData>(data: TData): ActionSuccess<TData> {
  return { data, ok: true };
}

export function actionFailure(
  code: ActionErrorCode,
  message: string,
  fieldErrors?: ActionFieldErrors,
): ActionFailure {
  return {
    error: {
      code,
      message,
      ...(fieldErrors ? { fieldErrors } : {}),
    },
    ok: false,
  };
}
