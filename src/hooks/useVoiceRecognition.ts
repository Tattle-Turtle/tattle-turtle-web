/**
 * Voice Recognition Hook
 * Speech-to-text with interruption detection and live transcription
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface VoiceRecognitionOptions {
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  onInterrupt?: () => void;
  language?: string;
  continuous?: boolean;
}

export function useVoiceRecognition(options: VoiceRecognitionOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stoppedByNoSpeechRef = useRef(false);
  const onTranscriptRef = useRef(options.onTranscript);
  const onInterruptRef = useRef(options.onInterrupt);

  onTranscriptRef.current = options.onTranscript;
  onInterruptRef.current = options.onInterrupt;

  useEffect(() => {
    // Check for browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);

    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    // Initialize recognition
    const recognition = new SpeechRecognition();
    recognition.continuous = options.continuous !== false;
    recognition.interimResults = true;
    recognition.lang = options.language || 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      console.log('[Voice] Started listening');
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptText = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          final += transcriptText;
        } else {
          interim += transcriptText;
        }
      }

      if (interim) {
        setInterimTranscript(interim);
        onTranscriptRef.current?.(interim, false);
      }

      if (final) {
        setTranscript(prev => prev + ' ' + final);
        setInterimTranscript('');
        onTranscriptRef.current?.(final, true);
        console.log('[Voice] Final transcript:', final);

        // Reset silence timeout
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
      }
    };

    recognition.onerror = (event: any) => {
      // no-speech = user didn't speak in time; treat as non-fatal, don't surface or log as error
      if (event.error === 'no-speech') {
        stoppedByNoSpeechRef.current = true;
        return;
      }
      console.error('[Voice] Recognition error:', event.error);
      setError(event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      const wasNoSpeech = stoppedByNoSpeechRef.current;
      stoppedByNoSpeechRef.current = false;
      setIsListening(false);
      if (!wasNoSpeech) {
        console.log('[Voice] Stopped listening');
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, [options.language, options.continuous]);

  const start = useCallback(() => {
    if (!isSupported || !recognitionRef.current) {
      setError('Speech recognition not available');
      return;
    }

    try {
      setTranscript('');
      setInterimTranscript('');
      recognitionRef.current.start();
    } catch (err) {
      console.error('[Voice] Failed to start:', err);
      setError('Failed to start listening');
    }
  }, [isSupported]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    }
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  // Interrupt detection - stop listening when user starts speaking during AI response
  const enableInterruptDetection = useCallback(() => {
    if (!isSupported || !recognitionRef.current) return;

    const interruptRecognition = new ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)();
    interruptRecognition.continuous = true;
    interruptRecognition.interimResults = true;

    interruptRecognition.onresult = (event: any) => {
      // Detect any speech - trigger interrupt
      if (event.results.length > 0) {
        console.log('[Voice] Interrupt detected!');
        onInterruptRef.current?.();
        interruptRecognition.stop();
      }
    };

    interruptRecognition.start();

    return () => {
      interruptRecognition.stop();
    };
  }, [isSupported, options]);

  return {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    error,
    start,
    stop,
    reset,
    enableInterruptDetection,
  };
}
