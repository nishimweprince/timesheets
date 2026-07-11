import { mergeDeviceContext, parseUserAgent } from './device-context';

describe('device-context', () => {
  describe('parseUserAgent', () => {
    it('returns null for empty UA', () => {
      expect(parseUserAgent(null)).toBeNull();
      expect(parseUserAgent('')).toBeNull();
      expect(parseUserAgent('   ')).toBeNull();
    });

    it('detects iPhone Safari', () => {
      const ua =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
      expect(parseUserAgent(ua)).toMatchObject({
        deviceClass: 'mobile',
        browser: 'Safari',
        os: 'iOS',
        source: 'server',
        userAgent: ua
      });
    });

    it('detects desktop Chrome on macOS', () => {
      const ua =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      expect(parseUserAgent(ua)).toMatchObject({
        deviceClass: 'desktop',
        browser: 'Chrome',
        os: 'macOS',
        source: 'server'
      });
    });
  });

  describe('mergeDeviceContext', () => {
    it('returns null when both sides empty', () => {
      expect(mergeDeviceContext(null, null)).toBeNull();
      expect(mergeDeviceContext(undefined, {})).toBeNull();
    });

    it('prefers client fields when merging', () => {
      const ua =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';
      const merged = mergeDeviceContext(ua, {
        deviceClass: 'tablet',
        browser: 'Safari',
        os: 'iOS',
        source: 'client'
      });
      expect(merged).toMatchObject({
        deviceClass: 'tablet',
        browser: 'Safari',
        os: 'iOS',
        source: 'merged'
      });
    });

    it('uses client-only when UA missing', () => {
      const merged = mergeDeviceContext(null, {
        deviceClass: 'desktop',
        browser: 'Firefox',
        os: 'Linux',
        userAgent: 'custom',
        source: 'client'
      });
      expect(merged).toMatchObject({
        deviceClass: 'desktop',
        browser: 'Firefox',
        os: 'Linux',
        source: 'client'
      });
    });
  });
});
