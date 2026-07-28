/**
 * Interview Controller - Enhanced with Voice & Proctoring
 */

const Groq = require('groq-sdk');
const Interview = require('../models/Interview');
const User = require('../models/User');

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const generateSystemPrompt = (domain) => `
You are a senior technical interviewer conducting a mock interview for a ${domain} developer role.

Guidelines:
1. Ask ONE clear, specific technical question at a time
2. Questions should be practical and relevant to ${domain}
3. After the candidate answers, provide constructive feedback
4. Generate follow-up questions based on the candidate's responses
5. Keep questions concise and professional

Return ONLY the question or feedback, nothing else.
`.trim();

const generateFeedbackPrompt = (domain, answer) => `
You are an expert ${domain} interview evaluator.
Provide constructive feedback on this interview answer in 2-3 sentences.

Focus on:
- Technical accuracy and depth
- Clarity and structure
- Communication skills
- Areas for improvement

Answer: "${answer}"

Return ONLY the feedback, no additional text.
`;

const generateScorePrompt = (domain, answer) => `
Rate this interview answer on a scale of 1-100 for a ${domain} position.
Consider technical accuracy, communication, and problem-solving.
Return ONLY a number between 10-100, nothing else.

Answer: "${answer}"
`;

const generateNextQuestionPrompt = (domain, answer) => `
You are an expert ${domain} interviewer. Generate the NEXT interview question based on the previous answer.

The question should:
- Be different from generic interview questions
- Build on topics relevant to ${domain}
- Be open-ended and professional
- Test deeper understanding

Previous answer: "${answer.substring(0, 200)}..."

Return ONLY the new question, nothing else.
`;

// ============================================================================
// CONTROLLER METHODS
// ============================================================================

// ── Start Interview ──────────────────────────────────────────────────────────
const startInterview = async (req, res) => {
    try {
        const { domain } = req.body;

        if (!domain) {
            return res.status(400).json({
                success: false,
                message: 'Domain is required',
            });
        }

        // Generate first question using Groq
        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: generateSystemPrompt(domain) },
                {
                    role: 'user',
                    content: `Start the interview. Ask me the first ${domain} technical question. Only the question, no preamble.`,
                },
            ],
            temperature: 0.7,
            max_tokens: 150,
        });

        const firstQuestion = completion.choices[0].message.content ||
            'Tell me about your experience and interest in this field.';

        // Create interview session
        const interview = new Interview({
            userId: req.user._id,
            domain,
            questions: [{ question: firstQuestion, order: 0 }],
            status: 'in-progress',
            startTime: new Date(),
        });

        await interview.save();

        res.status(201).json({
            success: true,
            data: {
                sessionId: interview.sessionId,
                sessionId_legacy: interview._id,
                question: firstQuestion,
                totalQuestions: 1,
            },
        });

    } catch (error) {
        console.error('Start interview error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start interview',
        });
    }
};

// ── Submit Answer (with Voice Support) ──────────────────────────────────────
const submitAnswer = async (req, res) => {
    try {
        const {
            sessionId,
            answer,
            domain = 'General',
            questionsAnswered = 0,
            audioUrl,
            audioDuration,
            timeTaken,
        } = req.body;

        if (!sessionId || !answer) {
            return res.status(400).json({
                success: false,
                message: 'Session ID and answer are required',
            });
        }

        // Find interview
        const interview = await Interview.findOne({
            $or: [{ _id: sessionId }, { sessionId }],
            userId: req.user._id,
        });

        if (!interview) {
            return res.status(404).json({
                success: false,
                message: 'Interview session not found',
            });
        }

        // Check if completed
        if (interview.isCompleted) {
            return res.status(400).json({
                success: false,
                message: 'Interview already completed',
            });
        }

        const currentIndex = interview.currentQuestionIndex;

        // Generate feedback
        const feedbackCompletion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'user', content: generateFeedbackPrompt(domain, answer) },
            ],
            temperature: 0.7,
            max_tokens: 200,
        });

        const feedback = feedbackCompletion.choices[0].message.content.trim();

        // Save answer
        await interview.addAnswer(currentIndex, answer, {
            audioUrl,
            audioDuration,
            timeTaken,
        });

        // Update answer with feedback
        const answerEntry = interview.answers[interview.answers.length - 1];
        answerEntry.feedback = feedback;
        answerEntry.evaluated = true;

        // Check if interview is complete (3 questions)
        const isComplete = questionsAnswered + 1 >= 3;

        if (isComplete) {
            // Generate score
            const scoreCompletion = await groq.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'user', content: generateScorePrompt(domain, answer) },
                ],
                temperature: 0.5,
                max_tokens: 10,
            });

            const scoreRaw = scoreCompletion.choices[0].message.content.trim();
            const score = Math.max(10, Math.min(100, parseInt(scoreRaw) || 75));

            answerEntry.score = score;

            // Complete interview
            await interview.complete();

            return res.json({
                success: true,
                data: {
                    feedback,
                    score,
                    isComplete: true,
                    totalScore: interview.totalScore,
                },
            });
        }

        // Generate next question
        const nextCompletion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'user', content: generateNextQuestionPrompt(domain, answer) },
            ],
            temperature: 0.7,
            max_tokens: 150,
        });

        const nextQuestion = nextCompletion.choices[0].message.content.trim();

        // Add next question
        interview.questions.push({
            question: nextQuestion,
            order: interview.questions.length,
        });

        await interview.save();

        res.json({
            success: true,
            data: {
                feedback,
                nextQuestion,
                isComplete: false,
                progress: interview.progress,
            },
        });

    } catch (error) {
        console.error('Submit answer error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process answer',
        });
    }
};

// ── Log Proctoring Event ─────────────────────────────────────────────────────
const logProctoringEvent = async (req, res) => {
    try {
        const { sessionId, eventType, details } = req.body;

        if (!sessionId || !eventType) {
            return res.status(400).json({
                success: false,
                message: 'Session ID and event type required',
            });
        }

        const interview = await Interview.findOne({
            $or: [{ _id: sessionId }, { sessionId }],
            userId: req.user._id,
        });

        if (!interview) {
            return res.status(404).json({
                success: false,
                message: 'Interview not found',
            });
        }

        await interview.logProctoringEvent(eventType, details);

        res.json({
            success: true,
            message: 'Proctoring event logged',
        });

    } catch (error) {
        console.error('Proctoring log error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to log proctoring event',
        });
    }
};

// ── Get Interview History ────────────────────────────────────────────────────
const getInterviews = async (req, res) => {
    try {
        const interviews = await Interview.find({
            userId: req.user._id,
            isCompleted: true,
        })
            .select('domain totalScore totalDuration answers createdAt')
            .sort({ createdAt: -1 });

        const mapped = interviews.map((i) => ({
            id: i._id,
            topic: i.domain,
            score: i.totalScore || 0,
            duration: Math.round(i.totalDuration / 60) || 0,
            date: i.createdAt,
            questionsAnswered: i.answers ? i.answers.length : 0,
        }));

        res.json({
            success: true,
            data: { interviews: mapped },
        });

    } catch (error) {
        console.error('Get interviews error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch interviews',
        });
    }
};

// ── Get Single Interview ─────────────────────────────────────────────────────
const getInterview = async (req, res) => {
    try {
        const interview = await Interview.findOne({
            _id: req.params.id,
            userId: req.user._id,
        });

        if (!interview) {
            return res.status(404).json({
                success: false,
                message: 'Interview not found',
            });
        }

        res.json({
            success: true,
            data: { interview },
        });

    } catch (error) {
        console.error('Get interview error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch interview',
        });
    }
};

// ── Get Interview Stats ──────────────────────────────────────────────────────
const getStats = async (req, res) => {
    try {
        const stats = await Interview.getUserStats(req.user._id);

        res.json({
            success: true,
            data: stats,
        });

    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch stats',
        });
    }
};

module.exports = {
    startInterview,
    submitAnswer,
    logProctoringEvent,
    getInterviews,
    getInterview,
    getStats,
};