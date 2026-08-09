const Groq = require("groq-sdk");
const Readiness = require("../models/Readiness.js");
const Interview = require("../models/Interview.js");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Calculate Readiness Score and Generate Personalized Roadmap
const calculateReadiness = async (req, res) => {
  try {
    const { candidateType = "Fresher" } = req.body;

    // Fetch user's completed interviews
    const interviews = await Interview.find({
      userId: req.userId,
      isComplete: true,
    }).sort({ createdAt: -1 });

    const totalInterviews = interviews.length;
    const avgScore = totalInterviews > 0
      ? Math.round(interviews.reduce((acc, i) => acc + (i.score || 0), 0) / totalInterviews)
      : 50;

    // 1. Classification Scoring Rule
    let category = "Needs Improvement";
    if (avgScore >= 80) {
      category = "Placement Ready";
    } else if (avgScore >= 60) {
      category = "High Potential Candidate";
    }

    const interviewDataStr = interviews
      .slice(0, 5)
      .map((i) => `Domain: ${i.domain}, Score: ${i.score}/100, Difficulty: ${i.currentDifficulty}`)
      .join(" | ");

    // 2. Groq AI Roadmap Generation
    const prompt = `You are a Principal Career Advisor and Placement Director.
Analyze candidate performance and generate a Placement Readiness Evaluation.

Candidate Profile:
- Candidate Target Track: ${candidateType}
- Completed Interviews: ${totalInterviews}
- Average Performance Score: ${avgScore}/100
- Recent Session History: "${interviewDataStr || "No prior interview sessions"}"

Generate output strictly in JSON format matching this schema:
{
  "readinessScore": ${avgScore},
  "category": "${category}",
  "weakTechnicalAreas": ["Weak technical area 1", "Weak technical area 2"],
  "communicationGaps": ["Communication gap 1"],
  "missingSkills": ["Missing skill 1", "Missing skill 2"],
  "actionRoadmap": {
    "recommendedTechnologies": ["Tech 1", "Tech 2"],
    "recommendedProjects": ["Project Idea 1", "Project Idea 2"],
    "recommendedCertifications": ["Cert 1"],
    "recommendedTopics": ["Topic 1", "Topic 2"]
  }
}`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 500,
    });

    let resultData = {
      readinessScore: avgScore,
      category,
      weakTechnicalAreas: ["Deep System Design", "Concurrency Management"],
      communicationGaps: ["Concise Trade-off Explanation"],
      missingSkills: ["Docker & CI/CD Pipelines", "Redis Caching"],
      actionRoadmap: {
        recommendedTechnologies: ["Next.js App Router", "PostgreSQL", "Docker"],
        recommendedProjects: ["Distributed Task Queue System", "Real-time Analytics Dashboard"],
        recommendedCertifications: ["AWS Certified Developer Associate"],
        recommendedTopics: ["Database Indexing Strategies", "REST vs GraphQL Architecture"],
      },
    };

    try {
      const rawContent = completion.choices[0]?.message?.content?.trim() || "";
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        resultData = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Fallback used
    }

    // 3. Upsert Readiness Record with Historical Tracking
    let readinessDoc = await Readiness.findOne({ userId: req.userId });
    if (!readinessDoc) {
      readinessDoc = new Readiness({
        userId: req.userId,
        candidateType,
        history: [],
      });
    }

    readinessDoc.readinessScore = resultData.readinessScore || avgScore;
    readinessDoc.category = resultData.category || category;
    readinessDoc.candidateType = candidateType;
    readinessDoc.weakTechnicalAreas = resultData.weakTechnicalAreas || [];
    readinessDoc.communicationGaps = resultData.communicationGaps || [];
    readinessDoc.missingSkills = resultData.missingSkills || [];
    readinessDoc.actionRoadmap = resultData.actionRoadmap || {};
    readinessDoc.updatedAt = new Date();

    readinessDoc.history.push({
      date: new Date(),
      score: readinessDoc.readinessScore,
      category: readinessDoc.category,
    });

    await readinessDoc.save();

    res.json({ readiness: readinessDoc });
  } catch (err) {
    console.error("calculateReadiness error:", err);
    res.status(500).json({ message: "Failed to generate readiness evaluation", error: err.message });
  }
};

// Fetch User Readiness Report
const getReadiness = async (req, res) => {
  try {
    const readinessDoc = await Readiness.findOne({ userId: req.userId });
    if (!readinessDoc) {
      return res.status(404).json({ message: "No readiness evaluation found. Run assessment first." });
    }
    res.json({ readiness: readinessDoc });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = { calculateReadiness, getReadiness };
