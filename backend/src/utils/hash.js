const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/**
 * Computes SHA-256 cryptographic hash of a file buffer or string
 * @param {Buffer|string} data 
 * @returns {string} Hex-encoded SHA-256 hash
 */
function computeSha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Hashes a plaintext password or PIN using bcrypt
 * @param {string} text 
 * @param {number} saltRounds 
 * @returns {Promise<string>}
 */
async function hashText(text, saltRounds = 10) {
  return await bcrypt.hash(text, saltRounds);
}

/**
 * Compares plaintext with a bcrypt hash
 * @param {string} text 
 * @param {string} hashed 
 * @returns {Promise<boolean>}
 */
async function compareHash(text, hashed) {
  return await bcrypt.compare(text, hashed);
}

module.exports = {
  computeSha256,
  hashText,
  compareHash,
};
