/**
 * Voice Service - ML-powered Speech-to-Text & Text-to-Speech
 * Uses Groq's Whisper API for STT, ElevenLabs for TTS
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { Groq } = require('groq-sdk');
const { logger } = require('../utils/logger');

// Initialize Groq client (supports Whisper)
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

/**
 * Speech-to-Text Service
 * Converts audio to text using ML models
 */
class SpeechToTextService {
    constructor() {
        this.supportedFormats = ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm'];
        this.maxFileSize = 25 * 1024 * 1024; // 25MB
    }

    /**
     * Transcribe audio using Groq's Whisper API
     * @param {Buffer} audioBuffer - Audio file buffer
     * @param {string} mimeType - Audio MIME type
     * @returns {Promise<string>} - Transcribed text
     */
    async transcribeAudio(audioBuffer, mimeType) {
        try {
            // Validate file size
            if (audioBuffer.length > this.maxFileSize) {
                throw new Error(`Audio file too large. Max size: ${this.maxFileSize / 1024 / 1024}MB`);
            }

            // Validate format
            const extension = this.getExtensionFromMimeType(mimeType);
            if (!this.supportedFormats.includes(extension)) {
                throw new Error(`Unsupported audio format: ${mimeType}. Supported: ${this.supportedFormats.join(', ')}`);
            }

            // Log transcription start
            logger.info(`Starting transcription - Format: ${mimeType}, Size: ${(audioBuffer.length / 1024).toFixed(2)}KB`);

            // Use Groq's Whisper API
            const transcription = await groq.audio.transcriptions.create({
                file: audioBuffer,
                model: 'whisper-large-v3',
                response_format: 'json',
                language: 'en',
                temperature: 0.0,
            });

            logger.info(`Transcription completed - Length: ${transcription.text.length} chars`);

            return {
                text: transcription.text,
                confidence: transcription.confidence || 0.95,
                language: 'en',
                duration: transcription.duration || 0,
            };

        } catch (error) {
            logger.error('Speech-to-Text error:', error.message);
            throw new Error(`Transcription failed: ${error.message}`);
        }
    }

    /**
     * Alternative: Use Google Speech-to-Text API (fallback)
     * @param {Buffer} audioBuffer 
     * @param {string} mimeType 
     * @returns {Promise<string>}
     */
    async transcribeWithGoogle(audioBuffer, mimeType) {
        try {
            // Convert to base64 for Google API
            const audioBase64 = audioBuffer.toString('base64');

            const response = await axios.post(
                `https://speech.googleapis.com/v1/speech:recognize?key=${process.env.GOOGLE_API_KEY}`,
                {
                    config: {
                        encoding: this.getGoogleEncoding(mimeType),
                        sampleRateHertz: 16000,
                        languageCode: 'en-US',
                        enableAutomaticPunctuation: true,
                        useEnhanced: true,
                        model: 'latest_long',
                    },
                    audio: {
                        content: audioBase64,
                    },
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    timeout: 30000,
                }
            );

            const results = response.data.results || [];
            if (results.length === 0) {
                throw new Error('No transcription results');
            }

            const transcript = results
                .map((r) => r.alternatives[0].transcript)
                .join(' ');

            return {
                text: transcript,
                confidence: results[0]?.alternatives[0]?.confidence || 0.9,
                language: 'en',
            };

        } catch (error) {
            logger.error('Google STT error:', error.message);
            throw error;
        }
    }

    getExtensionFromMimeType(mimeType) {
        const map = {
            'audio/mpeg': 'mp3',
            'audio/mp4': 'mp4',
            'audio/mpeg3': 'mp3',
            'audio/mpga': 'mpga',
            'audio/x-m4a': 'm4a',
            'audio/wav': 'wav',
            'audio/x-wav': 'wav',
            'audio/webm': 'webm',
        };
        return map[mimeType] || mimeType.split('/')[1];
    }

    getGoogleEncoding(mimeType) {
        const map = {
            'audio/mpeg': 'MP3',
            'audio/mp4': 'MP4',
            'audio/mpeg3': 'MP3',
            'audio/mpga': 'MP3',
            'audio/x-m4a': 'M4A',
            'audio/wav': 'LINEAR16',
            'audio/x-wav': 'LINEAR16',
            'audio/webm': 'WEBM_OPUS',
        };
        return map[mimeType] || 'LINEAR16';
    }
}

/**
 * Text-to-Speech Service
 * Converts AI text to natural-sounding audio
 */
class TextToSpeechService {
    constructor() {
        this.voices = {
            male: 'Josh',
            female: 'Samantha',
            neutral: 'Alloy',
            interviewer: 'Onyx',
        };
        this.supportedFormats = ['mp3', 'pcm', 'mulaw'];
    }

    /**
     * Convert text to speech using ElevenLabs API
     * @param {string} text - Text to convert
     * @param {string} voiceId - ElevenLabs voice ID
     * @param {Object} options - TTS options
     * @returns {Promise<Buffer>} - Audio buffer
     */
    async synthesizeWithElevenLabs(text, voiceId = '21m00Tcm4TlvDq8ikWAM', options = {}) {
        try {
            const {
                stability = 0.5,
                similarity_boost = 0.75,
                style = 0.0,
                use_speaker_boost = true,
            } = options;

            // Clean text
            const cleanText = this.cleanText(text);

            // Limit text length
            if (cleanText.length > 5000) {
                logger.warn(`Text too long (${cleanText.length} chars). Truncating to 5000.`);
            }

            const response = await axios.post(
                `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
                {
                    text: cleanText.substring(0, 5000),
                    model_id: 'eleven_monolingual_v1',
                    voice_settings: {
                        stability,
                        similarity_boost,
                        style,
                        use_speaker_boost,
                    },
                },
                {
                    headers: {
                        'xi-api-key': process.env.ELEVENLABS_API_KEY,
                        'Content-Type': 'application/json',
                        'Accept': 'audio/mpeg',
                    },
                    responseType: 'arraybuffer',
                    timeout: 30000,
                }
            );

            logger.info(`TTS generated - Text length: ${cleanText.length}, Size: ${(response.data.length / 1024).toFixed(2)}KB`);

            return {
                audio: Buffer.from(response.data),
                format: 'mp3',
                duration: 0, // Would need to parse from response
            };

        } catch (error) {
            logger.error('ElevenLabs TTS error:', error.message);
            // Fallback to Groq TTS or Web Speech API
            return this.synthesizeWithFallback(text);
        }
    }

    /**
     * Fallback: Use Groq's TTS (if available) or return text for Web Speech API
     */
    async synthesizeWithFallback(text) {
        // Groq doesn't have TTS yet, so we use a simple fallback
        // Return text so frontend can use Web Speech API
        logger.info('Using fallback TTS - returning text for Web Speech API');
        return {
            text,
            useWebSpeech: true,
        };
    }

    /**
     * Clean text for TTS
     */
    cleanText(text) {
        return text
            .replace(/\n/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s.,!?()'"-]/g, '')
            .trim();
    }

    /**
     * Get available voices
     */
    async getVoices() {
        try {
            const response = await axios.get(
                'https://api.elevenlabs.io/v1/voices',
                {
                    headers: {
                        'xi-api-key': process.env.ELEVENLABS_API_KEY,
                    },
                }
            );
            return response.data.voices || [];
        } catch (error) {
            logger.error('Failed to fetch voices:', error.message);
            return [];
        }
    }
}

// Export singleton instances
const speechToText = new SpeechToTextService();
const textToSpeech = new TextToSpeechService();

module.exports = {
    speechToText,
    textToSpeech,
    SpeechToTextService,
    TextToSpeechService,
};