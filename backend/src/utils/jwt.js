const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Signs a JWT payload with the server's JWT secret
 * @param {object} payload 
 * @param {string|number} expiresIn 
 * @returns {string} Signed JWT token
 */
function signToken(payload, expiresIn = config.jwtExpiresIn) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn });
}

/**
 * Verifies and decodes a JWT token
 * @param {string} token 
 * @returns {object} Decoded token payload
 */
function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

module.exports = {
  signToken,
  verifyToken,
};
