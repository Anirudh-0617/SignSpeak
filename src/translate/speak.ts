// Browser Text-to-Speech wrapper. Zero deps, zero cost, zero network.
// Available in Chrome/Edge/Safari/Firefox on desktop + mobile.
export function speak(text: string, lang = 'en-US'): void {
  if (typeof speechSynthesis === 'undefined') return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  speechSynthesis.speak(u);
}

export function ttsSupported(): boolean {
  return typeof speechSynthesis !== 'undefined';
}
