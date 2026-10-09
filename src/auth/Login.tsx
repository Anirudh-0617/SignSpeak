import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../ui/theme';
import { ThemeSwitch } from '../ui/ThemeSwitch';
import '../ui/gloss.css';

// ponytail: dummy auth. No backend, no validation, no security. Sets a single
// localStorage key so /app can greet the user by email later if wanted. Swap
// this submit handler for real auth (Supabase / Edge Function) later; the UI
// and route stay.
const USER_KEY = 'signspeak.user';

export default function Login() {
  const [theme, toggle] = useTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setSubmitting(true);
    setTimeout(() => {
      window.localStorage.setItem(USER_KEY, JSON.stringify({ email: email.trim() }));
      navigate('/app');
    }, 400);
  };


  return (
    <div className="v-gloss min-h-svh flex flex-col">
      <header className="border-b g-rule">
        <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 h-14 flex items-center justify-between gap-4 text-[13px]">
          <Link to="/" className="font-display text-[1.1rem] tracking-[-0.02em] g-t1">
            SignSpeak
          </Link>
          <div className="flex items-center gap-5">
            <Link to="/app" className="g-quiet">
              Skip to the app
            </Link>
            <ThemeSwitch theme={theme} toggle={toggle} />
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-[1400px] px-4 sm:px-6 py-14 md:py-24 grid gap-12 md:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] md:gap-20 content-start">
        <div className="grid content-start gap-4">
          <h1 className="font-display text-4xl md:text-6xl text-ink tracking-[-0.035em] leading-[1]">
            Sign in.
          </h1>
          <p className="text-ink-2 max-w-[42ch] leading-relaxed">
            This is a research preview with placeholder sign-in. Any email and password work, and
            nothing leaves this browser.
          </p>
        </div>

        <form onSubmit={submit} className="grid content-start gap-7">
          <label className="grid gap-1.5">
            <span className="text-sm text-ink-2">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              placeholder="you@example.com"
              className="g-input focus-visible:outline-none"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm text-ink-2">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="g-input focus-visible:outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={submitting || !email.trim() || !password}
            className="g-btn press justify-self-start px-5 py-3 text-sm"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </main>
    </div>
  );
}
