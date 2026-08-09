const mongoose = require("mongoose");

const ChallengeSubmissionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  userName: { type: String, required: true },
  score: { type: Number, required: true },
  answer: { type: String, required: true },
  feedback: { type: String },
  submittedAt: { type: Date, default: Date.now },
});

const ChallengeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: {
    type: String,
    enum: ["Technical", "HR", "Aptitude", "Domain-Specific"],
    required: true,
  },
  difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], default: "Medium" },
  question: { type: String, required: true },
  xpReward: { type: Number, default: 100 },
  activeUntil: { type: Date, required: true },
  submissions: [ChallengeSubmissionSchema],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Challenge", ChallengeSchema);
