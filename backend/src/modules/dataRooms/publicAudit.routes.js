const express = require('express');
const dataRoomsController = require('./dataRooms.controller');

const router = express.Router();

// Public route for external inspectors (no login required)
router.get('/:token', (req, res, next) => dataRoomsController.accessAuditLink(req, res, next));
router.post('/:token', (req, res, next) => dataRoomsController.accessAuditLink(req, res, next));
router.post('/:token/verify-pin', (req, res, next) =>
  dataRoomsController.accessAuditLink(req, res, next)
);

module.exports = router;
