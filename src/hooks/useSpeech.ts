/**
 * Text-to-Speech Hook
 * Provides voice synthesis for character responses
 */

import { useEffect, useRef, useState } from 'react';

export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setIsSupported('speechSynthesis' in window);
  }, []);

  const speak = (text: string, options?: { rate?: number; pitch?: number; voice?: string }) => {
    if (!isSupported) return;
    setSpeechError(null);

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // Configure voice for kid-friendly character
    utterance.rate = options?.rate || 0.9; // Slightly slower for clarity
    utterance.pitch = options?.pitch || 1.1; // Slightly higher for friendly character
    utterance.volume = 1;

    // Try to find a friendly voice
    const voices = window.speechSynthesis.getVoices();
    const friendlyVoice = voices.find(v =>
      v.name.includes('Google') ||
      v.name.includes('Female') ||
      v.name.includes('Samantha') ||
      v.name.includes('Victoria')
    );

    if (friendlyVoice) {
      utterance.voice = friendlyVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeechError(null);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeechError('sound_error');
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const stop = () => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const toggle = () => {
    if (!isSupported) return;

    if (isSpeaking) {
      window.speechSynthesis.pause();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.resume();
      setIsSpeaking(true);
    }
  };

  return {
    speak,
    stop,
    toggle,
    isSpeaking,
    isSupported,
    speechError,
    clearSpeechError: () => setSpeechError(null),
  };
}
