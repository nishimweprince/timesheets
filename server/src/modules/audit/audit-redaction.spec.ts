import { redact } from './audit-redaction';

describe('redact', () => {
  it('redacts sensitive fields recursively', () => {
    expect(
      redact({
        email: 'admin@tuza.local',
        password: 'secret',
        nested: {
          refreshToken: 'token',
          signedUrl: 'https://example.test/signed'
        }
      })
    ).toEqual({
      email: 'admin@tuza.local',
      password: '[REDACTED]',
      nested: {
        refreshToken: '[REDACTED]',
        signedUrl: '[REDACTED]'
      }
    });
  });
});
