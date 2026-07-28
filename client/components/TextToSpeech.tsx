/**
 * Text-to-Speech Component
 * Reads out interview questions using Web Speech API
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';

interface TextToSpeechProps {
  text: string;
  autoSpeak?: boolean;
  className?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  onStart?: () => void;
  onEnd?: () => void;
}

export function TextToSpeech({
  text,
  autoSpeak = true,
  className,
  rate = 0.9,
  pitch = 1,
  volume = 1,
  onStart,
  onEnd,
}: TextToSpeechProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechSynthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('speechSynthesis' in window) {
      speechSynthRef.current = window.speechSynthesis;
      setIsSupported(true);
    } else {
      setIsSupported(false);
      return;
    }

    return () => {
      if (speechSynthRef.current) {
        speechSynthRef.current.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (autoSpeak && text && isSupported) {
      speak();
    }
  }, [text, autoSpeak, isSupported]);

  const speak = () => {
    if (!isSupported || !text) return;

    // Cancel any ongoing speech
    if (speechSynthRef.current) {
      speechSynthRef.current.cancel();
    }

    // Create utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    utterance.onstart = () => {
      setIsSpeaking(true);
      if (onStart) onStart();
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      if (onEnd) onEnd();
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsSpeaking(false);
    };

    utteranceRef.current = utterance;

    if (speechSynthRef.current) {
      speechSynthRef.current.speak(utterance);
    }
  };

  const stop = () => {
    if (speechSynthRef.current) {
      speechSynthRef.current.cancel();
    }
    setIsSpeaking(false);
  };

  const toggle = () => {
    if (isSpeaking) {
      stop();
    } else {
      speak();
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggle}
      className={`h-8 w-8 rounded-full ${className || ''}`}
      title={isSpeaking ? 'Stop reading' : 'Read question aloud'}
      aria-label={isSpeaking ? 'Stop reading' : 'Read question aloud'}
    >
      {isSpeaking ? (
        <span className="text-destructive animate-pulse">⏹</span>
      ) : (
        <span className="text-primary">🔊</span>
      )}
    </Button>
  );
}