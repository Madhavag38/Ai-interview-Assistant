/**
 * Voice Routes - ML-powered voice endpoints
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/auth');
const {
    transcribeAudio,
    synthesizeSpeech,
    getVoices,
    processVoiceInterview,
} = require('../controllers/voice.controller');

// Configure multer for audio uploads
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'audio/mpeg',
        'audio/mp3',
        'audio/mp4',
        'audio/wav',
        'audio/webm',
        'audio/x-m4a',
        'audio/m4a',
    ];
    
    if (allowedTypes.includes(file.mimetype) || file.mimetype.startsWith('audio/')) {
        cb(null, true);
    } else {
        cb(new Error('Invalid audio format'), false);
    }
};

const upload = multer({
    storage,
    limits: {
        fileSize: 25 * 1024 * 1024, // 25MB
    },
    fileFilter,
});

// All routes require authentication
router.use(protect);

// Transcribe audio (speech-to-text)
router.post('/transcribe', upload.single('audio'), transcribeAudio);

// Synthesize speech (text-to-speech)
router.post('/synthesize', synthesizeSpeech);

// Get available voices
router.get('/voices', getVoices);

// Full voice interview flow (transcribe + evaluate + respond)
router.post('/interview', upload.single('audio'), processVoiceInterview);

module.exports = router;