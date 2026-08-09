const express = require("express");
const { getActiveChallenges, submitChallengeAnswer, getLeaderboard } = require("../controllers/arenacontroller.js");
const { protect } = require("../middleware/auth.js");

const router = express.Router();

router.use(protect);

router.get("/challenges", getActiveChallenges);
router.post("/submit", submitChallengeAnswer);
router.get("/leaderboard", getLeaderboard);

module.exports = router;
