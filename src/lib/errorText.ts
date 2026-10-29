import type { TFunction } from "i18next";

// api functions throw Errors whose message is a translation key ("errors.roomNotFound").
// Raw Supabase messages that we know about are mapped here. Anything else is shown as-is.
const KNOWN: Record<string, string> = {
    "Invalid login credentials": "errors.invalidCredentials",
    "User already registered": "errors.emailTaken",
};

export function errorText(t: TFunction, error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    const key = KNOWN[message] ?? (message.startsWith("errors.") ? message : undefined);
    return key ? t(key) : message;
}
