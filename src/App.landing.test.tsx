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

describe('App landing', () => {
  beforeEach(() => {
    vi.mocked(getSession).mockResolvedValue({ data: { session: null }, error: null });
  });

  it('shows landing with "Shelly & Friends" on /', async () => {
    renderApp('/');
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Shelly & Friends/i })).toBeInTheDocument();
    });
  });

  it('shows "GET STARTED" button when no profile', async () => {
    renderApp('/');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument();
    });
  });

  it('shows "Parents Only" button', async () => {
    renderApp('/');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /parents only/i })).toBeInTheDocument();
    });
  });
});
