const Groq = require("groq-sdk");
const Interview = require("../models/Interview.js");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Helper: Calculate next difficulty level based on score out of 10
function calculateNextDifficulty(currentDiff, scoreOutOf10) {
  if (scoreOutOf10 >= 8) {
    if (currentDiff === "Easy") return "Medium";
    if (currentDiff === "Medium") return "Hard";
    return "Hard";
  } else if (scoreOutOf10 <= 4) {
    if (currentDiff === "Hard") return "Medium";
    if (currentDiff === "Medium") return "Easy";
    return "Easy";
  }
  return currentDiff;
}

// ── Start Interview ───────────────────────────────────────
const startInterview = async (req, res) => {
  try {
    const { domain, company = "General", initialDifficulty = "Medium" } = req.body;
    if (!domain) return res.status(400).json({ message: "Domain is required" });

    const prompt = `You are a senior technical interviewer at ${company} conducting an adaptive technical interview for a ${domain} role.
Initial Target Difficulty: ${initialDifficulty}

Generate the FIRST technical question.
Requirements:
1. Target Difficulty Level: ${initialDifficulty}
2. Ask one clear, specific technical question appropriate for ${domain}.
3. Return ONLY the question text. Do not include preambles, intros, or markdown blocks.`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 200,
    });

    const firstQuestion = completion.choices[0]?.message?.content?.trim() ||
      `Can you explain the key fundamental concepts of ${domain}?`;

    const interview = await Interview.create({
      userId: req.userId,
      domain,
      company,
      currentDifficulty: initialDifficulty,
      askedQuestions: [firstQuestion],
      difficultyHistory: [
        {
          step: 1,
          difficulty: initialDifficulty,
          question: firstQuestion,
          score: 0,
          wasSkipped: false,
        },
      ],
      messages: [{ role: "ai", content: firstQuestion, difficulty: initialDifficulty }],
    });

    res.status(201).json({
      sessionId: interview._id,
      question: firstQuestion,
      currentDifficulty: initialDifficulty,
      step: 1,
    });
  } catch (err) {
    console.error("startInterview error:", err);
    res.status(500).json({ message: "Failed to start interview", error: err.message });
  }
};

// ── Submit Answer (Adaptive Difficulty Processing) ───────────
const submitAnswer = async (req, res) => {
  try {
    const {
      sessionId,
      answer,
      domain = "General",
      questionsAnswered = 0,
      totalRounds = 5,
    } = req.body;

    if (!sessionId || !answer) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const interview = await Interview.findOne({
      _id: sessionId,
      userId: req.userId,
    });
    if (!interview) return res.status(404).json({ message: "Session not found" });

    const currentDiff = interview.currentDifficulty || "Medium";

    // 1️⃣ Evaluate Answer Accuracy & Score (0 - 10)
    const evalResponse = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "user",
          content: `You are an expert ${domain} interviewer evaluating a candidate's response.
Current Difficulty Level: ${currentDiff}
Candidate Answer: "${answer}"

Provide evaluation output in JSON format ONLY:
{
  "scoreOutOf10": 8,
  "feedback": "2-3 sentence constructive feedback analyzing correctness, depth, and clarity.",
  "strengths": ["Strength 1", "Strength 2"],
  "improvements": ["Area to improve 1"]
}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    let evalData = { scoreOutOf10: 7, feedback: "Good effort on your response.", strengths: [], improvements: [] };
    try {
      const rawContent = evalResponse.choices[0]?.message?.content?.trim() || "";
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        evalData = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Fallback
    }

    const scoreOutOf10 = Math.max(1, Math.min(10, evalData.scoreOutOf10 || 6));
    const nextDifficulty = calculateNextDifficulty(currentDiff, scoreOutOf10);

    // Update difficulty history for this step
    const currentStep = questionsAnswered + 1;
    const historyIndex = interview.difficultyHistory.findIndex((h) => h.step === currentStep);
    if (historyIndex >= 0) {
      interview.difficultyHistory[historyIndex].score = scoreOutOf10 * 10;
    }

    // Save user message and feedback message
    interview.messages.push({
      role: "user",
      content: answer,
      score: scoreOutOf10 * 10,
      difficulty: currentDiff,
      timestamp: new Date(),
    });

    interview.messages.push({
      role: "ai",
      content: evalData.feedback,
      difficulty: currentDiff,
      timestamp: new Date(),
    });

    interview.questionsAnswered = currentStep;
    interview.currentDifficulty = nextDifficulty;

    const isComplete = currentStep >= totalRounds;

    // ── Complete Path: Final Report Generation ──────────────────
    if (isComplete) {
      const totalScoreSum = interview.difficultyHistory.reduce((acc, curr) => acc + (curr.score || 0), 0);
      const avgScore = Math.round(totalScoreSum / (interview.difficultyHistory.length || 1));

      interview.score = avgScore;
      interview.isComplete = true;
      interview.feedback = evalData.feedback;
      interview.duration = Math.max(
        1,
        Math.round((Date.now() - interview.createdAt.getTime()) / 60000)
      );

      await interview.save();

      return res.json({
        feedback: evalData.feedback,
        score: avgScore,
        currentDifficulty: nextDifficulty,
        difficultyHistory: interview.difficultyHistory,
        skippedQuestionsCount: interview.skippedQuestionsCount,
        isComplete: true,
      });
    }

    // ── Continue Path: Generate Next Adaptive Question ──────────
    const previousQuestionsStr = interview.askedQuestions.join(" | ");

    const nextQPrompt = `You are a technical interviewer conducting an adaptive ${domain} interview.
Target Difficulty: ${nextDifficulty}
Previous Candidate Answer Context: "${answer.substring(0, 150)}..."

CRITICAL CONSTRAINTS:
1. Do NOT repeat any of these previously asked questions: [${previousQuestionsStr}].
2. If previous answer was strong ($\ge$8/10), ask a deeper question on advanced topics (e.g. state optimization, architecture, edge cases).
3. If previous answer was weak ($\le$4/10), switch to an easier foundational concept.
4. Target difficulty level MUST be strictly ${nextDifficulty}.
5. Return ONLY the new question text, no preamble or extra conversational text.`;

    const nextQuestionResp = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: nextQPrompt }],
      temperature: 0.7,
      max_tokens: 200,
    });

    const nextQuestion = nextQuestionResp.choices[0]?.message?.content?.trim() ||
      `Can you explain how you handle errors and edge cases in ${domain}?`;

    interview.askedQuestions.push(nextQuestion);
    interview.difficultyHistory.push({
      step: currentStep + 1,
      difficulty: nextDifficulty,
      question: nextQuestion,
      score: 0,
      wasSkipped: false,
    });

    await interview.save();

    return res.json({
      feedback: evalData.feedback,
      evalDetails: evalData,
      nextQuestion,
      currentDifficulty: nextDifficulty,
      step: currentStep + 1,
      isComplete: false,
    });
  } catch (err) {
    console.error("submitAnswer error:", err);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

// ── Skip Question Handling ───────────────────────────────────
const skipQuestion = async (req, res) => {
  try {
    const { sessionId, questionsAnswered = 0, totalRounds = 5 } = req.body;
    const interview = await Interview.findOne({ _id: sessionId, userId: req.userId });

    if (!interview) return res.status(404).json({ message: "Session not found" });

    const currentDiff = interview.currentDifficulty || "Medium";
    const nextDifficulty = currentDiff === "Hard" ? "Medium" : "Easy";
    const currentStep = questionsAnswered + 1;

    interview.skippedQuestionsCount += 1;
    interview.questionsAnswered = currentStep;
    interview.currentDifficulty = nextDifficulty;

    // Record skipped in history
    const historyIndex = interview.difficultyHistory.findIndex((h) => h.step === currentStep);
    if (historyIndex >= 0) {
      interview.difficultyHistory[historyIndex].wasSkipped = true;
      interview.difficultyHistory[historyIndex].score = 0;
    }

    const isComplete = currentStep >= totalRounds;
    if (isComplete) {
      interview.isComplete = true;
      await interview.save();
      return res.json({
        message: "Question skipped. Interview session complete.",
        isComplete: true,
        difficultyHistory: interview.difficultyHistory,
      });
    }

    const previousQuestionsStr = interview.askedQuestions.join(" | ");
    const nextQPrompt = `Generate an EASY or ACCESSIBLE ${interview.domain} interview question for a candidate who skipped the previous question.
Target Difficulty: ${nextDifficulty}
DO NOT repeat these questions: [${previousQuestionsStr}].
Return ONLY the question text.`;

    const nextQuestionResp = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: nextQPrompt }],
      temperature: 0.7,
      max_tokens: 200,
    });

    const nextQuestion = nextQuestionResp.choices[0]?.message?.content?.trim() ||
      `Let's try a foundational topic: What are the primary data structures used in ${interview.domain}?`;

    interview.askedQuestions.push(nextQuestion);
    interview.difficultyHistory.push({
      step: currentStep + 1,
      difficulty: nextDifficulty,
      question: nextQuestion,
      score: 0,
      wasSkipped: false,
    });

    await interview.save();

    return res.json({
      message: "Question skipped successfully.",
      nextQuestion,
      currentDifficulty: nextDifficulty,
      step: currentStep + 1,
      isComplete: false,
    });
  } catch (err) {
    console.error("skipQuestion error:", err);
    res.status(500).json({ message: "Failed to skip question", error: err.message });
  }
};

// ── Get All Completed Interviews ──────────────────────────
const getInterviews = async (req, res) => {
  try {
    const interviews = await Interview.find({
      userId: req.userId,
      isComplete: true,
    })
      .select("domain company score duration questionsAnswered currentDifficulty difficultyHistory createdAt")
      .sort({ createdAt: -1 });

    const mapped = interviews.map((i) => ({
      id: i._id,
      topic: i.domain,
      company: i.company,
      score: i.score,
      duration: i.duration,
      difficulty: i.currentDifficulty,
      difficultyHistory: i.difficultyHistory,
      date: i.createdAt,
    }));

    res.json({ interviews: mapped });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch interviews", error: err.message });
  }
};

// ── Get Single Interview Details ──────────────────────────
const getInterview = async (req, res) => {
  try {
    const interview = await Interview.findOne({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!interview) return res.status(404).json({ message: "Interview not found" });
    res.json({ interview });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = {
  startInterview,
  submitAnswer,
  skipQuestion,
  getInterviews,
  getInterview,
};