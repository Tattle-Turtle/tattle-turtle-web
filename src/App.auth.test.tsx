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

describe('App parent auth', () => {
  beforeEach(() => {
    vi.mocked(getSession).mockResolvedValue({ data: { session: null }, error: null });
  });

  it('shows Parent sign in on /login', async () => {
    renderApp('/login');
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /parent sign in/i })).toBeInTheDocument();
    });
  });

  it('shows email and password inputs', async () => {
    renderApp('/login');
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
    });
  });

  it('shows Sign in button', async () => {
    renderApp('/login');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });
  });
});
