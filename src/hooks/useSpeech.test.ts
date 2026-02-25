import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSpeech } from './useSpeech';

describe('useSpeech', () => {
  const mockCancel = vi.fn();
  const mockSpeak = vi.fn();
  const mockGetVoices = vi.fn(() => []);

  beforeEach(() => {
    vi.stubGlobal('speechSynthesis', {
      cancel: mockCancel,
      speak: mockSpeak,
      getVoices: mockGetVoices,
    });
    vi.stubGlobal('SpeechSynthesisUtterance', vi.fn().mockImplementation(function (this: any, text: string) {
      this.text = text;
      this.onstart = null;
      this.onend = null;
      this.onerror = null;
    }));
    mockCancel.mockClear();
    mockSpeak.mockClear();
  });

  it('reports isSupported true when speechSynthesis exists', () => {
    const { result } = renderHook(() => useSpeech());
    expect(result.current.isSupported).toBe(true);
  });

  it('speak calls speechSynthesis.speak and sets isSpeaking when onstart fires', () => {
    const { result } = renderHook(() => useSpeech());
    let utterance: any;
    mockSpeak.mockImplementation((u: any) => {
      utterance = u;
    });
    act(() => result.current.speak('Hello'));
    expect(mockCancel).toHaveBeenCalled();
    expect(mockSpeak).toHaveBeenCalled();
    expect(utterance).toBeDefined();
    expect(utterance.rate).toBe(0.9);
    expect(utterance.pitch).toBe(1.1);
    act(() => { utterance?.onstart?.(); });
    expect(result.current.isSpeaking).toBe(true);
    act(() => { utterance?.onend?.(); });
    expect(result.current.isSpeaking).toBe(false);
  });

  it('stop calls cancel and clears isSpeaking', () => {
    const { result } = renderHook(() => useSpeech());
    let utterance: any;
    mockSpeak.mockImplementation((u: any) => { utterance = u; });
    act(() => result.current.speak('Hi'));
    act(() => { utterance?.onstart?.(); });
    expect(result.current.isSpeaking).toBe(true);
    act(() => result.current.stop());
    expect(mockCancel).toHaveBeenCalled();
    expect(result.current.isSpeaking).toBe(false);
  });
});

describe('useSpeech without speechSynthesis', () => {
  let originalSpeechSynthesis: typeof globalThis.speechSynthesis;

  beforeEach(() => {
    originalSpeechSynthesis = (globalThis as any).speechSynthesis;
    delete (globalThis as any).speechSynthesis;
  });

  afterEach(() => {
    (globalThis as any).speechSynthesis = originalSpeechSynthesis;
  });

  it('reports isSupported false and speak/stop do not throw', () => {
    const { result } = renderHook(() => useSpeech());
    expect(result.current.isSupported).toBe(false);
    expect(() => act(() => result.current.speak('Hi'))).not.toThrow();
    expect(() => act(() => result.current.stop())).not.toThrow();
  });
});
