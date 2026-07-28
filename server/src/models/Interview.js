/**
 * Interview Model - Enhanced with voice & proctoring
 */

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const interviewSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    sessionId: {
        type: String,
        unique: true,
        default: uuidv4,
    },
    resumeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Resume',
    },
    domain: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['created', 'in-progress', 'completed', 'abandoned'],
        default: 'created',
    },
    // Questions and answers
    questions: [{
        question: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            enum: ['technical', 'behavioral', 'system-design', 'coding'],
            default: 'technical',
        },
        difficulty: {
            type: String,
            enum: ['easy', 'medium', 'hard'],
            default: 'medium',
        },
        topic: String,
        order: Number,
        timeLimit: Number,
    }],
    answers: [{
        questionIndex: Number,
        answer: String,
        // Voice metadata
        audioUrl: String,
        audioDuration: Number,
        submittedAt: {
            type: Date,
            default: Date.now,
        },
        timeTaken: Number,
        // AI Evaluation
        score: {
            type: Number,
            min: 0,
            max: 100,
        },
        feedback: String,
        evaluated: {
            type: Boolean,
            default: false,
        },
        // Proctoring flags
        proctoringEvents: [{
            type: String,
            timestamp: Date,
        }],
    }],
    currentQuestionIndex: {
        type: Number,
        default: 0,
    },
    // Timing
    startTime: {
        type: Date,
        default: Date.now,
    },
    endTime: Date,
    totalDuration: Number,
    totalScore: {
        type: Number,
        min: 0,
        max: 100,
    },
    // Feedback
    feedback: {
        strengths: [String],
        improvements: [String],
        summary: String,
    },
    // Proctoring
    proctoringLog: [{
        eventType: {
            type: String,
            enum: ['tab_switch', 'copy_paste', 'right_click', 'fullscreen_exit', 'devtools_open'],
        },
        timestamp: {
            type: Date,
            default: Date.now,
        },
        details: mongoose.Schema.Types.Mixed,
    }],
    isCompleted: {
        type: Boolean,
        default: false,
    },
    expiresAt: {
        type: Date,
        default: () => Date.now() + 24 * 60 * 60 * 1000,
    },
}, {
    timestamps: true,
});

// Indexes
interviewSchema.index({ userId: 1, createdAt: -1 });
interviewSchema.index({ sessionId: 1 });
interviewSchema.index({ status: 1 });
interviewSchema.index({ expiresAt: 1 });

// ============================================================================
// VIRTUALS
// ============================================================================

interviewSchema.virtual('progress').get(function() {
    if (!this.questions || this.questions.length === 0) return 0;
    const answered = this.answers ? this.answers.length : 0;
    return Math.round((answered / this.questions.length) * 100);
});

interviewSchema.virtual('isExpired').get(function() {
    return this.expiresAt && this.expiresAt < new Date();
});

// ============================================================================
// INSTANCE METHODS
// ============================================================================

// Add answer with voice support
interviewSchema.methods.addAnswer = function(questionIndex, answer, options = {}) {
    const { audioUrl, audioDuration, timeTaken } = options;

    const existingIndex = this.answers.findIndex(
        a => a.questionIndex === questionIndex
    );

    const answerData = {
        questionIndex,
        answer,
        submittedAt: new Date(),
        timeTaken: timeTaken || 0,
        audioUrl: audioUrl || null,
        audioDuration: audioDuration || 0,
    };

    if (existingIndex !== -1) {
        this.answers[existingIndex] = { ...this.answers[existingIndex], ...answerData };
    } else {
        this.answers.push(answerData);
    }

    // Update current question index
    if (questionIndex + 1 < this.questions.length) {
        this.currentQuestionIndex = questionIndex + 1;
    } else {
        this.currentQuestionIndex = this.questions.length;
    }

    return this.save();
};

// Complete interview
interviewSchema.methods.complete = function() {
    this.status = 'completed';
    this.endTime = new Date();
    this.totalDuration = Math.round((this.endTime - this.startTime) / 1000);
    this.isCompleted = true;

    // Calculate total score
    const answered = this.answers.filter(a => a.score !== undefined);
    if (answered.length > 0) {
        const total = answered.reduce((sum, a) => sum + a.score, 0);
        this.totalScore = Math.round(total / answered.length);
    }

    return this.save();
};

// Log proctoring event
interviewSchema.methods.logProctoringEvent = function(eventType, details = {}) {
    this.proctoringLog.push({
        eventType,
        timestamp: new Date(),
        details,
    });
    return this.save();
};

// Get next question
interviewSchema.methods.getNextQuestion = function() {
    if (this.currentQuestionIndex < this.questions.length) {
        return this.questions[this.currentQuestionIndex];
    }
    return null;
};

// ============================================================================
// STATIC METHODS
// ============================================================================

// Get active interviews
interviewSchema.statics.getActive = function(userId) {
    return this.find({
        userId,
        status: { $in: ['created', 'in-progress'] },
        isCompleted: false,
        expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });
};

// Get completed interviews
interviewSchema.statics.getCompleted = function(userId, limit = 10) {
    return this.find({
        userId,
        status: 'completed',
        isCompleted: true,
    })
        .sort({ createdAt: -1 })
        .limit(limit);
};

// Get user stats
interviewSchema.statics.getUserStats = async function(userId) {
    const stats = await this.aggregate([
        { $match: { userId: mongoose.Types.ObjectId(userId), isCompleted: true } },
        {
            $group: {
                _id: null,
                totalInterviews: { $sum: 1 },
                averageScore: { $avg: '$totalScore' },
                totalQuestions: { $sum: { $size: '$answers' } },
                totalDuration: { $sum: '$totalDuration' },
            },
        },
    ]);

    return stats[0] || {
        totalInterviews: 0,
        averageScore: 0,
        totalQuestions: 0,
        totalDuration: 0,
    };
};

// Set virtuals to JSON
interviewSchema.set('toJSON', { virtuals: true });
interviewSchema.set('toObject', { virtuals: true });

const Interview = mongoose.model('Interview', interviewSchema);

module.exports = Interview;