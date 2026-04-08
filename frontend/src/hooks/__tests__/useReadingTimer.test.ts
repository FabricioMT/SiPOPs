import { renderHook, act } from '@testing-library/react';
import { useReadingTimer } from '../useReadingTimer';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as authStore from '../../store/authStore';

// Mock the auth store module
vi.mock('../../store/authStore', () => ({
  useAuthStore: vi.fn()
}));

describe('useReadingTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    
    // Setup the mock to return a valid token
    vi.mocked(authStore.useAuthStore).mockReturnValue({ token: 'test-token' });
    
    // Mock navigator.sendBeacon
    const sendBeaconMock = vi.fn().mockReturnValue(true);
    vi.stubGlobal('navigator', { sendBeacon: sendBeaconMock });
    
    // Mock fetch
    const fetchMock = vi.fn().mockImplementation(() => 
      Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'success' }) })
    );
    vi.stubGlobal('fetch', fetchMock);

    // Mock visibility state
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible'
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should increment timer every second when visible', async () => {
    const { result } = renderHook(() => useReadingTimer(1, 10));

    expect(result.current.remainingSeconds).toBe(10);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000); // 3 seconds
    });

    expect(result.current.isReady).toBe(false);
    expect(result.current.remainingSeconds).toBe(7);
  });

  it('should pause timer when page is hidden', async () => {
    const { result } = renderHook(() => useReadingTimer(1, 10));

    // Mock hidden state
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden'
    });
    
    // Dispatch visibilitychange event
    window.dispatchEvent(new Event('visibilitychange'));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    // Should still be 10 remaining because it was hidden
    expect(result.current.remainingSeconds).toBe(10);
  });

  it('should be ready after minTimeSeconds', async () => {
    const { result } = renderHook(() => useReadingTimer(1, 5));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(result.current.isReady).toBe(true);
    expect(result.current.remainingSeconds).toBe(0);
  });

  it('should send beacon on unmount', async () => {
    const { unmount } = renderHook(() => useReadingTimer(1, 30));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000); // Progress 10s
    });

    await act(async () => {
      unmount();
    });

    expect(navigator.sendBeacon).toHaveBeenCalled();
    const [url, payload] = (navigator.sendBeacon as any).mock.calls[0];
    expect(url).toContain('token_query=test-token');
    const data = JSON.parse(payload);
    expect(data.seconds).toBe(10);
    expect(data.final).toBe(true);
  });
});
