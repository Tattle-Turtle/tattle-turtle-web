import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVoiceRecognition } from './useVoiceRecognition';

describe('useVoiceRecognition', () => {
  const originalSpeechRecognition = (globalThis as any).SpeechRecognition;
  const originalWebkitSpeechRecognition = (globalThis as any).webkitSpeechRecognition;

  afterEach(() => {
    (globalThis as any).SpeechRecognition = originalSpeechRecognition;
    (globalThis as any).webkitSpeechRecognition = originalWebkitSpeechRecognition;
  });

  it('reports isSupported false when SpeechRecognition is missing', () => {
    (globalThis as any).SpeechRecognition = undefined;
    (globalThis as any).webkitSpeechRecognition = undefined;
    const { result } = renderHook(() => useVoiceRecognition());
    expect(result.current.isSupported).toBe(false);
    expect(result.current.error).toBe('Speech recognition not supported in this browser');
  });

  it('start does not throw when unsupported', () => {
    (globalThis as any).SpeechRecognition = undefined;
    (globalThis as any).webkitSpeechRecognition = undefined;
    const { result } = renderHook(() => useVoiceRecognition());
    expect(() => act(() => result.current.start())).not.toThrow();
  });
});
