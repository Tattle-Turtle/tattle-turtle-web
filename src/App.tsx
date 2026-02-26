/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  MessageCircle,
  ShieldCheck,
  Heart,
  Settings,
  User,
  ArrowLeft,
  Activity,
  AlertTriangle,
  Lightbulb,
  Turtle,
  Trophy,
  Star,
  Sparkles,
  Phone,
  PhoneOff,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Home,
  ChevronRight,
  X,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useSpeech } from './hooks/useSpeech';
import { useVoiceRecognition } from './hooks/useVoiceRecognition';
import { useCallTimer } from './hooks/useCallTimer';
// Auth removed for now; server uses DEFAULT_PARENT_ID when no token
import { Link } from 'react-router-dom';
import { ReactiveEyes } from './components/ReactiveEyes';
import { NotFoundPage } from './components/NotFoundPage';
import { ERROR_MESSAGES, LOADING_MESSAGES, KID_COPY, getVoiceErrorMessage } from './lib/errorMessages';

type PageMode = 'child' | 'missions';
type OverlayMode = 'on-call' | 'post-call-reward';
type AppMode = PageMode | OverlayMode;

const PATH_TO_MODE: Record<string, AppMode> = {
  '/': 'child',
  '/home': 'child',
  '/missions': 'missions',
};

const MODE_TO_PATH: Record<PageMode, string> = {
  child: '/home',
  missions: '/missions',
};

const OVERLAY_MODES: OverlayMode[] = ['on-call', 'post-call-reward'];

function isOverlayMode(m: AppMode): m is OverlayMode {
  return OVERLAY_MODES.includes(m as OverlayMode);
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const BREADCRUMB_LABELS: Record<PageMode, string> = {
  child: 'Home',
  missions: 'Feed Tammy',
};

const NAV_ITEMS: { path: string; label: string; mode: PageMode; Icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { path: '/home', label: 'Home', mode: 'child', Icon: Home },
  { path: '/missions', label: 'Feed Tammy', mode: 'missions', Icon: Star },
];

function AppNav({ routeMode }: { routeMode: PageMode }) {
  const crumbs: { path: string; label: string }[] = [{ path: '/home', label: 'Home' }];
  if (routeMode !== 'child') {
    const label = BREADCRUMB_LABELS[routeMode];
    const path = MODE_TO_PATH[routeMode];
    if (path) crumbs.push({ path, label });
  }

  return (
    <>
      {/* Desktop: top bar */}
      <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/95 backdrop-blur-sm border-b border-emerald-100/80 text-sm font-medium text-slate-600">
        <nav className="max-w-6xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            {crumbs.map((c, i) => (
              <span key={c.path} className="flex items-center gap-2">
                {i > 0 && <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />}
                {i === crumbs.length - 1 ? (
                  <span className="text-emerald-800 font-bold">{c.label}</span>
                ) : (
                  <Link to={c.path} className="text-emerald-600 hover:underline">{c.label}</Link>
                )}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-4">
            {NAV_ITEMS.map(({ path, label, mode, Icon }) => (
              <Link
                key={path}
                to={path}
                className={cn(
                  'flex items-center gap-1.5 hover:text-emerald-700',
                  routeMode === mode && 'font-bold text-emerald-700'
                )}
              >
                <Icon size={18} />
                {label}
              </Link>
            ))}
          </div>
        </nav>
      </div>

      {/* Mobile: fixed bottom nav — kid-friendly 44px+ touch targets, clear symbols + short labels (Raw.Studio, Ramotion) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/98 backdrop-blur-sm border-t-2 border-emerald-200 shadow-[0_-4px_20px_rgba(5,150,105,0.08)] pb-[env(safe-area-inset-bottom)]"
        aria-label="Main navigation"
      >
        <div className="flex items-stretch justify-around max-w-2xl mx-auto">
          {NAV_ITEMS.map(({ path, label, mode, Icon }) => (
            <Link
              key={path}
              to={path}
              className={cn(
                'touch-target flex flex-col items-center justify-center flex-1 min-w-0 py-4 px-2 text-xs font-bold transition-colors rounded-lg mx-0.5 my-1',
                routeMode === mode
                  ? 'text-emerald-600 bg-emerald-50/90'
                  : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50/50 active:bg-emerald-100/50'
              )}
            >
              <Icon size={28} strokeWidth={2.5} className="mb-1 shrink-0" aria-hidden />
              <span className="truncate w-full text-center leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}

type Message = {
  id: number;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
};

type Badge = {
  id: string;
  name: string;
  icon: string;
  description: string;
};

type ChildProfile = {
  id?: number;
  parent_contact: string;
  child_name: string;
  child_age: number;
  character_name: string;
  character_type: string;
  color: string;
  level: number;
  points: number;
  image_data?: string;
};

type Mission = {
  id: number;
  title: string;
  description: string;
  difficulty?: 'easy' | 'medium' | 'stretch';
  points: number;
  completed: boolean;
  steps?: string[];
  completed_at?: string | null;
  shared_with_parent_at?: string | null;
};

type ParentReport = {
  summary: string;
  courage_counts?: { social: number; performance: number; repair: number };
  suggested_dinner_question?: string;
  suggestions: string[];
  safety_status: string;
  book_recommendations: { title: string; author: string; reason: string }[];
  growth_moments: { moment: string; description: string }[];
};

type ChildRequest = {
  id: number;
  request_type: string;
  request_text: string;
  status: string;
};

type ChildSummary = {
  id: number;
  child_name: string;
  child_age: number;
  level: number;
  points: number;
  image_data?: string;
  access_allowed?: boolean;
};

type Celebration = {
  id: number;
  title: string;
  child_name: string;
  shared_at: string;
};

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const is404 = pathname in PATH_TO_MODE === false;
  const routeMode = (PATH_TO_MODE[pathname] ?? 'child') as PageMode;
  const [overlayMode, setOverlayMode] = useState<OverlayMode | null>(null);
  const mode: AppMode = overlayMode ?? routeMode;

  const goTo = (newMode: AppMode) => {
    if (isOverlayMode(newMode)) {
      setOverlayMode(newMode);
      return;
    }
    setOverlayMode(null);
    const path = MODE_TO_PATH[newMode as PageMode];
    if (path !== undefined && path !== pathname) navigate(path);
  };

  const [authLoading, setAuthLoading] = useState(false);
  const [setupStep, setSetupStep] = useState(1);
  const [messages, setMessages] = useState<Message[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [profile, setProfile] = useState<ChildProfile | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [report, setReport] = useState<ParentReport | null>(null);
  const [requests, setRequests] = useState<ChildRequest[]>([]);
  const [children, setChildren] = useState<ChildSummary[]>([]);
  const [celebrations, setCelebrations] = useState<Celebration[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [showBadgePopup, setShowBadgePopup] = useState<Badge | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [setupData, setSetupData] = useState({
    parent_contact: '',
    child_name: '',
    child_age: '',
    character_name: 'Shelly',
    character_type: 'Turtle',
    color: 'Emerald'
  });
  const [setupError, setSetupError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { speak, stop, isSpeaking, speechError, clearSpeechError } = useSpeech();

  // Voice and transcription state
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [childTranscript, setChildTranscript] = useState('');
  const [aiTranscript, setAiTranscript] = useState('');

  // Post-call reward (current screen) and pending reward (collect later on home)
  const [rewardItem, setRewardItem] = useState<{ name: string; emoji: string; points: number } | null>(null);
  const [pendingCallReward, setPendingCallReward] = useState<{ name: string; emoji: string; points: number } | null>(null);

  // Call conversation analysis (summary + suggestions to guide the student)
  const [callAnalysis, setCallAnalysis] = useState<{ summary: string; issues: string[]; suggestions: string[] } | null>(null);
  const [callAnalysisLoading, setCallAnalysisLoading] = useState(false);
  const [callAnalysisError, setCallAnalysisError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [missionsLoading, setMissionsLoading] = useState(false);
  const [parentDataLoading, setParentDataLoading] = useState(false);
  const [showChildCodeReveal, setShowChildCodeReveal] = useState(false);
  const [childCodeReveal, setChildCodeReveal] = useState('');
  const [childLoginError, setChildLoginError] = useState('');
  const [childLoginCode, setChildLoginCode] = useState('');
  const [childLoginLoading, setChildLoginLoading] = useState(false);
  const [regenerateCodeResult, setRegenerateCodeResult] = useState<string | null>(null);
  const [completingMissionId, setCompletingMissionId] = useState<number | null>(null);
  const [missionEncouragement, setMissionEncouragement] = useState<{ missionId: number; title: string; encouragement: string } | null>(null);
  const [editCharacterData, setEditCharacterData] = useState({
    character_name: 'Shelly',
    character_type: 'Turtle',
    color: 'Emerald'
  });

  // Call timer
  const callTimer = useCallTimer();

  // Voice recognition
  const voiceRecognition = useVoiceRecognition({
    onTranscript: (transcript, isFinal) => {
      setChildTranscript(transcript);
      if (isFinal && isVoiceMode) {
        // Send the message when transcript is final
        handleVoiceMessage(transcript);
      }
    },
    onInterrupt: () => {
      // Stop AI speaking when child interrupts
      stop();
      console.log('[Voice] Child interrupted!');
    }
  });

  const apiHeaders = (childId?: number | null): HeadersInit => {
    const h: HeadersInit = { 'Content-Type': 'application/json' };
    if (childId != null) h['X-Child-Id'] = String(childId);
    return h;
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (mode === 'missions') fetchMissions();
  }, [mode]);

  useEffect(() => {
    if (mode === 'child' && profile) {
      setEditCharacterData({
        character_name: profile.character_name || 'Shelly',
        character_type: profile.character_type || 'Turtle',
        color: profile.color || 'Emerald'
      });
    }
  }, [mode, profile?.id, profile?.character_name, profile?.character_type, profile?.color]);

  useEffect(() => {
    if (selectedChildId != null && typeof localStorage !== 'undefined') {
      localStorage.setItem('brave_selected_child_id', String(selectedChildId));
    }
  }, [selectedChildId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, aiTranscript, childTranscript]);

  // Post-call: analyze conversation and create missions from conversation (Feed Tammy)
  useEffect(() => {
    if (overlayMode !== 'post-call-reward' || callAnalysis || callAnalysisLoading || messages.length === 0) return;
    setCallAnalysisError(null);
    setCallAnalysisLoading(true);
    const headers = apiHeaders(selectedChildId ?? profile?.id);
    const body = JSON.stringify({ messages: messages.map(({ role, content }) => ({ role, content })) });
    Promise.all([
      fetch('/api/call/analyze', { method: 'POST', headers, body }).then((r) => (r.ok ? r.json() : null)),
      fetch('/api/call/missions', { method: 'POST', headers, body }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([analyzeData]) => {
        if (analyzeData) setCallAnalysis({ summary: analyzeData.summary || '', issues: analyzeData.issues || [], suggestions: analyzeData.suggestions || [] });
      })
      .catch(() => setCallAnalysisError(ERROR_MESSAGES.call.analyzeFailed))
      .finally(() => setCallAnalysisLoading(false));
  }, [overlayMode, messages, callAnalysis, callAnalysisLoading]);

  // When entering on-call (direct from Talk to Tammy): init messages, voice, timer. Run once per call.
  const onCallInitDoneRef = useRef(false);
  useEffect(() => {
    if (overlayMode !== 'on-call') {
      onCallInitDoneRef.current = false;
      return;
    }
    if (onCallInitDoneRef.current) return;
    onCallInitDoneRef.current = true;
    setCallAnalysis(null);
    if (profile?.id != null) setSelectedChildId((id) => id ?? profile!.id);
    fetchMessages();
    setIsVoiceMode(true);
    voiceRecognition.start();
    callTimer.start();
  }, [overlayMode, profile?.id]);

  const fetchProfile = async () => {
    setProfileLoading(true);
    const res = await fetch('/api/profile', { headers: apiHeaders() });
    if (res.status === 401) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    const data = await res.json();
    setProfile(data);
    setProfileLoading(false);
    if (data?.id) setSelectedChildId(data.id);
    const atRoot = pathname === '/' || pathname === '/home';
    if (atRoot) goTo('child');
  };

  const fetchMessages = async () => {
    const childId = selectedChildId ?? profile?.id;
    const res = await fetch('/api/messages', { headers: apiHeaders(childId) });
    if (res.status === 401) return;
    const data = await res.json();
    if (Array.isArray(data) && data.length === 0) {
      await fetch('/api/chat/opening', { method: 'POST', headers: apiHeaders(childId) });
      const res2 = await fetch('/api/messages', { headers: apiHeaders(childId) });
      const data2 = await res2.json();
      setMessages(Array.isArray(data2) ? data2 : data);
    } else {
      setMessages(data);
    }
  };

  const fetchBadges = async () => {
    const res = await fetch('/api/badges', { headers: apiHeaders(selectedChildId ?? profile?.id) });
    if (res.status === 401) return;
    const data = await res.json();
    setBadges(data ?? []);
  };

  const fetchMissions = async () => {
    setMissionsLoading(true);
    const res = await fetch('/api/missions', { headers: apiHeaders(selectedChildId ?? profile?.id) });
    if (res.status === 401) {
      setMissionsLoading(false);
      return;
    }
    const data = await res.json();
    setMissions(data ?? []);
    setMissionsLoading(false);
  };

  const fetchParentData = async () => {
    setParentDataLoading(true);
    try {
      const headers = apiHeaders(selectedChildId ?? undefined);
      const [reportRes, requestsRes, childrenRes, celebrationsRes] = await Promise.all([
        fetch('/api/parent/report', { headers }),
        fetch('/api/parent/requests', { headers }),
        fetch('/api/parent/children', { headers }),
        fetch('/api/parent/celebrations', { headers })
      ]);

      if (reportRes.status === 401 || requestsRes.status === 401 || childrenRes.status === 401) {
        setConfigError(ERROR_MESSAGES.auth.pleaseLogInAsParent);
        return;
      }

      const [reportData, requestsData, childrenData, celebrationsData] = await Promise.all([
        reportRes.ok ? reportRes.json() : Promise.resolve(null),
        requestsRes.ok ? requestsRes.json() : Promise.resolve([]),
        childrenRes.ok ? childrenRes.json() : Promise.resolve([]),
        celebrationsRes.ok ? celebrationsRes.json() : Promise.resolve([])
      ]);

      setReport(reportData);
      setRequests(requestsData);
      setChildren(childrenData);
      setCelebrations(celebrationsData ?? []);
      if (childrenData && childrenData.length > 0) {
        if (!selectedChildId) {
          const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('brave_selected_child_id') : null;
          const storedId = stored ? parseInt(stored, 10) : NaN;
          const validStored = !isNaN(storedId) && childrenData.some((c: ChildSummary) => c.id === storedId);
          setSelectedChildId(validStored ? storedId : childrenData[0].id);
        }
      }
    } catch (err) {
      console.error("Error fetching parent data:", err);
    } finally {
      setParentDataLoading(false);
    }
  };

  const handleRequestAction = async (id: number, status: 'approved' | 'rejected') => {
    await fetch(`/api/parent/requests/${id}`, {
      method: 'POST',
      headers: apiHeaders(selectedChildId ?? undefined),
      body: JSON.stringify({ status })
    });
    fetchParentData();
  };

  const claimCallReward = async (reward: { name: string; emoji: string; points: number }) => {
    if (!profile) return;
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: apiHeaders(profile.id),
        body: JSON.stringify({ points: profile.points + reward.points }),
      });
      if (res.ok) {
        setProfile({ ...profile, points: profile.points + reward.points });
      }
    } catch (err) {
      console.error('Failed to update points:', err);
    }
    setRewardItem(null);
    setPendingCallReward(null);
  };

  const handleSetup = async () => {
    setSetupError(null);
    const name = setupData.child_name?.trim() ?? '';
    const ageNum = setupData.child_age === '' ? NaN : parseInt(setupData.child_age, 10);
    if (!name) {
      setSetupError("Please enter your child's name.");
      return;
    }
    if (Number.isNaN(ageNum) || ageNum < 4 || ageNum > 12) {
      setSetupError("Please enter an age between 4 and 12.");
      return;
    }
    setIsCreating(true);
    setShowChildCodeReveal(false);
    setChildCodeReveal('');
    const isAddingAnotherChild = children.length > 0;
    const body: Record<string, unknown> = {
      child_name: name,
      child_age: ageNum,
      character_name: setupData.character_name || 'Shelly',
      character_type: setupData.character_type || 'Turtle',
      color: setupData.color || 'Emerald'
    };
    if (!isAddingAnotherChild) {
      body.parent_contact = setupData.parent_contact ?? '';
    }
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setSetupError(data?.error || "Something went wrong. Please try again.");
        return;
      }
      setProfile(data);
      if (data?.id) setSelectedChildId(data.id);
      if (data?.access_code) {
        setChildCodeReveal(data.access_code);
        setShowChildCodeReveal(true);
      } else {
        goTo('child');
      }
    } catch (err) {
      console.error(err);
      setSetupError("Something went wrong. Please check your connection and try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleVoiceMessage = async (transcript: string) => {
    if (!transcript.trim() || isLoading) return;

    setIsLoading(true);
    voiceRecognition.reset();
    setChildTranscript('');

    const tempId = Date.now();
    setMessages(prev => [...prev, { id: tempId, role: 'user', content: transcript, timestamp: new Date().toISOString() }]);

    try {
      const childId = selectedChildId ?? profile?.id;
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: apiHeaders(childId),
        body: JSON.stringify({ message: transcript, child_id: childId ?? undefined }),
      });
      const data = await res.json();

      if (res.status === 401) {
        setConfigError(ERROR_MESSAGES.config.missingGeminiKey);
        setIsLoading(false);
        return;
      }

      if (!res.ok) {
        const errorContent = data.error || ERROR_MESSAGES.generic.tryAgain;
        setMessages(prev => [...prev, {
          id: Date.now(),
          role: 'model',
          content: errorContent,
          timestamp: new Date().toISOString()
        }]);
        setAiTranscript(errorContent);
        if (!isMuted && errorContent) speak(errorContent);
        return;
      }

      setMessages(prev => [...prev, { id: Date.now(), role: 'model', content: data.response, timestamp: new Date().toISOString() }]);
      setAiTranscript(data.response ?? '');

      // Speak the response if not muted
      if (!isMuted && data.response) {
        speak(data.response);
      }

      if (data.updatedProfile) {
        setProfile(data.updatedProfile);
      }

      if (data.newBadges && data.newBadges.length > 0) {
        setShowBadgePopup(data.newBadges[0]);
        fetchBadges();
        setTimeout(() => setShowBadgePopup(null), 4000);
      }

      // Restart listening after AI finishes
      setTimeout(() => {
        if (isVoiceMode) {
          voiceRecognition.start();
        }
      }, 1000);
    } catch (err) {
      console.error(err);
      const fallbackMsg = "Oops! I'm having a little trouble. Can you check the internet?";
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'model',
        content: fallbackMsg,
        timestamp: new Date().toISOString()
      }]);
      setAiTranscript(fallbackMsg);
      if (!isMuted) speak(fallbackMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMsg = input;
    setInput('');
    setIsLoading(true);

    const tempId = Date.now();
    setMessages(prev => [...prev, { id: tempId, role: 'user', content: userMsg, timestamp: new Date().toISOString() }]);

    try {
      const childId = selectedChildId ?? profile?.id;
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: apiHeaders(childId),
        body: JSON.stringify({ message: userMsg, child_id: childId ?? undefined }),
      });
      const data = await res.json();
      
      if (res.status === 401) {
        setConfigError(ERROR_MESSAGES.config.missingGeminiKey);
        setIsLoading(false);
        return;
      }

      if (!res.ok) {
        setMessages(prev => [...prev, { 
          id: Date.now(), 
          role: 'model', 
          content: data.error || ERROR_MESSAGES.generic.tryAgain, 
          timestamp: new Date().toISOString() 
        }]);
        return;
      }

      setMessages(prev => [...prev, { id: Date.now(), role: 'model', content: data.response, timestamp: new Date().toISOString() }]);
      
      if (data.updatedProfile) {
        setProfile(data.updatedProfile);
      }

      if (data.newBadges && data.newBadges.length > 0) {
        setShowBadgePopup(data.newBadges[0]);
        fetchBadges();
        setTimeout(() => setShowBadgePopup(null), 4000);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { 
        id: Date.now(), 
        role: 'model', 
        content: ERROR_MESSAGES.network.chat, 
        timestamp: new Date().toISOString() 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const progress = Math.min(((profile?.points || 0) % 100 / 100) * 100, 100);
  const currentBadge = badges[badges.length - 1];

  if (is404) return <NotFoundPage />;

  if (profileLoading && (pathname === '/' || pathname === '/home')) {
    return (
      <div className="min-h-screen bg-emerald-50 flex flex-col items-center justify-center p-6 font-sans">
        <div className="bg-white p-10 rounded-[40px] shadow-2xl border-b-8 border-emerald-200 max-w-sm text-center space-y-6">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }} className="flex justify-center">
            <Turtle size={64} className="text-emerald-500" />
          </motion.div>
          <p className="text-emerald-700 font-medium">{LOADING_MESSAGES.auth}</p>
        </div>
      </div>
    );
  }

  if (mode === 'child') {
    return (
      <div className="min-h-screen min-h-[100dvh] pb-24 md:pb-0 bg-gradient-to-b from-sky-300 via-emerald-200 to-emerald-300 flex flex-col font-sans w-full lg:max-w-full xl:max-w-7xl mx-auto lg:shadow-2xl relative overflow-hidden">
        <AppNav routeMode="child" />
        {/* Decorative habitat elements */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Sun */}
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 4 }}
            className="absolute top-4 right-4 w-16 h-16 md:top-8 md:right-8 md:w-20 md:h-20 lg:top-12 lg:right-12 lg:w-24 lg:h-24 bg-yellow-300 rounded-full shadow-lg"
          >
            <div className="absolute inset-2 bg-yellow-200 rounded-full" />
          </motion.div>

          {/* Clouds */}
          <motion.div
            animate={{ x: [-20, 20, -20] }}
            transition={{ repeat: Infinity, duration: 10, ease: 'linear' }}
            className="absolute top-12 left-8 text-3xl md:top-16 md:left-16 md:text-4xl lg:top-20 lg:left-24 lg:text-5xl"
          >
            ☁️
          </motion.div>
          <motion.div
            animate={{ x: [20, -20, 20] }}
            transition={{ repeat: Infinity, duration: 15, ease: 'linear' }}
            className="absolute top-24 right-16 text-3xl md:top-32 md:right-32 md:text-5xl lg:top-40 lg:right-48 lg:text-6xl"
          >
            ☁️
          </motion.div>

          {/* Ground decorations */}
          <div className="absolute bottom-0 left-0 right-0 h-24 md:h-32 lg:h-40 bg-emerald-400/30 rounded-t-[100px]" />
          <div className="absolute bottom-6 left-8 text-2xl md:bottom-8 md:left-12 md:text-3xl lg:bottom-12 lg:left-20 lg:text-4xl">🌸</div>
          <div className="absolute bottom-8 right-12 text-2xl md:bottom-12 md:right-16 md:text-3xl lg:bottom-16 lg:right-24 lg:text-4xl">🌺</div>
          <div className="absolute bottom-4 left-1/4 text-xl md:bottom-6 md:text-2xl lg:bottom-10 lg:text-3xl">🌿</div>
          <div className="absolute bottom-6 right-1/4 text-xl md:bottom-10 md:text-2xl lg:bottom-14 lg:text-3xl">🍀</div>

          {/* Desktop-only extra decorations */}
          <div className="hidden lg:block absolute bottom-20 left-1/3 text-2xl">🦋</div>
          <div className="hidden lg:block absolute bottom-24 right-1/3 text-2xl">🌻</div>
          <div className="hidden lg:block absolute top-1/3 left-10 text-3xl opacity-50">✨</div>
          <div className="hidden lg:block absolute top-1/2 right-10 text-3xl opacity-50">⭐</div>
        </div>

        {/* Pending call reward – collect now or dismiss */}
        {pendingCallReward && (
          <div className="relative z-30 px-4 pt-2 md:px-6 md:pt-4 max-w-6xl mx-auto w-full">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-400 border-4 border-amber-500 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <span className="text-4xl">{pendingCallReward.emoji}</span>
                <div>
                  <p className="font-black text-amber-900 text-lg">{KID_COPY.rewardCollect}</p>
                  <p className="text-amber-800 font-bold">+{pendingCallReward.points} {KID_COPY.rewardPoints}</p>
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => claimCallReward(pendingCallReward)}
                  className="touch-target bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg min-h-[44px]"
                >
                  {KID_COPY.collect}
                </button>
                <button
                  onClick={() => setPendingCallReward(null)}
                  className="touch-target p-3 rounded-full bg-white/80 hover:bg-white transition-colors"
                  aria-label="Dismiss"
                >
                  <X size={22} className="text-slate-600" />
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Header - minimal overlay */}
        <header className="relative z-20 p-4 md:p-6 lg:p-8">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <div className="flex items-center gap-2 md:gap-3 bg-white/80 backdrop-blur-sm px-4 py-2 md:px-6 md:py-3 lg:px-8 lg:py-4 rounded-full shadow-lg">
              <div className="text-right">
                <p className="text-[10px] md:text-xs lg:text-sm font-black text-emerald-500 uppercase tracking-widest">Brave Explorer</p>
                <p className="text-sm md:text-lg lg:text-xl font-black text-emerald-900">{profile?.child_name}</p>
              </div>
              <div className="bg-amber-100 px-2 py-1 md:px-3 md:py-2 lg:px-4 lg:py-2 rounded-full border-2 border-amber-300 flex items-center gap-1">
                <Star size={14} className="text-amber-600 md:w-4 md:h-4 lg:w-5 lg:h-5" fill="currentColor" />
                <span className="font-black text-amber-700 text-sm md:text-base lg:text-lg">{profile?.points}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main habitat area */}
        <main className="flex-1 flex flex-col lg:flex-row items-center justify-center p-4 md:p-6 lg:p-8 gap-6 md:gap-8 lg:gap-12 relative z-10 max-w-6xl mx-auto w-full">
          {/* Character in habitat */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            className="relative lg:flex-shrink-0"
          >
            {profile?.image_data ? (
              <img
                src={profile.image_data}
                alt="Character"
                className="w-40 h-40 md:w-48 md:h-48 lg:w-64 lg:h-64 xl:w-72 xl:h-72 rounded-full border-4 md:border-8 border-white shadow-2xl object-cover"
              />
            ) : (
              <div className="w-40 h-40 md:w-48 md:h-48 lg:w-64 lg:h-64 xl:w-72 xl:h-72 bg-white rounded-full border-4 md:border-8 border-white shadow-2xl flex items-center justify-center text-7xl md:text-9xl lg:text-[10rem]">
                🐢
              </div>
            )}

            {/* Character name tag */}
            <div className="absolute -bottom-3 md:-bottom-4 lg:-bottom-6 left-1/2 -translate-x-1/2 bg-white px-4 py-1 md:px-6 md:py-2 lg:px-8 lg:py-3 rounded-full shadow-lg border-2 md:border-4 border-emerald-200">
              <p className="text-lg md:text-2xl lg:text-3xl font-black text-emerald-800">{profile?.character_name}</p>
            </div>
          </motion.div>

          {/* Action buttons */}
          <div className="w-full max-w-md lg:max-w-lg xl:max-w-xl space-y-3 md:space-y-4 lg:pt-0 pt-8">
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => goTo('on-call')}
              className="w-full bg-emerald-500 hover:bg-emerald-600 p-4 md:p-6 lg:p-8 rounded-[32px] shadow-[0_6px_0_rgb(5,150,105)] md:shadow-[0_8px_0_rgb(5,150,105)] active:shadow-[0_4px_0_rgb(5,150,105)] active:translate-y-1 text-white flex items-center justify-between group"
            >
              <div className="flex items-center gap-3 md:gap-4">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="bg-white/20 p-3 md:p-4 rounded-full"
                >
                  <Phone size={24} className="md:w-8 md:h-8" strokeWidth={3} />
                </motion.div>
                <div className="text-left">
                  <h3 className="text-xl md:text-3xl lg:text-4xl font-black">Talk to {profile?.character_name || 'Tammy'}</h3>
                  <p className="text-emerald-100 font-bold text-sm md:text-base lg:text-lg">Brave Call — talk about anything!</p>
                </div>
              </div>
              <div className="text-3xl md:text-4xl lg:text-5xl group-hover:scale-110 transition-transform">📞</div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => goTo('missions')}
              className="w-full bg-amber-400 hover:bg-amber-500 p-4 md:p-6 lg:p-8 rounded-[32px] shadow-[0_6px_0_rgb(217,119,6)] md:shadow-[0_8px_0_rgb(217,119,6)] active:shadow-[0_4px_0_rgb(217,119,6)] active:translate-y-1 text-amber-900 flex items-center justify-between group"
            >
              <div className="flex items-center gap-3 md:gap-4">
                <div className="bg-white/30 p-3 md:p-4 rounded-full">
                  <Trophy size={24} className="md:w-8 md:h-8" strokeWidth={3} />
                </div>
                <div className="text-left">
                  <h3 className="text-xl md:text-3xl lg:text-4xl font-black">Feed {profile?.character_name || 'Tammy'}</h3>
                  <p className="text-amber-700 font-bold text-sm md:text-base lg:text-lg">Missions & celebrate!</p>
                </div>
              </div>
              <div className="text-3xl md:text-4xl lg:text-5xl group-hover:scale-110 transition-transform">🏆</div>
            </motion.button>

          </div>
        </main>
      </div>
    );
  }

  if (mode === 'missions') {
    const handleCompleteMission = async (m: Mission) => {
      if (m.completed || completingMissionId != null) return;
      setCompletingMissionId(m.id);
      try {
        const res = await fetch(`/api/missions/${m.id}/complete`, {
          method: 'PATCH',
          headers: apiHeaders(selectedChildId ?? profile?.id),
        });
        const data = res.ok ? await res.json() : null;
        const encouragement = data?.encouragement ?? "You did it! That was brave.";
        setMissions((prev) => prev.map((x) => (x.id === m.id ? { ...x, completed: true, completed_at: new Date().toISOString() } : x)));
        setMissionEncouragement({ missionId: m.id, title: m.title, encouragement });
      } catch {
        setMissionEncouragement({ missionId: m.id, title: m.title, encouragement: "You did it! That was brave." });
      } finally {
        setCompletingMissionId(null);
      }
    };
    const handleShareMission = async (missionId: number) => {
      try {
        await fetch(`/api/missions/${missionId}/share`, {
          method: 'POST',
          headers: apiHeaders(selectedChildId ?? profile?.id),
        });
        setMissions((prev) => prev.map((x) => (x.id === missionId ? { ...x, shared_with_parent_at: new Date().toISOString() } : x)));
        setMissionEncouragement(null);
      } catch {
        // keep popup open
      }
    };
    return (
      <div className="min-h-screen pb-24 md:pb-0 bg-emerald-50 flex flex-col font-sans max-w-2xl mx-auto shadow-2xl relative">
        <AppNav routeMode="missions" />
        <header className="bg-white p-6 border-b-4 border-emerald-100 flex items-center gap-4">
          <button onClick={() => goTo('child')} className="p-2 hover:bg-emerald-50 rounded-xl">
            <ArrowLeft className="text-emerald-600" size={24} />
          </button>
          <h1 className="text-3xl font-black text-emerald-900 uppercase">Feed {profile?.character_name || 'Tammy'}</h1>
        </header>
        <main className="p-6 space-y-4">
          {missionsLoading && missions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-emerald-700">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }} className="mb-4">
                <Turtle size={48} className="text-emerald-500" />
              </motion.div>
              <p className="font-medium">{LOADING_MESSAGES.child.missions}</p>
            </div>
          )}
          {!missionsLoading && missions.map((m) => (
            <div key={m.id} className={cn("bg-white p-6 rounded-[32px] border-4 shadow-sm flex flex-col gap-4", m.completed ? "border-emerald-200 bg-emerald-50/50" : "border-emerald-100")}>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl font-black text-emerald-900">{m.title}</h3>
                    {m.difficulty && (
                      <span className={cn(
                        "text-[10px] font-black uppercase px-2 py-0.5 rounded-full",
                        m.difficulty === "easy" && "bg-emerald-100 text-emerald-700",
                        m.difficulty === "medium" && "bg-amber-100 text-amber-700",
                        m.difficulty === "stretch" && "bg-violet-100 text-violet-700"
                      )}>
                        {m.difficulty}
                      </span>
                    )}
                    {m.completed && <span className="text-emerald-600 font-bold text-sm">Done!</span>}
                  </div>
                  <p className="text-slate-500 font-medium">{m.description}</p>
                </div>
                <div className="bg-amber-100 px-4 py-2 rounded-2xl border-2 border-amber-200 text-amber-700 font-black flex items-center gap-2 shrink-0">
                  <Star size={16} fill="currentColor" />
                  {m.points}
                </div>
              </div>
              {Array.isArray(m.steps) && m.steps.length > 0 && (
                <ol className="list-decimal list-inside space-y-1 text-emerald-800 font-medium text-sm md:text-base">
                  {m.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              )}
              {!m.completed && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleCompleteMission(m)}
                  disabled={completingMissionId != null}
                  className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-lg disabled:opacity-60 shadow-[0_4px_0_rgb(5,150,105)] active:shadow-[0_2px_0_rgb(5,150,105)] active:translate-y-0.5"
                >
                  {completingMissionId === m.id ? '...' : "I did it!"}
                </motion.button>
              )}
              {m.completed && (
                <p className="text-emerald-600 font-bold text-sm flex items-center gap-2">
                  <Star size={16} fill="currentColor" />
                  Done!
                </p>
              )}
            </div>
          ))}
          {!missionsLoading && missions.length > 0 && (
            <div className="bg-emerald-100 p-6 rounded-[32px] border-4 border-dashed border-emerald-300 text-center space-y-2">
              <p className="text-emerald-700 font-black text-lg uppercase">More coming soon!</p>
              <p className="text-emerald-600 font-medium">Keep talking to {profile?.character_name || 'Tammy'} to get new missions.</p>
            </div>
          )}
          {!missionsLoading && missions.length === 0 && (
            <div className="bg-emerald-100 p-8 rounded-[40px] border-4 border-dashed border-emerald-300 text-center space-y-2">
              <p className="text-emerald-700 font-black text-xl uppercase">No missions yet</p>
              <p className="text-emerald-600 font-medium">Talk to {profile?.character_name || 'Tammy'} to get your first missions!</p>
            </div>
          )}
        </main>
        <AnimatePresence>
          {missionEncouragement && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="fixed inset-x-4 bottom-24 md:bottom-8 z-50 bg-amber-400 text-amber-950 p-6 rounded-[32px] shadow-2xl border-4 border-white flex flex-col gap-4"
            >
              <p className="text-xl font-black uppercase">{missionEncouragement.encouragement}</p>
              <button
                onClick={() => setMissionEncouragement(null)}
                className="w-full py-3 rounded-xl bg-amber-600 text-white font-bold"
              >
                Done
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // On Call Screen (entered directly from Talk to Tammy) – voice only, no chat/text
  if (mode === 'on-call') {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col font-sans w-full max-w-2xl mx-auto relative">
        {/* Header - Character Video Area */}
        <div className="bg-gradient-to-b from-emerald-500 to-emerald-600 p-4 sm:p-6 md:p-8 relative">
          {/* Call duration with timer */}
          <div className="absolute top-4 left-4 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full">
            <div className="text-white font-bold text-sm flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              {callTimer.formattedTime}
            </div>
          </div>

          {/* Controls */}
          <div className="absolute top-4 right-4 flex gap-2">
            {/* Voice Mode Toggle */}
            <button
              onClick={() => {
                const newMode = !isVoiceMode;
                setIsVoiceMode(newMode);
                if (newMode) {
                  voiceRecognition.start();
                  callTimer.start();
                } else {
                  voiceRecognition.stop();
                }
              }}
              className={cn(
                "backdrop-blur-sm p-3 rounded-full transition-colors",
                isVoiceMode
                  ? "bg-green-500/80 hover:bg-green-600/80"
                  : "bg-black/30 hover:bg-black/40"
              )}
            >
              {isVoiceMode ? (
                <Mic size={24} className="text-white" />
              ) : (
                <MicOff size={24} className="text-white" />
              )}
            </button>

            {/* Mute Toggle */}
            <button
              onClick={() => {
                setIsMuted(!isMuted);
                if (!isMuted) stop();
              }}
              className="bg-black/30 backdrop-blur-sm p-3 rounded-full hover:bg-black/40 transition-colors"
            >
              {isMuted ? (
                <VolumeX size={24} className="text-white" />
              ) : (
                <Volume2 size={24} className="text-white" />
              )}
            </button>
          </div>

          {/* Character Avatar - Large with reactive eyes */}
          <div className="flex flex-col items-center justify-center py-6 sm:py-8 md:py-12">
            <motion.div
              animate={isSpeaking ? {
                scale: [1, 1.05, 1],
                rotate: [0, 2, -2, 0]
              } : {}}
              transition={{ repeat: isSpeaking ? Infinity : 0, duration: 0.5 }}
              className="relative"
            >
              {profile?.image_data ? (
                <img
                  src={profile.image_data}
                  alt="Character"
                  className="w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 rounded-full border-4 md:border-8 border-white shadow-2xl object-cover"
                />
              ) : (
                <div className="w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 bg-white rounded-full border-4 md:border-8 border-white shadow-2xl flex items-center justify-center text-7xl sm:text-8xl md:text-9xl">
                  🐢
                </div>
              )}

              {/* Eyes that react to who is speaking (only for default emoji avatar) */}
              {!profile?.image_data && (
                <div className="absolute inset-0 flex items-center justify-center pt-2">
                  <ReactiveEyes
                    isChildSpeaking={!!(childTranscript || voiceRecognition.interimTranscript) || voiceRecognition.isListening}
                    isAISpeaking={isSpeaking}
                    isListening={voiceRecognition.isListening && !childTranscript && !voiceRecognition.interimTranscript}
                    isLoading={isLoading}
                    size="lg"
                    className="opacity-95"
                  />
                </div>
              )}

              {/* Speaking indicator */}
              {isSpeaking && !isMuted && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 0.5 }}
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-green-500 px-6 py-2 rounded-full flex items-center gap-2 shadow-xl"
                >
                  <Volume2 size={20} className="text-white" />
                  <span className="text-white font-bold">Speaking...</span>
                </motion.div>
              )}
            </motion.div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mt-4 sm:mt-6">
              {profile?.character_name}
            </h2>
            <p className="text-emerald-100 font-bold text-base sm:text-lg">Your Brave Friend</p>
          </div>
        </div>

        {/* Status area: listening / speaking / or quiet */}
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center bg-slate-800/50 px-4 py-6">
          {isSpeaking && !isMuted && (
            <div className="flex items-center gap-2 text-emerald-200 font-bold text-lg">
              <Volume2 size={24} />
              <span>Speaking...</span>
            </div>
          )}
          {voiceRecognition.isListening && !childTranscript && !voiceRecognition.interimTranscript && !isSpeaking && (
            <div className="flex items-center gap-2 text-emerald-200 font-bold text-lg">
              <Mic size={24} />
              <span>Listening...</span>
            </div>
          )}
          {(getVoiceErrorMessage(voiceRecognition.error) || (speechError && ERROR_MESSAGES.speech.soundHiccup)) && (
            <div className="bg-amber-500/90 text-white px-4 py-3 rounded-2xl flex items-center justify-between gap-3 max-w-md mt-2">
              <span className="text-sm font-medium">
                {getVoiceErrorMessage(voiceRecognition.error) || ERROR_MESSAGES.speech.soundHiccup}
              </span>
              <button
                type="button"
                onClick={() => { voiceRecognition.reset(); clearSpeechError(); }}
                className="shrink-0 text-white/90 hover:text-white font-bold text-sm underline"
              >
                OK
              </button>
            </div>
          )}
        </div>

        {/* Footer: end call only */}
        <div className="p-6 bg-slate-900 border-t-2 border-slate-700">
          <div className="flex justify-center">
            <button
              onClick={() => {
                stop();
                voiceRecognition.stop();
                callTimer.reset();

                // Generate random reward
                const rewards = [
                  { name: 'Strawberry', emoji: '🍓', points: 10 },
                  { name: 'Apple', emoji: '🍎', points: 10 },
                  { name: 'Banana', emoji: '🍌', points: 10 },
                  { name: 'Grapes', emoji: '🍇', points: 15 },
                  { name: 'Watermelon', emoji: '🍉', points: 15 },
                  { name: 'Carrot', emoji: '🥕', points: 12 },
                  { name: 'Lettuce', emoji: '🥬', points: 12 },
                  { name: 'Cookie', emoji: '🍪', points: 20 },
                ];
                const randomReward = rewards[Math.floor(Math.random() * rewards.length)];
                setRewardItem(randomReward);

                goTo('post-call-reward');
              }}
              className="bg-red-500 hover:bg-red-600 p-6 rounded-full shadow-2xl group"
            >
              <PhoneOff size={32} className="text-white" strokeWidth={3} />
            </button>
          </div>

          <p className="text-center text-slate-400 text-sm mt-4">
            Tap to end call
          </p>
        </div>

        {/* Badge Popup */}
        <AnimatePresence>
          {showBadgePopup && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="absolute bottom-24 left-4 right-4 bg-amber-400 text-amber-950 p-6 rounded-[32px] shadow-2xl z-50 border-4 border-white flex items-center gap-6"
            >
              <div className="text-6xl bg-white p-4 rounded-3xl shadow-inner">{showBadgePopup.icon}</div>
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tight">{KID_COPY.badgeTitle}</h3>
                <p className="text-lg font-bold">{showBadgePopup.name}</p>
                <p className="text-emerald-700 font-bold text-sm mt-1">{KID_COPY.badgeSubtitle}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Post-Call Reward Screen
  if (mode === 'post-call-reward') {
    const handleCollectNow = () => {
      if (!rewardItem) return;
      claimCallReward(rewardItem);
      setCallAnalysis(null);
      setCallAnalysisError(null);
      goTo('child');
    };

    const handleCollectLater = () => {
      if (rewardItem) setPendingCallReward(rewardItem);
      setRewardItem(null);
      setCallAnalysis(null);
      setCallAnalysisError(null);
      goTo('child');
    };

    const handleBackHome = () => {
      setRewardItem(null);
      setCallAnalysis(null);
      setCallAnalysisError(null);
      goTo('child');
    };

    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-400 via-orange-400 to-amber-500 flex flex-col items-center justify-center p-6 font-sans overflow-y-auto relative">
        {/* Back home / X button */}
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <button
            type="button"
            onClick={handleBackHome}
            className="p-3 rounded-full bg-white/90 hover:bg-white shadow-lg transition-colors"
            aria-label="Back home"
          >
            <X size={28} className="text-slate-700" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={handleBackHome}
            className="flex items-center gap-2 px-4 py-3 rounded-full bg-white/90 hover:bg-white shadow-lg transition-colors font-bold text-slate-700"
          >
            <Home size={22} />
            Back home
          </button>
        </div>

        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', duration: 0.8 }}
          className="text-center space-y-6 max-w-md w-full"
        >
          {/* Celebration */}
          <motion.div
            animate={{ y: [0, -20, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <h1 className="text-6xl font-black text-white mb-4">
              {KID_COPY.greatCall} 🎉
            </h1>
            <p className="text-2xl text-amber-100 font-bold">
              {profile?.character_name} wants to thank you!
            </p>
          </motion.div>

          {/* Conversation summary & ideas (guide the student) – loads in background, appears when ready */}
          {callAnalysisLoading && (
            <div className="bg-white/95 rounded-3xl p-6 text-center">
              <p className="text-slate-600 font-medium">Summarizing your call...</p>
            </div>
          )}
          {callAnalysis && (
            <div className="bg-white/95 rounded-3xl p-6 text-left shadow-xl">
              <div className="space-y-4">
                {callAnalysis.summary && (
                  <div>
                    <h3 className="text-sm font-black text-amber-700 uppercase tracking-wider mb-1">What we talked about</h3>
                    <p className="text-slate-800 text-lg leading-snug">{callAnalysis.summary}</p>
                  </div>
                )}
                {callAnalysis.suggestions.length > 0 && (
                  <div>
                    <h3 className="text-sm font-black text-emerald-700 uppercase tracking-wider mb-2">Ideas for you</h3>
                    <ul className="space-y-2">
                      {callAnalysis.suggestions.map((s, i) => (
                        <li key={i} className="flex gap-2 items-start text-slate-800 text-lg">
                          <span className="text-emerald-500 font-bold shrink-0">•</span>
                          <span className="leading-snug">{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
          {callAnalysisError && (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-4 flex items-center justify-between gap-4">
              <p className="text-amber-800 text-sm font-medium flex-1">{callAnalysisError}</p>
              <button type="button" onClick={() => setCallAnalysisError(null)} className="shrink-0 px-4 py-2 bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold rounded-xl">
                Skip
              </button>
            </div>
          )}

          {/* Reward */}
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="bg-white p-12 rounded-[48px] shadow-2xl"
          >
            <div className="text-9xl mb-4">{rewardItem?.emoji}</div>
            <h2 className="text-4xl font-black text-slate-800 mb-2">
              {rewardItem?.name}
            </h2>
            <p className="text-2xl text-amber-600 font-bold">
              +{rewardItem?.points} points
            </p>
          </motion.div>

          {/* Collect now / Collect later */}
          <div className="space-y-3 w-full">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCollectNow}
              className="touch-target-lg w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black text-2xl py-5 px-8 rounded-full shadow-2xl min-h-[52px]"
            >
              {KID_COPY.collect} now
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCollectLater}
              className="touch-target w-full bg-white/90 hover:bg-white text-slate-700 font-bold text-xl py-4 px-6 rounded-full shadow-lg border-2 border-amber-200 min-h-[48px]"
            >
              {KID_COPY.collectLater}
            </motion.button>
          </div>

          <p className="text-white/80 text-sm">
            Collect now to add points, or collect from home when you’re ready.
          </p>
        </motion.div>
      </div>
    );
  }

  // Edit Character Screen (Kid-Friendly)
  if (mode === 'edit-character') {
    const handleSaveCharacter = async () => {
      if (!editCharacterData.character_name.trim()) return;

      setIsCreating(true);

      try {
        // Generate new avatar with updated settings
        const imageRes = await fetch('/api/character/generate', {
          method: 'POST',
          headers: apiHeaders(profile?.id),
          body: JSON.stringify({
            characterName: editCharacterData.character_name,
            characterType: editCharacterData.character_type,
            color: editCharacterData.color,
          }),
        });

        const imageData = await imageRes.json();

        const res = await fetch('/api/profile', {
          method: 'PUT',
          headers: apiHeaders(profile?.id),
          body: JSON.stringify({
            character_name: editCharacterData.character_name,
            character_type: editCharacterData.character_type,
            color: editCharacterData.color,
            image_data: imageData.image,
          }),
        });

        if (res.ok) {
          const updated = await res.json();
          setProfile(updated);
          goTo('child');
        }
      } catch (err) {
        console.error('Failed to update character:', err);
      } finally {
        setIsCreating(false);
      }
    };

    return (
      <div className="min-h-screen pb-24 md:pb-0 bg-gradient-to-b from-purple-300 via-pink-200 to-orange-200 flex flex-col font-sans max-w-2xl mx-auto shadow-2xl relative overflow-hidden">
        <AppNav routeMode="edit-character" />
        {/* Decorative elements */}
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
            className="absolute top-10 right-10 text-6xl"
          >
            ✨
          </motion.div>
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="absolute bottom-20 left-10 text-5xl"
          >
            🎨
          </motion.div>
          <div className="absolute top-1/4 left-20 text-4xl">🌟</div>
          <div className="absolute top-1/3 right-24 text-3xl">💫</div>
        </div>

        {isCreating && (
          <div className="absolute inset-0 bg-white/90 z-50 flex flex-col items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
            >
              <Sparkles size={80} className="text-purple-500" />
            </motion.div>
            <h3 className="text-3xl font-black text-purple-900 mt-6">
              Creating your new look...
            </h3>
          </div>
        )}

        {/* Header */}
        <header className="relative z-20 p-6">
          <button
            onClick={() => goTo('child')}
            className="bg-white/80 backdrop-blur-sm p-3 rounded-2xl shadow-lg hover:bg-white transition-colors"
          >
            <ArrowLeft className="text-purple-600" size={24} />
          </button>
        </header>

        {/* Main content */}
        <main className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 relative z-10">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-center"
          >
            <h1 className="text-5xl font-black text-purple-900 mb-2">
              Customize Your Friend! 🎨
            </h1>
            <p className="text-2xl text-purple-600 font-bold">
              Make them look exactly how you want!
            </p>
          </motion.div>

          {/* Character Preview */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="relative"
          >
            {profile?.image_data ? (
              <img
                src={profile.image_data}
                alt="Character"
                className="w-40 h-40 rounded-full border-8 border-white shadow-2xl object-cover"
              />
            ) : (
              <div className="w-40 h-40 bg-white rounded-full border-8 border-white shadow-2xl flex items-center justify-center text-8xl">
                🐢
              </div>
            )}
            <div className="absolute -top-2 -right-2 bg-yellow-400 p-3 rounded-full border-4 border-white shadow-lg">
              <Sparkles size={24} className="text-yellow-900" />
            </div>
          </motion.div>

          {/* Customization options */}
          <div className="w-full max-w-md space-y-6 bg-white/80 backdrop-blur-sm p-8 rounded-[40px] shadow-2xl">
            {/* Name */}
            <div className="space-y-3">
              <label className="text-sm font-black text-purple-800 uppercase tracking-widest flex items-center gap-2">
                <span className="text-2xl">📝</span>
                Friend's Name
              </label>
              <input
                type="text"
                value={editCharacterData.character_name}
                onChange={(e) => setEditCharacterData({ ...editCharacterData, character_name: e.target.value })}
                className="w-full bg-purple-50 border-4 border-purple-200 rounded-2xl px-6 py-4 text-2xl font-bold text-purple-900 outline-none focus:border-purple-400 transition-all"
                placeholder="What should we call them?"
              />
            </div>

            {/* Type */}
            <div className="space-y-3">
              <label className="text-sm font-black text-purple-800 uppercase tracking-widest flex items-center gap-2">
                <span className="text-2xl">🦊</span>
                Animal Type
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { type: 'Turtle', emoji: '🐢' },
                  { type: 'Dolphin', emoji: '🐬' },
                  { type: 'Crab', emoji: '🦀' },
                  { type: 'Bunny', emoji: '🐰' },
                  { type: 'Fox', emoji: '🦊' },
                  { type: 'Owl', emoji: '🦉' }
                ].map(({ type, emoji }) => (
                  <motion.button
                    key={type}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setEditCharacterData({ ...editCharacterData, character_type: type })}
                    className={cn(
                      "py-4 px-2 rounded-2xl font-bold border-4 transition-all",
                      editCharacterData.character_type === type
                        ? "bg-purple-500 text-white border-purple-600 shadow-lg scale-105"
                        : "bg-purple-50 text-purple-700 border-purple-200 hover:border-purple-300"
                    )}
                  >
                    <div className="text-3xl mb-1">{emoji}</div>
                    <div className="text-xs">{type}</div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div className="space-y-3">
              <label className="text-sm font-black text-purple-800 uppercase tracking-widest flex items-center gap-2">
                <span className="text-2xl">🎨</span>
                Favorite Color
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { name: 'Emerald', color: 'bg-emerald-500', border: 'border-emerald-600' },
                  { name: 'Ocean', color: 'bg-blue-500', border: 'border-blue-600' },
                  { name: 'Sunset', color: 'bg-orange-500', border: 'border-orange-600' },
                  { name: 'Rose', color: 'bg-rose-500', border: 'border-rose-600' },
                  { name: 'Purple', color: 'bg-purple-500', border: 'border-purple-600' },
                  { name: 'Mint', color: 'bg-teal-400', border: 'border-teal-500' },
                ].map(({ name, color, border }) => (
                  <motion.button
                    key={name}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setEditCharacterData({ ...editCharacterData, color: name })}
                    className={cn(
                      "py-4 rounded-2xl font-bold border-4 transition-all",
                      editCharacterData.color === name
                        ? `${color} text-white ${border} shadow-lg scale-105`
                        : "bg-white border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className={cn("w-8 h-8 rounded-full border-2 border-white shadow-md", color)} />
                      <span className="text-xs font-black">{name}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Save button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSaveCharacter}
              disabled={!editCharacterData.character_name.trim()}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-black text-2xl py-6 rounded-full shadow-[0_8px_0_rgb(147,51,234)] active:shadow-[0_4px_0_rgb(147,51,234)] active:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save My Friend! ✨
            </motion.button>
          </div>
        </main>
      </div>
    );
  }

  // Fallback: unknown mode or edge case — never show a blank page
  return (
    <div className="min-h-screen bg-emerald-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="bg-white p-8 rounded-[40px] shadow-2xl border-b-8 border-emerald-200 max-w-sm text-center space-y-4">
        <Turtle size={56} className="text-emerald-500 mx-auto" />
        <p className="text-emerald-800 font-bold">Let&apos;s get you back!</p>
        <div className="flex flex-col gap-2">
          <Link to="/home" className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-2xl">
            Go to Home
          </Link>
          <Link to="/" className="text-emerald-600 hover:underline text-sm">Start over</Link>
        </div>
      </div>
    </div>
  );
}
