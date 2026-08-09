const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  role: { type: String, enum: ["ai", "user"], required: true },
  content: { type: String, required: true },
  score: { type: Number, default: 0 },
  difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], default: "Medium" },
  timestamp: { type: Date, default: Date.now },
});

const DifficultyHistorySchema = new mongoose.Schema({
  step: { type: Number, required: true },
  difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], required: true },
  question: { type: String, required: true },
  score: { type: Number, default: 0 },
  wasSkipped: { type: Boolean, default: false },
});

const InterviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  domain: { type: String, required: true },
  company: { type: String, default: "General" },
  score: { type: Number, default: 0 },
  duration: { type: Number, default: 0 }, // minutes
  questionsAnswered: { type: Number, default: 0 },
  currentDifficulty: { type: String, enum: ["Easy", "Medium", "Hard"], default: "Medium" },
  difficultyHistory: [DifficultyHistorySchema],
  askedQuestions: [{ type: String }],
  skippedQuestionsCount: { type: Number, default: 0 },
  messages: [MessageSchema],
  feedback: { type: String, default: "" },
  isComplete: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Interview", InterviewSchema);