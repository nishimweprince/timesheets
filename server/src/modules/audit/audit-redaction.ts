const REDACTED = '[REDACTED]';
const SENSITIVE_KEYS = new Set([
  'password',
  'passwordHash',
  'accessToken',
  'refreshToken',
  'authorization',
  'token',
  'tokenHash',
  'photoBase64',
  'signedUrl',
  'apiSecret'
]);

export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => redact(item));
  if (!value || typeof value !== 'object') return value;

  const result: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    result[key] = SENSITIVE_KEYS.has(key) ? REDACTED : redact(nested);
  }
  return result;
}
