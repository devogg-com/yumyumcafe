const express = require('express');
const router = express.Router();

// Health check endpoint as required by spec
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    app: 'YUM YUM BILLING',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
