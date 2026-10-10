const test = require('node:test');
const assert = require('node:assert/strict');
const { computeSha256, hashText, compareHash } = require('../src/utils/hash');

test('Crypto Hash Utilities Suite', async (t) => {
  await t.test('computeSha256 generates consistent 64-character hex hash for string and Buffer', () => {
    const text = 'SCLIP Regulatory Document Content';
    const hash1 = computeSha256(text);
    const hash2 = computeSha256(Buffer.from(text));

    assert.strictEqual(typeof hash1, 'string');
    assert.strictEqual(hash1.length, 64);
    assert.strictEqual(hash1, hash2, 'String and Buffer hashes must match');
  });

  await t.test('computeSha256 detects tampering in file content', () => {
    const originalContent = 'Valid License Certificate Body';
    const tamperedContent = 'Valid License Certificate Body [Tampered]';

    const originalHash = computeSha256(originalContent);
    const tamperedHash = computeSha256(tamperedContent);

    assert.notStrictEqual(originalHash, tamperedHash, 'Tampered data must yield a different SHA-256 hash');
  });

  await t.test('hashText and compareHash securely hash and verify plaintext secrets', async () => {
    const secret = 'SecurityPin@2026';
    const hashed = await hashText(secret, 8);

    assert.ok(hashed.startsWith('$2'), 'Bcrypt hash should start with $2');
    const isMatch = await compareHash(secret, hashed);
    assert.strictEqual(isMatch, true, 'Original plaintext secret must verify against hash');

    const wrongMatch = await compareHash('WrongPassword', hashed);
    assert.strictEqual(wrongMatch, false, 'Invalid secret must fail verification');
  });
});
