/**
 * Interview Routes
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    startInterview,
    submitAnswer,
    logProctoringEvent,
    getInterviews,
    getInterview,
    getStats,
} = require('../controllers/interviewController');

// All routes require authentication
router.use(protect);

// Start interview
router.post('/start', startInterview);

// Submit answer (with voice support)
router.post('/submit-answer', submitAnswer);

// Log proctoring events
router.post('/proctoring', logProctoringEvent);

// Get interview history
router.get('/', getInterviews);

// Get single interview
router.get('/:id', getInterview);

// Get user stats
router.get('/stats/overview', getStats);

module.exports = router;