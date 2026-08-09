const express = require("express");
const { calculateReadiness, getReadiness } = require("../controllers/readinesscontroller.js");
const { protect } = require("../middleware/auth.js");

const router = express.Router();

router.use(protect);

router.post("/evaluate", calculateReadiness);
router.get("/me", getReadiness);

module.exports = router;
