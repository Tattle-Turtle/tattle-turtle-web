import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCallTimer } from './useCallTimer';

describe('useCallTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with 0 seconds and formatted "00:00"', () => {
    const { result } = renderHook(() => useCallTimer());
    expect(result.current.seconds).toBe(0);
    expect(result.current.formattedTime).toBe('00:00');
    expect(result.current.isActive).toBe(false);
  });

  it('formattedTime shows MM:SS correctly', () => {
    const { result } = renderHook(() => useCallTimer());
    act(() => result.current.start());
    act(() => { vi.advanceTimersByTime(65000); });
    expect(result.current.formattedTime).toBe('01:05');
  });

  it('start begins counting', () => {
    const { result } = renderHook(() => useCallTimer());
    act(() => result.current.start());
    expect(result.current.isActive).toBe(true);
    act(() => { vi.advanceTimersByTime(3000); });
    expect(result.current.seconds).toBe(3);
    expect(result.current.formattedTime).toBe('00:03');
  });

  it('pause stops counting', () => {
    const { result } = renderHook(() => useCallTimer());
    act(() => result.current.start());
    act(() => { vi.advanceTimersByTime(2000); });
    act(() => result.current.pause());
    expect(result.current.isActive).toBe(false);
    expect(result.current.seconds).toBe(2);
    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current.seconds).toBe(2);
  });

  it('reset clears seconds and stops', () => {
    const { result } = renderHook(() => useCallTimer());
    act(() => result.current.start());
    act(() => { vi.advanceTimersByTime(5000); });
    act(() => result.current.reset());
    expect(result.current.seconds).toBe(0);
    expect(result.current.isActive).toBe(false);
    expect(result.current.formattedTime).toBe('00:00');
  });
});
