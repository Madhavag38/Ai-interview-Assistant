/**
 * Voice Hook - ML-powered voice interactions
 * Uses backend ML services for STT and TTS
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import axiosInstance from '@/lib/axios';

interface VoiceState {
    isRecording: boolean;
    isProcessing: boolean;
    isSpeaking: boolean;
    transcript: string;
    error: string | null;
    audioUrl: string | null;
}

interface VoiceConfig {
    autoSend?: boolean;
    voiceId?: string;
    onTranscript?: (text: string) => void;
    onResponse?: (audio: Blob) => void;
    onError?: (error: string) => void;
}

export function useVoice(config: VoiceConfig = {}) {
    const {
        autoSend = true,
        voiceId,
        onTranscript,
        onResponse,
        onError,
    } = config;

    const [state, setState] = useState<VoiceState>({
        isRecording: false,
        isProcessing: false,
        isSpeaking: false,
        transcript: '',
        error: null,
        audioUrl: null,
    });

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioContextRef = useRef<AudioContext | null>(null);

    /**
     * Start recording audio from microphone
     */
    const startRecording = useCallback(async () => {
        try {
            // Reset state
            setState(prev => ({ ...prev, error: null, transcript: '', isRecording: true }));

            // Get microphone access
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });

            // Create audio context for better audio quality
            audioContextRef.current = new AudioContext({
                sampleRate: 16000,
            });

            const source = audioContextRef.current.createMediaStreamSource(stream);
            const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);

            // Create media recorder
            mediaRecorderRef.current = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus',
            });

            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                // Process the recorded audio
                const audioBlob = new Blob(audioChunksRef.current, {
                    type: 'audio/webm',
                });
                processAudio(audioBlob);
            };

            mediaRecorderRef.current.start(1000); // Collect data in 1-second chunks

            // Auto-stop after 30 seconds
            setTimeout(() => {
                if (mediaRecorderRef.current?.state === 'recording') {
                    stopRecording();
                }
            }, 30000);

        } catch (error: any) {
            console.error('Error starting recording:', error);
            setState(prev => ({
                ...prev,
                isRecording: false,
                error: error.message || 'Failed to access microphone',
            }));
            if (onError) onError(error.message);
        }
    }, [onError]);

    /**
     * Stop recording and process audio
     */
    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
        }

        // Stop all audio tracks
        if (mediaRecorderRef.current?.stream) {
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }

        setState(prev => ({ ...prev, isRecording: false }));
    }, []);

    /**
     * Process audio with backend ML service
     */
    const processAudio = useCallback(async (audioBlob: Blob) => {
        try {
            setState(prev => ({ ...prev, isProcessing: true }));

            // Create form data
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');

            // Send to backend for transcription
            const response = await axiosInstance.post('/api/voice/transcribe', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const { text, confidence } = response.data.data;

            setState(prev => ({
                ...prev,
                isProcessing: false,
                transcript: text,
            }));

            if (onTranscript) onTranscript(text);

            // Auto-send if enabled
            if (autoSend && text) {
                // This will be handled by parent component
            }

        } catch (error: any) {
            console.error('Error processing audio:', error);
            setState(prev => ({
                ...prev,
                isProcessing: false,
                error: error.response?.data?.message || 'Failed to process audio',
            }));
            if (onError) onError(error.message);
        }
    }, [autoSend, onTranscript, onError]);

    /**
     * Synthesize speech from text using ML TTS
     */
    const speak = useCallback(async (text: string, sessionId?: string) => {
        try {
            setState(prev => ({ ...prev, isSpeaking: true, error: null }));

            const response = await axiosInstance.post(
                '/api/voice/synthesize',
                {
                    text,
                    voiceId: voiceId || process.env.NEXT_PUBLIC_VOICE_ID,
                    sessionId,
                },
                {
                    responseType: 'arraybuffer',
                }
            );

            // Check if we got audio or text fallback
            const contentType = response.headers['content-type'];

            if (contentType?.includes('audio')) {
                // Convert to audio blob and play
                const audioBlob = new Blob([response.data], { type: contentType });
                const audioUrl = URL.createObjectURL(audioBlob);

                setState(prev => ({ ...prev, audioUrl }));

                // Play the audio
                const audio = new Audio(audioUrl);
                audio.onended = () => {
                    setState(prev => ({ ...prev, isSpeaking: false }));
                };
                audio.onerror = () => {
                    setState(prev => ({ ...prev, isSpeaking: false }));
                };
                await audio.play();

                if (onResponse) onResponse(audioBlob);

            } else {
                // Fallback: use Web Speech API
                const textResponse = JSON.parse(Buffer.from(response.data).toString());
                if (textResponse.data?.useWebSpeech) {
                    useWebSpeechTTS(textResponse.data.text || text);
                }
                setState(prev => ({ ...prev, isSpeaking: false }));
            }

        } catch (error: any) {
            console.error('TTS error:', error);
            setState(prev => ({
                ...prev,
                isSpeaking: false,
                error: error.message || 'Failed to synthesize speech',
            }));
            
            // Fallback to Web Speech API
            useWebSpeechTTS(text);
        }
    }, [voiceId, onResponse, onError]);

    /**
     * Fallback: Use Web Speech API for TTS
     */
    const useWebSpeechTTS = useCallback((text: string) => {
        if (typeof window === 'undefined') return;

        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = 0.9;
            utterance.pitch = 1;

            utterance.onstart = () => {
                setState(prev => ({ ...prev, isSpeaking: true }));
            };

            utterance.onend = () => {
                setState(prev => ({ ...prev, isSpeaking: false }));
            };

            utterance.onerror = () => {
                setState(prev => ({ ...prev, isSpeaking: false }));
            };

            window.speechSynthesis.speak(utterance);
        } else {
            setState(prev => ({ ...prev, isSpeaking: false }));
        }
    }, []);

    /**
     * Process full voice interview flow
     */
    const processInterviewVoice = useCallback(async (sessionId: string, domain: string) => {
        if (!state.transcript) return;

        try {
            setState(prev => ({ ...prev, isProcessing: true }));

            const response = await axiosInstance.post('/api/voice/interview', {
                sessionId,
                domain,
                transcript: state.transcript,
            });

            setState(prev => ({ ...prev, isProcessing: false }));

            return response.data;

        } catch (error: any) {
            console.error('Voice interview error:', error);
            setState(prev => ({
                ...prev,
                isProcessing: false,
                error: error.message,
            }));
            if (onError) onError(error.message);
            throw error;
        }
    }, [state.transcript, onError]);

    /**
     * Cancel any ongoing operations
     */
    const cancel = useCallback(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
        }
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        setState(prev => ({
            ...prev,
            isRecording: false,
            isSpeaking: false,
            isProcessing: false,
        }));
    }, []);

    /**
     * Clean up resources
     */
    const cleanup = useCallback(() => {
        cancel();
        if (state.audioUrl) {
            URL.revokeObjectURL(state.audioUrl);
        }
    }, [cancel, state.audioUrl]);

    return {
        ...state,
        startRecording,
        stopRecording,
        speak,
        processInterviewVoice,
        cancel,
        cleanup,
    };
}