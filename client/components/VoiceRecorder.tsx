/**
 * Voice Recorder Component
 * Uses Web Speech API for voice-to-text conversion
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  autoSubmit?: boolean;
}

export function VoiceRecorder({
  onTranscript,
  disabled,
  placeholder,
  autoSubmit = true,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check browser support
    if (typeof window === 'undefined') return;

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Voice recognition is not supported in this browser.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();

    if (recognitionRef.current) {
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.maxAlternatives = 1;

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        let interim = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interim += transcript;
          }
        }

        setInterimTranscript(interim);

        if (finalTranscript) {
          setTranscript(finalTranscript);
          if (autoSubmit) {
            onTranscript(finalTranscript);
            stopRecording();
          }
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);

        if (event.error === 'not-allowed') {
          setError('Microphone access denied. Please allow microphone permissions.');
        } else if (event.error === 'no-speech') {
          setError('No speech detected. Please try again.');
        } else if (event.error === 'audio-capture') {
          setError('No microphone found. Please connect a microphone.');
        } else {
          setError(`Speech recognition error: ${event.error}`);
        }
        stopRecording();
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
        setInterimTranscript('');
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // Ignore
        }
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [onTranscript, autoSubmit]);

  const startRecording = () => {
    setError(null);
    setTranscript('');
    setInterimTranscript('');

    if (!recognitionRef.current) {
      setError('Speech recognition not available.');
      return;
    }

    try {
      recognitionRef.current.start();
      setIsRecording(true);

      // Auto-stop after 30 seconds
      timeoutRef.current = setTimeout(() => {
        if (isRecording) {
          stopRecording();
        }
      }, 30000);
    } catch (error: any) {
      console.error('Failed to start recording:', error);

      if (error.message?.includes('already started')) {
        // Already recording, ignore
      } else {
        setError('Failed to start recording. Please try again.');
      }
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore
      }
    }
    setIsRecording(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const handleSubmitVoice = () => {
    const textToSubmit = transcript.trim() || interimTranscript.trim();
    if (textToSubmit) {
      onTranscript(textToSubmit);
      setTranscript('');
      setInterimTranscript('');
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
      // Submit if there's transcript
      const text = transcript.trim() || interimTranscript.trim();
      if (text) {
        onTranscript(text);
        setTranscript('');
        setInterimTranscript('');
      }
    } else {
      startRecording();
    }
  };

  const displayText = transcript || interimTranscript;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={isRecording ? 'destructive' : 'outline'}
          size="sm"
          onClick={toggleRecording}
          disabled={disabled || !!error}
          className="rounded-full px-3 min-w-[80px] transition-all"
        >
          {isRecording ? (
            <>
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-1.5" />
              Stop
            </>
          ) : (
            '🎤 Speak'
          )}
        </Button>

        {displayText && (
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <span className="text-xs text-muted-foreground flex-1 truncate bg-muted/30 px-3 py-1.5 rounded-lg">
              {!isRecording && interimTranscript ? '⌛ ' : '📝 '}
              "{displayText}"
            </span>
            {!autoSubmit && !isRecording && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleSubmitVoice}
                className="text-xs flex-shrink-0"
              >
                Send
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Status messages */}
      {isRecording && (
        <p className="text-xs text-primary animate-pulse flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
          Recording... Speak clearly. Auto-submit on pause.
        </p>
      )}

      {error && (
        <p className="text-xs text-destructive flex items-center gap-1.5">
          ⚠️ {error}
          {error.includes('microphone') && (
            <Button
              variant="link"
              size="sm"
              className="text-xs p-0 h-auto text-primary"
              onClick={() => setError(null)}
            >
              Dismiss
            </Button>
          )}
        </p>
      )}

      {!isRecording && !error && !displayText && (
        <p className="text-xs text-muted-foreground">
          {placeholder || 'Click 🎤 to answer with your voice'}
        </p>
      )}
    </div>
  );
}