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

describe('App child home', () => {
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

  it('shows child home with Call and Brave Missions when profile is loaded', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        id: 1,
        child_name: 'Alex',
        character_name: 'Shelly',
        points: 0,
        parent_contact: 'p@test.com',
        child_age: 6,
        character_type: 'Turtle',
        color: 'Emerald',
        level: 1,
      }),
    } as Response);

    renderApp('/home');

    await waitFor(() => {
      expect(screen.getByText(/Call Shelly/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Brave Missions/i)).toBeInTheDocument();
  });
});
