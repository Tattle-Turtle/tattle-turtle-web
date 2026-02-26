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
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const ok = 'speechSynthesis' in window;
    setIsSupported(ok);
    if (!ok) return;

    const loadVoices = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const doSpeak = (text: string, opts: { rate?: number; pitch?: number; voice?: string } | undefined, retry = 0) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = opts?.rate ?? 0.9;
    utterance.pitch = opts?.pitch ?? 1.1;
    utterance.volume = 1;

    const voices = voicesRef.current.length > 0 ? voicesRef.current : window.speechSynthesis.getVoices();
    if (voices.length === 0 && retry < 2) {
      setTimeout(() => {
        voicesRef.current = window.speechSynthesis.getVoices();
        doSpeak(text, opts, retry + 1);
      }, retry === 0 ? 100 : 300);
      return;
    }
    const friendlyVoice = voices.length > 0 && voices.find(v =>
      v.name.includes('Google') ||
      v.name.includes('Female') ||
      v.name.includes('Samantha') ||
      v.name.includes('Victoria') ||
      v.lang.startsWith('en')
    );
    if (friendlyVoice) utterance.voice = friendlyVoice;

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

  const speak = (text: string, options?: { rate?: number; pitch?: number; voice?: string }) => {
    if (!isSupported) return;
    setSpeechError(null);
    doSpeak(text, options);
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
