import { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import { InstallButton } from './ui/InstallButton';
import { ModeTabs } from './ui/ModeTabs';
import { Practice } from './ui/Practice';
import { Spinner } from './ui/Spinner';
import { ThemeSwitch } from './ui/ThemeSwitch';
import { Transcribe } from './ui/Transcribe';
import { useTheme } from './ui/theme';
import { TUTORIAL_SEEN_KEY } from './ui/tutorial/seenKey';
import './ui/gloss.css';

// Code-split: neither is needed for the default transcribe view.
const SentenceBuilder = lazy(() =>
  import('./ui/sentences/SentenceBuilder').then((m) => ({ default: m.SentenceBuilder })),
);
const DemoTutorial = lazy(() =>
  import('./ui/tutorial/DemoTutorial').then((m) => ({ default: m.DemoTutorial })),
);

type AppMode = 'transcribe' | 'practice' | 'sentence';

const TABS = [
  { id: 'transcribe', label: 'Transcribe' },
  { id: 'practice', label: 'Practice' },
  { id: 'sentence', label: 'Sentence' },
] as const;

// Shared page gutter: the header, every mode and the footer align to it.
const WRAP = 'mx-auto w-full max-w-[1400px] px-4 sm:px-6';

export default function App() {
  const [appMode, setAppMode] = useState<AppMode>('transcribe');
  const [theme, toggleTheme] = useTheme();
  // First-visit auto-open. localStorage read lazy-initialized once.
  const [tutorialOpen, setTutorialOpen] = useState(
    () => typeof window !== 'undefined' && !window.localStorage.getItem(TUTORIAL_SEEN_KEY),
  );

  const switchMode = (m: AppMode) => {
    // Leaving the tutorial by a tab counts as having seen it, same as Skip.
    if (tutorialOpen) window.localStorage.setItem(TUTORIAL_SEEN_KEY, '1');
    setTutorialOpen(false);
    setAppMode(m);
  };

  return (
    <div className="v-gloss min-h-svh flex flex-col">
      <a href="#main" className="g-skip">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b g-rule bg-page g-safe-t">
        <div className={`${WRAP} flex flex-wrap items-stretch gap-x-6 md:gap-x-8`}>
          <Link to="/" className="flex h-14 items-center font-display text-[1.1rem] tracking-[-0.02em] g-t1">
            SignSpeak
          </Link>
          {/* Second row on phones, inline from md. Either way the tabs' ink bar
              lands on the header's bottom rule. */}
          <ModeTabs
            tabs={TABS}
            value={appMode}
            onChange={switchMode}
            label="App mode"
            className="order-last h-11 w-full md:order-none md:h-14 md:w-auto"
          />
          <div className="ml-auto flex h-14 items-center gap-4 text-[13px] sm:gap-5">
            <InstallButton />
            <button
              type="button"
              onClick={() => setTutorialOpen(true)}
              aria-pressed={tutorialOpen}
              className="g-quiet g-mono"
            >
              Tutorial
            </button>
            <span className="sm:hidden">
              <ThemeSwitch theme={theme} toggle={toggleTheme} compact />
            </span>
            <span className="hidden sm:contents">
              <ThemeSwitch theme={theme} toggle={toggleTheme} />
            </span>
          </div>
        </div>
      </header>

      <main id="main" className={`${WRAP} flex-1 py-5 lg:py-7`}>
        {tutorialOpen ? (
          <Suspense fallback={<Spinner label="Loading tutorial" />}>
            <DemoTutorial
              onExit={() => setTutorialOpen(false)}
              onSwitchToSentence={() => switchMode('sentence')}
            />
          </Suspense>
        ) : appMode === 'transcribe' ? (
          <Transcribe />
        ) : appMode === 'practice' ? (
          <Practice />
        ) : (
          <Suspense fallback={<Spinner label="Loading sentence builder" />}>
            <SentenceBuilder />
          </Suspense>
        )}
      </main>

      <footer className="border-t g-rule g-safe-b">
        <div className={`${WRAP} flex h-12 items-center justify-between text-xs g-t3`}>
          <span>Research preview. Recognition runs on this device.</span>
          <a href="mailto:anirudhannaboina1@gmail.com?subject=SignSpeak%20feedback" className="g-quiet">
            Feedback
          </a>
        </div>
      </footer>
    </div>
  );
}
