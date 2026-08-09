const mongoose = require("mongoose");

const ReadinessSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  readinessScore: { type: Number, required: true }, // 0 - 100
  category: {
    type: String,
    enum: ["Placement Ready", "High Potential Candidate", "Needs Improvement"],
    required: true,
  },
  candidateType: {
    type: String,
    enum: ["Fresher", "Internship Seeker", "Experienced Candidate"],
    default: "Fresher",
  },
  weakTechnicalAreas: [{ type: String }],
  communicationGaps: [{ type: String }],
  missingSkills: [{ type: String }],
  actionRoadmap: {
    recommendedTechnologies: [{ type: String }],
    recommendedProjects: [{ type: String }],
    recommendedCertifications: [{ type: String }],
    recommendedTopics: [{ type: String }],
  },
  history: [
    {
      date: { type: Date, default: Date.now },
      score: { type: Number },
      category: { type: String },
    },
  ],
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Readiness", ReadinessSchema);
