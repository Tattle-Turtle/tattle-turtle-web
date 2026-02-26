/**
 * User-facing error and loading copy — friendly, calm, on-brand.
 * Use these instead of raw API/technical messages in the UI.
 */

export const ERROR_MESSAGES = {
  auth: {
    checkEmail: 'Check your email to confirm, then sign in.',
    signInFailed: 'Sign in didn’t work. Check your email and password and try again.',
    authNotConfigured: 'Sign-in isn’t set up yet. Please check the app configuration.',
    pleaseLogIn: 'Please log in.',
    pleaseLogInAsParent: 'Please log in as a parent.',
    sessionExpired: 'Your session expired. Please sign in again.',
  },
  config: {
    missingGeminiKey: 'Shelly needs her magic key! Add GEMINI_API_KEY to the server so she can chat.',
  },
  network: {
    generic: "We couldn’t load that right now. Try again in a moment.",
    chat: "Oops! I'm having a little trouble. Can you check the internet?",
  },
  call: {
    analyzeFailed: 'We couldn’t summarize that call. You can try again or skip.',
  },
  voice: {
    notSupported: 'Talking isn’t supported in this browser. Try typing instead!',
    notAvailable: 'Voice isn’t available right now.',
    failedToStart: 'Microphone isn’t working — check that the app is allowed to use it.',
    noMatch: 'We didn’t catch that. Try again when you’re ready.',
    audioCapture: 'Microphone isn’t working — check permissions.',
    network: 'Voice needs the internet. Check your connection and try again.',
    default: 'Something went wrong with the microphone. Try again in a moment.',
  },
  speech: {
    soundHiccup: 'Sound had a little hiccup. We can try again.',
  },
  generic: {
    tryAgain: 'Something went wrong. Try again in a moment.',
    loadFailed: "We couldn’t load that right now. Try again.",
  },
} as const;

export const LOADING_MESSAGES = {
  auth: 'Getting ready...',
  child: {
    default: 'Shelly is getting ready...',
    missions: 'Loading your brave missions...',
    chat: 'Loading your chat...',
  },
  parent: {
    default: 'Loading...',
    summary: 'Loading summary...',
    saving: 'Saving...',
  },
  setup: 'Creating Magic...',
  character: 'Creating your new look...',
} as const;

/**
 * Kid-friendly encouragement and reward copy (Ramotion, Raw.Studio: positive reinforcement, immediate feedback).
 */
export const KID_COPY = {
  badgeTitle: "You did it!",
  badgeSubtitle: "You're a Brave Explorer!",
  rewardCollect: "You did it! Collect your reward!",
  rewardPoints: "Brave points",
  greatCall: "Great call!",
  collect: "Collect",
  collectLater: "Collect later",
  later: "Later",
} as const;

/** Map Web Speech API / voice recognition error codes to friendly messages */
export function getVoiceErrorMessage(code: string | null | undefined): string | null {
  if (!code) return null;
  const map: Record<string, string> = {
    'not-allowed': ERROR_MESSAGES.voice.audioCapture,
    'no-speech': ERROR_MESSAGES.voice.noMatch,
    'audio-capture': ERROR_MESSAGES.voice.audioCapture,
    'network': ERROR_MESSAGES.voice.network,
    'Speech recognition not available': ERROR_MESSAGES.voice.notAvailable,
    'Failed to start listening': ERROR_MESSAGES.voice.failedToStart,
  };
  return map[code] || ERROR_MESSAGES.voice.default;
}
