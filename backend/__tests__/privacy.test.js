const { hashIdentifier } = require('../utils/privacy');

describe('privacy.hashIdentifier', () => {
  test('produces 64-char hex sha256 and is sensitive to nonce', () => {
    const a = hashIdentifier('patient-123', 'salt-xyz', 'nonce-1');
    const b = hashIdentifier('patient-123', 'salt-xyz', 'nonce-2');
    expect(typeof a).toBe('string');
    expect(typeof b).toBe('string');
    expect(a).toHaveLength(64);
    expect(b).toHaveLength(64);
    expect(a).not.toEqual(b);
  });

  test('handles empty inputs gracefully', () => {
    const out = hashIdentifier('', '', '');
    expect(out).toHaveLength(64);
  });
});
