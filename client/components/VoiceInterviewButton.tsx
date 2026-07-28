/**
 * Voice Interview Button - Full voice interaction
 * Records voice, sends to ML backend, plays response
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useVoice } from '@/hooks/useVoice';

interface VoiceInterviewButtonProps {
    sessionId: string;
    domain: string;
    onTranscript: (text: string) => void;
    onResponse: (data: any) => void;
    onError: (error: string) => void;
    disabled?: boolean;
    autoStart?: boolean;
}

export function VoiceInterviewButton({
    sessionId,
    domain,
    onTranscript,
    onResponse,
    onError,
    disabled = false,
    autoStart = false,
}: VoiceInterviewButtonProps) {
    const [isAnswering, setIsAnswering] = useState(false);
    const [hasRecorded, setHasRecorded] = useState(false);

    const {
        isRecording,
        isProcessing,
        isSpeaking,
        transcript,
        error,
        startRecording,
        stopRecording,
        speak,
        processInterviewVoice,
        cancel,
    } = useVoice({
        autoSend: false,
        onTranscript,
        onError,
    });

    // Auto-start recording if enabled
    useEffect(() => {
        if (autoStart && !disabled && !isRecording && !hasRecorded) {
            startRecording();
        }
    }, [autoStart, disabled, isRecording, hasRecorded, startRecording]);

    const handlePressVoice = async () => {
        if (isRecording) {
            // Stop recording and process
            stopRecording();
            setHasRecorded(true);
            setIsAnswering(true);

            try {
                const result = await processInterviewVoice(sessionId, domain);
                if (result?.data) {
                    onResponse(result.data);

                    // Speak the response
                    const { feedback, nextQuestion } = result.data;
                    const speakText = feedback + (nextQuestion ? ' ' + nextQuestion : '');
                    await speak(speakText, sessionId);
                }
            } catch (error) {
                console.error('Voice interview error:', error);
            } finally {
                setIsAnswering(false);
                setHasRecorded(false);
            }
        } else {
            // Start recording
            setHasRecorded(false);
            startRecording();
        }
    };

    const getButtonState = () => {
        if (isProcessing) return 'processing';
        if (isSpeaking) return 'speaking';
        if (isRecording) return 'recording';
        if (isAnswering) return 'answering';
        return 'idle';
    };

    const buttonState = getButtonState();

    const buttonConfig = {
        idle: {
            label: '🎤 Answer with Voice',
            variant: 'outline',
            className: 'border-primary/50 hover:border-primary',
        },
        recording: {
            label: '⏹ Stop Recording',
            variant: 'destructive',
            className: 'animate-pulse',
        },
        processing: {
            label: '⏳ Transcribing...',
            variant: 'secondary',
            className: 'animate-pulse',
        },
        speaking: {
            label: '🔊 Listening to AI...',
            variant: 'primary',
            className: 'animate-pulse',
        },
        answering: {
            label: '🤖 Processing...',
            variant: 'secondary',
            className: 'animate-pulse',
        },
    };

    const config = buttonConfig[buttonState];

    return (
        <div className="flex flex-col items-center gap-3 w-full">
            <Button
                onClick={handlePressVoice}
                disabled={disabled || isProcessing || isAnswering}
                variant={config.variant as any}
                className={`w-full py-6 text-base font-semibold rounded-xl transition-all ${config.className}`}
            >
                {config.label}
            </Button>

            {/* Status indicators */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {isRecording && (
                    <span className="flex items-center gap-1.5 text-red-500">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        Recording...
                    </span>
                )}
                {isProcessing && (
                    <span className="flex items-center gap-1.5 text-blue-500">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-spin" />
                        Processing...
                    </span>
                )}
                {isSpeaking && (
                    <span className="flex items-center gap-1.5 text-green-500">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Speaking...
                    </span>
                )}
                {transcript && !isRecording && !isProcessing && (
                    <span className="text-muted-foreground max-w-[200px] truncate">
                        "{transcript}"
                    </span>
                )}
                {error && (
                    <span className="text-red-500">⚠️ {error}</span>
                )}
            </div>

            {/* Wave animation for recording */}
            {isRecording && (
                <div className="flex items-center gap-0.5 h-6">
                    {[...Array(12)].map((_, i) => (
                        <div
                            key={i}
                            className="w-1 bg-primary rounded-full animate-wave"
                            style={{
                                height: `${20 + Math.random() * 40}%`,
                                animationDelay: `${i * 0.1}s`,
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}