const Groq = require("groq-sdk");
const Challenge = require("../models/Challenge.js");
const User = require("../models/User.js");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Fetch Active Daily Challenges (Create initial defaults if none active)
const getActiveChallenges = async (req, res) => {
  try {
    let challenges = await Challenge.find({ activeUntil: { $gte: new Date() } }).sort({ createdAt: -1 });

    if (challenges.length === 0) {
      // Seed default daily challenges
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      challenges = await Challenge.insertMany([
        {
          title: "Daily Technical Sprint",
          category: "Technical",
          difficulty: "Hard",
          question: "Explain how you would optimize a React application experiencing re-render bottlenecks caused by deeply nested context providers.",
          xpReward: 150,
          activeUntil: tomorrow,
        },
        {
          title: "HR Leadership Dilemma",
          category: "HR",
          difficulty: "Medium",
          question: "Describe a situation where a key project stakeholder requested an unrealistic feature deadline. How did you negotiate without breaking trust?",
          xpReward: 100,
          activeUntil: tomorrow,
        },
        {
          title: "Logical Aptitude Challenge",
          category: "Aptitude",
          difficulty: "Easy",
          question: "You have 8 balls of identical size, but 1 is slightly heavier. Using a balance scale only twice, how do you find the heavier ball?",
          xpReward: 80,
          activeUntil: tomorrow,
        },
      ]);
    }

    res.json({ challenges });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch challenges", error: err.message });
  }
};

// Submit Challenge Response & Grade with AI
const submitChallengeAnswer = async (req, res) => {
  try {
    const { challengeId, answer } = req.body;
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) return res.status(404).json({ message: "Challenge not found" });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Check if user already submitted
    const existing = challenge.submissions.find((s) => s.userId.toString() === req.userId);
    if (existing) {
      return res.status(400).json({ message: "You have already completed this challenge." });
    }

    // Evaluate with Groq AI
    const evalPrompt = `Evaluate this response for a ${challenge.category} interview challenge.
Question: "${challenge.question}"
Candidate Answer: "${answer}"

Rate score out of 100 and provide 2-sentence feedback in JSON format ONLY:
{
  "score": 85,
  "feedback": "Concise feedback"
}`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: evalPrompt }],
      temperature: 0.3,
      max_tokens: 200,
    });

    let evalData = { score: 75, feedback: "Great effort on your challenge submission." };
    try {
      const rawContent = completion.choices[0]?.message?.content?.trim() || "";
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) evalData = JSON.parse(jsonMatch[0]);
    } catch {
      // Fallback
    }

    const earnedScore = Math.max(10, Math.min(100, evalData.score || 70));

    // Save submission
    challenge.submissions.push({
      userId: req.userId,
      userName: user.name,
      score: earnedScore,
      answer,
      feedback: evalData.feedback,
      submittedAt: new Date(),
    });

    await challenge.save();

    res.json({
      score: earnedScore,
      feedback: evalData.feedback,
      xpEarned: Math.round((earnedScore / 100) * challenge.xpReward),
    });
  } catch (err) {
    console.error("submitChallengeAnswer error:", err);
    res.status(500).json({ message: "Failed to submit challenge answer", error: err.message });
  }
};

// Global Peer Leaderboard
const getLeaderboard = async (req, res) => {
  try {
    const allChallenges = await Challenge.find({});
    const leaderboardMap = new Map();

    allChallenges.forEach((c) => {
      c.submissions.forEach((sub) => {
        const uid = sub.userId.toString();
        const current = leaderboardMap.get(uid) || {
          userName: sub.userName,
          totalScore: 0,
          challengesCompleted: 0,
        };

        current.totalScore += sub.score;
        current.challengesCompleted += 1;
        leaderboardMap.set(uid, current);
      });
    });

    const leaderboard = Array.from(leaderboardMap.values())
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 10)
      .map((entry, idx) => ({
        rank: idx + 1,
        userName: entry.userName,
        totalScore: entry.totalScore,
        challengesCompleted: entry.challengesCompleted,
        badge: idx === 0 ? "🥇 Master" : idx === 1 ? "🥈 Expert" : idx === 2 ? "🥉 Specialist" : "⭐ Contender",
      }));

    res.json({ leaderboard });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch leaderboard", error: err.message });
  }
};

module.exports = { getActiveChallenges, submitChallengeAnswer, getLeaderboard };
