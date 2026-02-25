import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { getSession } from './lib/supabase';

vi.mock('./lib/supabase', () => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  supabase: null,
}));

function renderApp(initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <App />
    </MemoryRouter>
  );
}

describe('App chat', () => {
  beforeEach(() => {
    vi.mocked(getSession).mockResolvedValue({
      data: {
        session: {
          access_token: 'fake-token',
          user: { id: 'parent-1', email: 'p@test.com' },
        } as any,
      },
      error: null,
    });
    global.fetch = vi.fn();
  });

  it('shows chat input and send when profile and messages are loaded', async () => {
    const profile = {
      id: 1,
      child_name: 'Alex',
      character_name: 'Shelly',
      points: 0,
      parent_contact: 'p@test.com',
      child_age: 6,
      character_type: 'Turtle',
      color: 'Emerald',
      level: 1,
    };
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/profile') && init?.method !== 'POST') {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(profile) } as Response);
      }
      if (url.includes('/api/messages')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) } as Response);
      }
      if (url.includes('/api/chat/opening')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) } as Response);
      }
      if (url.includes('/api/badges')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) } as Response);
      }
      return Promise.reject(new Error('Unmocked: ' + url));
    });

    renderApp('/chat');

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/type here/i)).toBeInTheDocument();
    });
  });
});
