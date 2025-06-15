const express = require('express');
const { body } = require('express-validator');
const feedbackController = require('../controllers/feedback.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/',
  authMiddleware.authUser,
  body('rideId').isMongoId().withMessage('Invalid ride id'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1 to 5'),
  body('comment').optional().isString(),
  feedbackController.submitFeedback
);

module.exports = router;
