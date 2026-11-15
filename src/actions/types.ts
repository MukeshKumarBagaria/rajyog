export type ActionResult<T = undefined> =
  | ({ ok: true; message?: string } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

export const ok = (message?: string): ActionResult => ({ ok: true, message });
export const fail = (error: string, fieldErrors?: Record<string, string[] | undefined>): { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> } => ({
  ok: false,
  error,
  fieldErrors,
});

/** Initial state for useActionState forms. */
export type FormState = { ok?: boolean; error?: string; message?: string; fieldErrors?: Record<string, string[] | undefined> };
export const initialFormState: FormState = {};
