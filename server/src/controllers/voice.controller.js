/**
 * Voice Controller - Handles voice-related endpoints
 */

const { speechToText, textToSpeech } = require('../services/voice.service');
const { logger } = require('../utils/logger');
const Interview = require('../models/Interview');

/**
 * Process voice input - Convert speech to text
 * POST /api/voice/transcribe
 */
exports.transcribeAudio = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No audio file provided',
            });
        }

        const { sessionId, questionIndex } = req.body;

        // Transcribe audio using ML
        const result = await speechToText.transcribeAudio(
            req.file.buffer,
            req.file.mimetype
        );

        // Log the transcription for analytics
        logger.info(`Transcription: "${result.text}" (Confidence: ${result.confidence})`);

        res.json({
            success: true,
            data: {
                text: result.text,
                confidence: result.confidence,
                duration: result.duration,
            },
        });

    } catch (error) {
        logger.error('Transcription error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to transcribe audio',
            error: error.message,
        });
    }
};

/**
 * Generate voice response - Convert text to speech
 * POST /api/voice/synthesize
 */
exports.synthesizeSpeech = async (req, res) => {
    try {
        const { text, voiceId, sessionId } = req.body;

        if (!text) {
            return res.status(400).json({
                success: false,
                message: 'No text provided for synthesis',
            });
        }

        // Check if we should use ElevenLabs or fallback
        const useElevenLabs = process.env.ELEVENLABS_API_KEY && 
                              process.env.USE_ELEVENLABS !== 'false';

        let result;
        if (useElevenLabs) {
            result = await textToSpeech.synthesizeWithElevenLabs(
                text,
                voiceId || process.env.ELEVENLABS_VOICE_ID
            );
        } else {
            result = await textToSpeech.synthesizeWithFallback(text);
        }

        // If we have audio, stream it back
        if (result.audio) {
            res.set({
                'Content-Type': 'audio/mpeg',
                'Content-Length': result.audio.length,
                'X-Audio-Duration': result.duration || 0,
            });
            res.send(result.audio);
        } else {
            // Fallback: return text for client-side TTS
            res.json({
                success: true,
                data: {
                    text: result.text,
                    useWebSpeech: true,
                },
            });
        }

    } catch (error) {
        logger.error('Synthesis error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to synthesize speech',
            error: error.message,
        });
    }
};

/**
 * Get available voices
 * GET /api/voice/voices
 */
exports.getVoices = async (req, res) => {
    try {
        const voices = await textToSpeech.getVoices();
        res.json({
            success: true,
            data: voices,
        });
    } catch (error) {
        logger.error('Get voices error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch voices',
        });
    }
};

/**
 * Process voice interview flow (combined)
 * POST /api/voice/interview
 */
exports.processVoiceInterview = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No audio file provided',
            });
        }

        const { sessionId, domain } = req.body;

        if (!sessionId || !domain) {
            return res.status(400).json({
                success: false,
                message: 'Session ID and domain are required',
            });
        }

        // Step 1: Speech-to-Text
        const transcription = await speechToText.transcribeAudio(
            req.file.buffer,
            req.file.mimetype
        );

        // Step 2: Get interview context
        const interview = await Interview.findOne({
            $or: [{ _id: sessionId }, { sessionId }],
        });

        if (!interview) {
            return res.status(404).json({
                success: false,
                message: 'Interview session not found',
            });
        }

        // Step 3: Get AI evaluation (using Groq)
        const { evaluateAnswer, generateNextQuestion } = require('./interview.controller');
        
        const evaluation = await evaluateAnswer({
            answer: transcription.text,
            domain,
            question: interview.questions[interview.currentQuestionIndex]?.question,
        });

        // Step 4: Generate next question if needed
        const isComplete = interview.answers.length + 1 >= 3;
        let nextQuestion = null;

        if (!isComplete) {
            nextQuestion = await generateNextQuestion({
                answer: transcription.text,
                domain,
            });
        }

        // Step 5: Save to database
        await interview.addAnswer(
            interview.currentQuestionIndex,
            transcription.text,
            {
                audioDuration: transcription.duration || 0,
                timeTaken: 0,
            }
        );

        // Step 6: Update evaluation
        const answerEntry = interview.answers[interview.answers.length - 1];
        answerEntry.score = evaluation.score || 75;
        answerEntry.feedback = evaluation.feedback;
        answerEntry.evaluated = true;

        // Step 7: Check completion
        if (isComplete) {
            await interview.complete();
        } else if (nextQuestion) {
            interview.questions.push({
                question: nextQuestion,
                order: interview.questions.length,
            });
        }

        await interview.save();

        // Step 8: Return response (will be converted to speech)
        res.json({
            success: true,
            data: {
                transcript: transcription.text,
                feedback: evaluation.feedback,
                score: evaluation.score,
                nextQuestion,
                isComplete,
                totalScore: interview.totalScore,
            },
        });

    } catch (error) {
        logger.error('Voice interview error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process voice interview',
            error: error.message,
        });
    }
};