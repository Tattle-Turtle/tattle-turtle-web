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
  Send,
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
  PhoneIncoming,
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
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useSpeech } from './hooks/useSpeech';
import { useVoiceRecognition } from './hooks/useVoiceRecognition';
import { useCallTimer } from './hooks/useCallTimer';
import { getSession, onAuthStateChange, supabase } from './lib/supabase';
import { Link } from 'react-router-dom';
import { ReactiveEyes } from './components/ReactiveEyes';
import { NotFoundPage } from './components/NotFoundPage';
import { ERROR_MESSAGES, LOADING_MESSAGES, KID_COPY, getVoiceErrorMessage } from './lib/errorMessages';

type PageMode = 'landing' | 'parent-auth' | 'setup' | 'child' | 'chat' | 'missions' | 'parent' | 'edit-character' | 'child-login';
type OverlayMode = 'incoming-call' | 'connecting-call' | 'on-call' | 'post-call-reward';
type AppMode = PageMode | OverlayMode;

const PATH_TO_MODE: Record<string, AppMode> = {
  '/': 'landing',
  '/login': 'parent-auth',
  '/setup': 'setup',
  '/home': 'child',
  '/chat': 'chat',
  '/missions': 'missions',
  '/parent': 'parent',
  '/character': 'edit-character',
  '/play': 'child-login',
};

const MODE_TO_PATH: Record<PageMode, string> = {
  landing: '/',
  'parent-auth': '/login',
  setup: '/setup',
  child: '/home',
  chat: '/chat',
  missions: '/missions',
  parent: '/parent',
  'edit-character': '/character',
  'child-login': '/play',
};

const OVERLAY_MODES: OverlayMode[] = ['incoming-call', 'connecting-call', 'on-call', 'post-call-reward'];

function isOverlayMode(m: AppMode): m is OverlayMode {
  return OVERLAY_MODES.includes(m as OverlayMode);
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const BREADCRUMB_LABELS: Record<PageMode, string> = {
  landing: 'Home',
  'parent-auth': 'Log in',
  setup: 'Add child',
  child: 'Play',
  chat: 'Chat',
  missions: 'Missions',
  parent: 'Parent portal',
  'edit-character': 'Character',
  'child-login': 'Enter code',
};

const NAV_ITEMS: { path: string; label: string; mode: PageMode; Icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { path: '/home', label: 'Home', mode: 'child', Icon: Home },
  { path: '/chat', label: 'Chat', mode: 'chat', Icon: MessageCircle },
  { path: '/missions', label: 'Missions', mode: 'missions', Icon: Star },
  { path: '/parent', label: 'Grown-ups', mode: 'parent', Icon: ShieldCheck },
  { path: '/character', label: 'Character', mode: 'edit-character', Icon: User },
];

function AppNav({ routeMode }: { routeMode: PageMode }) {
  const crumbs: { path: string; label: string }[] = [{ path: '/home', label: 'Home' }];
  if (routeMode !== 'child' && routeMode !== 'landing' && routeMode !== 'parent-auth') {
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

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const is404 = pathname in PATH_TO_MODE === false;
  const routeMode = (PATH_TO_MODE[pathname] ?? 'landing') as PageMode;
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

  const [session, setSession] = useState<import("@supabase/supabase-js").Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [parentAuthEmail, setParentAuthEmail] = useState('');
  const [parentAuthPassword, setParentAuthPassword] = useState('');
  const [parentAuthError, setParentAuthError] = useState('');
  const [parentAuthSignUp, setParentAuthSignUp] = useState(false);
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const { speak, stop, isSpeaking, speechError, clearSpeechError } = useSpeech();

  // Voice and transcription state
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [childTranscript, setChildTranscript] = useState('');
  const [aiTranscript, setAiTranscript] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);

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
    if (session?.access_token) h['Authorization'] = `Bearer ${session.access_token}`;
    if (childId != null) h['X-Child-Id'] = String(childId);
    return h;
  };

  useEffect(() => {
    getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: { subscription } } = onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (session) {
      fetchProfile();
    } else {
      setProfile(null);
    }
  }, [session, authLoading]);

  useEffect(() => {
    if (mode === 'chat') {
      fetchMessages();
      fetchBadges();
    } else if (mode === 'missions') {
      fetchMissions();
    } else if (mode === 'parent') {
      fetchParentData();
    }
  }, [mode]);

  useEffect(() => {
    if (mode === 'edit-character' && profile) {
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

  // Post-call: analyze conversation for summary and suggestions (guide the student)
  useEffect(() => {
    if (overlayMode !== 'post-call-reward' || callAnalysis || callAnalysisLoading || messages.length === 0) return;
    setCallAnalysisError(null);
    setCallAnalysisLoading(true);
    fetch('/api/call/analyze', {
      method: 'POST',
      headers: apiHeaders(selectedChildId ?? profile?.id),
      body: JSON.stringify({ messages: messages.map(({ role, content }) => ({ role, content })) }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setCallAnalysis({ summary: data.summary || '', issues: data.issues || [], suggestions: data.suggestions || [] }))
      .catch(() => setCallAnalysisError(ERROR_MESSAGES.call.analyzeFailed))
      .finally(() => setCallAnalysisLoading(false));
  }, [overlayMode, messages, callAnalysis, callAnalysisLoading]);

  // Clear call analysis when starting a new call
  useEffect(() => {
    if (overlayMode === 'incoming-call') setCallAnalysis(null);
  }, [overlayMode]);

  // Connecting-call: auto-transition to on-call after 1–3s (must be top-level to respect Rules of Hooks)
  useEffect(() => {
    if (overlayMode !== 'connecting-call') return;
    const delay = 1000 + Math.random() * 2000;
    const timer = setTimeout(() => {
      setOverlayMode('on-call');
      if (profile?.id != null) setSelectedChildId((id) => id ?? profile!.id);
      fetchMessages();
      setIsVoiceMode(true);
      voiceRecognition.start();
      callTimer.start();
    }, delay);
    return () => clearTimeout(timer);
  }, [overlayMode, profile?.id]);

  const fetchProfile = async () => {
    if (session) setProfileLoading(true);
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
    // Only redirect when on landing so deep links (e.g. /chat) are preserved on refresh
    const atLanding = pathname === '/';
    if (!atLanding) return;
    if (data && data.child_name) {
      goTo('child');
    } else if (session && !data) {
      goTo('setup');
    } else {
      goTo('landing');
    }
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
      const [reportRes, requestsRes, childrenRes] = await Promise.all([
        fetch('/api/parent/report', { headers }),
        fetch('/api/parent/requests', { headers }),
        fetch('/api/parent/children', { headers })
      ]);

      if (reportRes.status === 401 || requestsRes.status === 401 || childrenRes.status === 401) {
        setConfigError(ERROR_MESSAGES.auth.pleaseLogInAsParent);
        return;
      }

      const [reportData, requestsData, childrenData] = await Promise.all([
        reportRes.ok ? reportRes.json() : Promise.resolve(null),
        requestsRes.ok ? requestsRes.json() : Promise.resolve([]),
        childrenRes.ok ? childrenRes.json() : Promise.resolve([])
      ]);

      setReport(reportData);
      setRequests(requestsData);
      setChildren(childrenData);
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
    setIsCreating(true);
    setShowChildCodeReveal(false);
    setChildCodeReveal('');
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({
          ...setupData,
          child_age: parseInt(setupData.child_age)
        }),
      });
      const data = await res.json();
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
        setMessages(prev => [...prev, {
          id: Date.now(),
          role: 'model',
          content: data.error || ERROR_MESSAGES.generic.tryAgain,
          timestamp: new Date().toISOString()
        }]);
        return;
      }

      setMessages(prev => [...prev, { id: Date.now(), role: 'model', content: data.response, timestamp: new Date().toISOString() }]);
      setAiTranscript(data.response);

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
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'model',
        content: "Oops! I'm having a little trouble. Can you check the internet?",
        timestamp: new Date().toISOString()
      }]);
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

  if (authLoading || (session && profileLoading)) {
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

  if (mode === 'landing') {
    return (
      <div className="min-h-screen bg-emerald-50 flex flex-col items-center justify-center p-6 font-sans">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-8 max-w-md"
        >
          <div className="bg-white p-8 rounded-[40px] shadow-2xl border-b-8 border-emerald-200 relative overflow-hidden">
            <motion.div 
              animate={{ rotate: [0, 5, -5, 0] }} 
              transition={{ repeat: Infinity, duration: 4 }}
              className="flex justify-center mb-4"
            >
              {profile?.image_data ? (
                <img 
                  src={profile.image_data} 
                  alt="Character" 
                  className="w-32 h-32 rounded-full border-4 border-emerald-100 shadow-lg object-cover"
                />
              ) : (
                <div className="bg-emerald-100 p-8 rounded-full shadow-inner">
                  <Turtle size={100} className="text-emerald-600" />
                </div>
              )}
            </motion.div>
            <h1 className="text-5xl font-black text-emerald-900 mb-2 tracking-tight">
              {profile ? `Hi, ${profile.child_name}!` : "Shelly & Friends"}
            </h1>
            <p className="text-emerald-600 text-xl font-medium">
              {profile ? "One tiny brave move — in under two minutes." : "A warm pocket friend for small acts of courage."}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 w-full">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (profile) goTo('child');
                else if (session) goTo('setup');
                else goTo('parent-auth');
              }}
              className="touch-target-lg bg-emerald-500 hover:bg-emerald-600 text-white font-black py-6 px-8 rounded-3xl shadow-[0_8px_0_rgb(5,150,105)] transition-all flex items-center justify-center gap-4 text-2xl min-h-[56px]"
            >
              <MessageCircle size={32} strokeWidth={3} />
              {profile ? "Let's play!" : "Get started"}
            </motion.button>
            <button 
              onClick={() => session ? goTo('parent') : goTo('parent-auth')}
              className="touch-target bg-white hover:bg-emerald-50 text-emerald-700 font-bold py-4 px-8 rounded-2xl border-2 border-emerald-200 shadow-sm transition-all flex items-center justify-center gap-3 min-h-[48px]"
            >
              <ShieldCheck size={22} />
              Grown-ups only
            </button>
          </div>
          <p className="text-center mt-6 space-x-4">
            <button
              type="button"
              onClick={() => goTo('parent-auth')}
              className="text-sm text-emerald-600 hover:underline"
            >
              Log in or sign up as parent
            </button>
            {session && (
              <button
                type="button"
                onClick={() => goTo('child-login')}
                className="text-sm text-emerald-600 hover:underline"
              >
                I have a code
              </button>
            )}
          </p>
        </motion.div>
      </div>
    );
  }

  if (mode === 'parent-auth') {
    const handleParentAuth = async (e: React.FormEvent) => {
      e.preventDefault();
      setParentAuthError('');
      if (!supabase) {
        setParentAuthError(ERROR_MESSAGES.auth.authNotConfigured);
        return;
      }
      try {
        if (parentAuthSignUp) {
          const { error } = await supabase.auth.signUp({ email: parentAuthEmail, password: parentAuthPassword });
          if (error) throw error;
          setParentAuthError(ERROR_MESSAGES.auth.checkEmail);
        } else {
          const { error } = await supabase.auth.signInWithPassword({ email: parentAuthEmail, password: parentAuthPassword });
          if (error) throw error;
          await fetch('/api/auth/profile', { method: 'POST', headers: apiHeaders() });
          const profileRes = await fetch('/api/profile', { headers: apiHeaders() });
          const profileData = profileRes.ok ? await profileRes.json() : null;
          if (profileData?.child_name) goTo('child');
          else if (profileData === null) goTo('setup');
          else goTo('parent');
        }
      } catch (err: any) {
        setParentAuthError(err.message ?? ERROR_MESSAGES.auth.signInFailed);
      }
    };
    return (
      <div className="min-h-screen bg-emerald-50 flex flex-col items-center justify-center p-6 font-sans">
        <div className="bg-white p-8 rounded-[40px] shadow-2xl border-b-8 border-emerald-200 w-full max-w-sm space-y-6">
          <h2 className="text-2xl font-black text-emerald-900 text-center">Parent sign in</h2>
          <form onSubmit={handleParentAuth} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={parentAuthEmail}
              onChange={(e) => setParentAuthEmail(e.target.value)}
              className="w-full bg-emerald-50 border-2 border-emerald-100 rounded-xl px-4 py-3 text-emerald-900"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={parentAuthPassword}
              onChange={(e) => setParentAuthPassword(e.target.value)}
              className="w-full bg-emerald-50 border-2 border-emerald-100 rounded-xl px-4 py-3 text-emerald-900"
              required
            />
            {parentAuthError && <p className="text-sm text-rose-600">{parentAuthError}</p>}
            <button type="submit" className="w-full bg-emerald-500 text-white font-bold py-3 rounded-xl">
              {parentAuthSignUp ? 'Sign up' : 'Sign in'}
            </button>
          </form>
          <button type="button" onClick={() => setParentAuthSignUp(!parentAuthSignUp)} className="w-full text-sm text-emerald-600 hover:underline">
            {parentAuthSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
          </button>
          <button type="button" onClick={() => goTo('landing')} className="w-full text-sm text-slate-500 hover:underline">
            Back
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'setup') {
    if (showChildCodeReveal && childCodeReveal) {
      return (
        <div className="min-h-screen bg-emerald-50 flex flex-col items-center justify-center p-6 font-sans">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white p-10 rounded-[40px] shadow-2xl border-b-8 border-emerald-200 w-full max-w-md space-y-6 text-center"
          >
            <h2 className="text-2xl font-black text-emerald-900">Your child&apos;s code</h2>
            <p className="text-emerald-700">They can use this to open Brave Call and play.</p>
            <div className="bg-emerald-100 py-6 px-8 rounded-3xl border-4 border-emerald-200">
              <p className="text-4xl font-black text-emerald-900 tracking-[0.5em]">{childCodeReveal}</p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(childCodeReveal);
                }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-4 rounded-2xl"
              >
                Copy
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowChildCodeReveal(false);
                  setChildCodeReveal('');
                  goTo('child');
                }}
                className="flex-[2] bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-[0_4px_0_rgb(5,150,105)]"
              >
                Go to Play
              </button>
            </div>
            <p className="text-sm text-slate-500">You can change or turn off this code anytime in Parent Portal.</p>
          </motion.div>
        </div>
      );
    }
    return (
      <div className="min-h-screen pb-24 md:pb-0 bg-emerald-50 flex flex-col items-center justify-center p-6 font-sans">
        <div className="absolute top-0 left-0 right-0 z-10">
          <AppNav routeMode="setup" />
        </div>
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white p-10 rounded-[40px] shadow-2xl border-b-8 border-emerald-200 w-full max-w-lg space-y-8 relative overflow-hidden"
        >
          {isCreating && (
            <div className="absolute inset-0 bg-white/90 z-50 flex flex-col items-center justify-center p-8 text-center">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className="mb-6">
                <Sparkles size={80} className="text-amber-400" />
              </motion.div>
              <h3 className="text-3xl font-black text-emerald-900 uppercase mb-2">{LOADING_MESSAGES.setup}</h3>
            </div>
          )}

          <div className="text-center">
            <p className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-2">Step {setupStep} of 3</p>
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3].map(s => (
                <div key={s} className={cn("w-3 h-3 rounded-full", setupStep >= s ? "bg-emerald-500" : "bg-emerald-100")} />
              ))}
            </div>
            <h2 className="text-3xl font-black text-emerald-900 uppercase">
              {setupStep === 1 ? "Parent Info" : setupStep === 2 ? "Add your Explorer" : "Choose Friend"}
            </h2>
          </div>

          <div className="space-y-6">
            {setupStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-black text-emerald-800 uppercase tracking-widest">Parent Email or Phone</label>
                  <input 
                    type="text"
                    value={setupData.parent_contact}
                    onChange={(e) => setSetupData({ ...setupData, parent_contact: e.target.value })}
                    placeholder="email@example.com"
                    className="w-full bg-emerald-50 border-4 border-emerald-100 rounded-2xl px-6 py-4 text-xl font-bold text-emerald-900 outline-none focus:border-emerald-300 transition-all"
                  />
                </div>
                <button 
                  onClick={() => setupData.parent_contact && setSetupStep(2)}
                  className="w-full bg-emerald-500 text-white font-black py-6 rounded-3xl shadow-[0_6px_0_rgb(5,150,105)] text-xl"
                >
                  NEXT
                </button>
              </div>
            )}

            {setupStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-black text-emerald-800 uppercase tracking-widest">Child's Name</label>
                  <input 
                    type="text"
                    value={setupData.child_name}
                    onChange={(e) => setSetupData({ ...setupData, child_name: e.target.value })}
                    placeholder="Your Name"
                    className="w-full bg-emerald-50 border-4 border-emerald-100 rounded-2xl px-6 py-4 text-xl font-bold text-emerald-900 outline-none focus:border-emerald-300 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-emerald-800 uppercase tracking-widest">Child's Age</label>
                  <input 
                    type="number"
                    value={setupData.child_age}
                    onChange={(e) => setSetupData({ ...setupData, child_age: e.target.value })}
                    placeholder="Age"
                    className="w-full bg-emerald-50 border-4 border-emerald-100 rounded-2xl px-6 py-4 text-xl font-bold text-emerald-900 outline-none focus:border-emerald-300 transition-all"
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setSetupStep(1)} className="flex-1 bg-emerald-100 text-emerald-700 font-black py-6 rounded-3xl">BACK</button>
                  <button 
                    onClick={() => setupData.child_name && setupData.child_age && setSetupStep(3)}
                    className="flex-[2] bg-emerald-500 text-white font-black py-6 rounded-3xl shadow-[0_6px_0_rgb(5,150,105)]"
                  >
                    NEXT
                  </button>
                </div>
              </div>
            )}

            {setupStep === 3 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-emerald-800 uppercase tracking-widest">Friend's Name</label>
                  <input
                    type="text"
                    value={setupData.character_name}
                    onChange={(e) => setSetupData({ ...setupData, character_name: e.target.value })}
                    className="w-full bg-emerald-50 border-4 border-emerald-100 rounded-2xl px-6 py-4 text-xl font-bold text-emerald-900 outline-none focus:border-emerald-300 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-emerald-800 uppercase tracking-widest">Choose Type</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['Turtle', 'Dolphin', 'Crab', 'Bunny', 'Fox', 'Owl'].map(type => (
                      <button
                        key={type}
                        onClick={() => setSetupData({ ...setupData, character_type: type })}
                        className={cn("py-4 rounded-2xl font-bold border-4 transition-all", setupData.character_type === type ? "bg-emerald-500 text-white border-emerald-600 scale-105" : "bg-emerald-50 text-emerald-600 border-emerald-100 hover:border-emerald-200")}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-emerald-800 uppercase tracking-widest">Pick Color</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { name: 'Emerald', color: 'bg-emerald-500' },
                      { name: 'Ocean', color: 'bg-blue-500' },
                      { name: 'Sunset', color: 'bg-orange-500' },
                      { name: 'Rose', color: 'bg-rose-500' },
                      { name: 'Purple', color: 'bg-purple-500' },
                      { name: 'Mint', color: 'bg-teal-400' },
                    ].map(({ name, color }) => (
                      <button
                        key={name}
                        onClick={() => setSetupData({ ...setupData, color: name })}
                        className={cn("py-4 rounded-2xl font-bold border-4 transition-all", setupData.color === name ? `${color} text-white border-white scale-105 shadow-lg` : "bg-white border-slate-200 hover:border-slate-300")}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <div className={cn("w-6 h-6 rounded-full", color)} />
                          <span className="text-xs">{name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setSetupStep(2)} className="flex-1 bg-emerald-100 text-emerald-700 font-black py-6 rounded-3xl">BACK</button>
                  <button 
                    onClick={handleSetup}
                    className="flex-[2] bg-emerald-500 text-white font-black py-6 rounded-3xl shadow-[0_6px_0_rgb(5,150,105)]"
                  >
                    FINISH!
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  if (mode === 'child') {
    return (
      <div className="min-h-screen pb-24 md:pb-0 bg-gradient-to-b from-sky-300 via-emerald-200 to-emerald-300 flex flex-col font-sans lg:max-w-full xl:max-w-7xl mx-auto lg:shadow-2xl relative overflow-hidden">
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
            <div className="flex items-center gap-2">
              <button
                onClick={() => goTo('parent')}
                className="touch-target bg-white/80 backdrop-blur-sm p-3 px-5 md:p-4 md:px-6 rounded-2xl shadow-lg hover:bg-white transition-colors flex items-center gap-2"
                aria-label="Grown-ups only"
              >
                <ShieldCheck className="text-emerald-600" size={22} />
                <span className="text-xs md:text-sm lg:text-base font-bold text-emerald-700">Grown-ups</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setProfile(null);
                  setSelectedChildId(null);
                  goTo('child-login');
                }}
                className="touch-target bg-white/80 backdrop-blur-sm p-3 px-4 md:p-4 md:px-5 rounded-2xl shadow-lg hover:bg-white transition-colors flex items-center gap-2"
                aria-label="Log out"
              >
                <LogOut className="text-slate-600" size={20} />
                <span className="text-xs md:text-sm font-bold text-slate-600">Log out</span>
              </button>
            </div>

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
              onClick={() => goTo('incoming-call')}
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
                  <h3 className="text-xl md:text-3xl lg:text-4xl font-black">Call {profile?.character_name}</h3>
                  <p className="text-emerald-100 font-bold text-sm md:text-base lg:text-lg">Talk about anything!</p>
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
                  <h3 className="text-xl md:text-3xl lg:text-4xl font-black">Brave Missions</h3>
                  <p className="text-amber-700 font-bold text-sm md:text-base lg:text-lg">Earn rewards!</p>
                </div>
              </div>
              <div className="text-3xl md:text-4xl lg:text-5xl group-hover:scale-110 transition-transform">🏆</div>
            </motion.button>

            <button
              onClick={() => goTo('edit-character')}
              className="w-full py-2 md:py-3 lg:py-4 text-emerald-700 text-sm md:text-base lg:text-lg font-bold flex items-center justify-center gap-2 hover:bg-white/50 rounded-2xl transition-colors bg-white/30 backdrop-blur-sm"
            >
              <Settings size={16} className="md:w-5 md:h-5" />
              Customize Character
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (mode === 'chat') {
    return (
      <div className="min-h-screen pb-24 md:pb-0 bg-emerald-50 flex flex-col font-sans max-w-2xl mx-auto shadow-2xl relative">
        <AppNav routeMode="chat" />
        <header className="bg-white p-4 flex items-center justify-between border-b-4 border-emerald-100 sticky top-0 z-20">
          <button onClick={() => goTo('child')} className="p-3 hover:bg-emerald-50 rounded-2xl transition-colors">
            <ArrowLeft className="text-emerald-600" size={28} strokeWidth={3} />
          </button>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 mb-1">
              {profile?.image_data ? (
                <img src={profile.image_data} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-emerald-100 object-cover" />
              ) : (
                <span className="text-2xl">🐢</span>
              )}
              <span className="font-black text-emerald-900 text-xl uppercase tracking-wider">{profile?.character_name}</span>
            </div>
          </div>
          <div className="bg-amber-100 px-3 py-1 rounded-xl border-2 border-amber-200 text-amber-700 font-bold flex items-center gap-1">
            <Star size={14} fill="currentColor" />
            {profile?.points}
          </div>
        </header>

        {configError && (
          <div className="bg-amber-50 border-b border-amber-200 p-4 flex items-center gap-3 text-amber-800 z-30">
            <AlertTriangle size={20} className="shrink-0" />
            <p className="text-sm font-medium">{configError}</p>
            <button onClick={() => setConfigError(null)} className="ml-auto text-amber-900 font-bold">Close</button>
          </div>
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={cn("flex w-full", msg.role === 'user' ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[85%] p-5 rounded-[32px] shadow-lg text-lg font-medium", msg.role === 'user' ? "bg-emerald-500 text-white rounded-tr-none shadow-[0_4px_0_rgb(5,150,105)]" : "bg-white text-emerald-900 rounded-tl-none border-2 border-emerald-100 shadow-[0_4px_0_rgb(236,253,245)]")}>
                  <div className="markdown-body prose prose-emerald max-w-none"><Markdown>{msg.content}</Markdown></div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white p-5 rounded-[32px] rounded-tl-none shadow-lg border-2 border-emerald-100 flex gap-2 items-center">
                {[0, 0.2, 0.4].map(d => <motion.div key={d} animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: d }} className="w-3 h-3 bg-emerald-400 rounded-full" />)}
              </div>
            </div>
          )}
        </div>

        <AnimatePresence>
          {showBadgePopup && (
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="absolute bottom-24 left-4 right-4 bg-amber-400 text-amber-950 p-6 rounded-[32px] shadow-2xl z-50 border-4 border-white flex items-center gap-6">
              <div className="text-6xl bg-white p-4 rounded-3xl shadow-inner">{showBadgePopup.icon}</div>
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tight">{KID_COPY.badgeTitle}</h3>
                <p className="text-lg font-bold">{showBadgePopup.name}</p>
                <p className="text-emerald-700 font-bold text-sm mt-1">{KID_COPY.badgeSubtitle}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-4 bg-white border-t-4 border-emerald-100">
          <div className="flex gap-3 bg-emerald-50 p-3 rounded-[32px] border-4 border-emerald-100 focus-within:border-emerald-300 transition-all shadow-inner">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSend()} placeholder="Type here..." className="flex-1 bg-transparent px-4 py-2 outline-none text-emerald-900 placeholder:text-emerald-300 text-xl font-bold" />
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleSend} disabled={isLoading} className="touch-target bg-emerald-500 hover:bg-emerald-600 text-white p-4 rounded-2xl shadow-[0_4px_0_rgb(5,150,105)] disabled:opacity-50 min-h-[44px] min-w-[44px]"><Send size={28} strokeWidth={3} /></motion.button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'missions') {
    return (
      <div className="min-h-screen pb-24 md:pb-0 bg-emerald-50 flex flex-col font-sans max-w-2xl mx-auto shadow-2xl">
        <AppNav routeMode="missions" />
        <header className="bg-white p-6 border-b-4 border-emerald-100 flex items-center gap-4">
          <button onClick={() => goTo('child')} className="p-2 hover:bg-emerald-50 rounded-xl">
            <ArrowLeft className="text-emerald-600" size={24} />
          </button>
          <h1 className="text-3xl font-black text-emerald-900 uppercase">Missions</h1>
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
          {!missionsLoading && missions.map(m => (
            <div key={m.id} className="bg-white p-6 rounded-[32px] border-4 border-emerald-100 shadow-sm flex items-center justify-between gap-4">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
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
                </div>
                <p className="text-slate-500 font-medium">{m.description}</p>
              </div>
              <div className="bg-amber-100 px-4 py-2 rounded-2xl border-2 border-amber-200 text-amber-700 font-black flex items-center gap-2 shrink-0">
                <Star size={16} fill="currentColor" />
                {m.points}
              </div>
            </div>
          ))}
          {!missionsLoading && (
            <div className="bg-emerald-100 p-8 rounded-[40px] border-4 border-dashed border-emerald-300 text-center space-y-2">
              <p className="text-emerald-700 font-black text-xl uppercase">More Coming Soon!</p>
              <p className="text-emerald-600 font-medium">Keep talking to earn more stars!</p>
            </div>
          )}
        </main>
      </div>
    );
  }

  if (mode === 'child-login') {
    const handleChildLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setChildLoginError('');
      if (!childLoginCode.trim()) {
        setChildLoginError('Enter your code');
        return;
      }
      if (!session) {
        setChildLoginError(ERROR_MESSAGES.auth.pleaseLogIn);
        return;
      }
      setChildLoginLoading(true);
      try {
        const res = await fetch('/api/child/verify', {
          method: 'POST',
          headers: apiHeaders(),
          body: JSON.stringify({ code: childLoginCode.trim() }),
        });
        const data = await res.json();
        if (!res.ok) {
          setChildLoginError(data?.error || ERROR_MESSAGES.generic.tryAgain);
          return;
        }
        const cid = data.child_id;
        setSelectedChildId(cid);
        const profileRes = await fetch('/api/profile', { headers: apiHeaders(cid) });
        const profileData = profileRes.ok ? await profileRes.json() : null;
        if (profileData) {
          setProfile(profileData);
          goTo('child');
        } else {
          setChildLoginError(ERROR_MESSAGES.generic.loadFailed);
        }
      } catch {
        setChildLoginError(ERROR_MESSAGES.network.generic);
      } finally {
        setChildLoginLoading(false);
      }
    };
    return (
      <div className="min-h-screen bg-emerald-50 flex flex-col items-center justify-center p-6 font-sans">
        <div className="bg-white p-10 rounded-[40px] shadow-2xl border-b-8 border-emerald-200 w-full max-w-sm space-y-6">
          <div className="flex justify-center">
            <div className="bg-emerald-100 p-6 rounded-full">
              <Turtle size={64} className="text-emerald-600" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-emerald-900 text-center">Enter your code</h2>
          <p className="text-emerald-700 text-center text-sm">Use the code your parent gave you to play.</p>
          <form onSubmit={handleChildLogin} className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              placeholder="Code"
              value={childLoginCode}
              onChange={(e) => setChildLoginCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full bg-emerald-50 border-2 border-emerald-100 rounded-xl px-4 py-4 text-emerald-900 text-center text-2xl font-black tracking-[0.3em]"
              maxLength={6}
              autoFocus
            />
            {childLoginError && <p className="text-sm text-rose-600 text-center">{childLoginError}</p>}
            <button type="submit" disabled={childLoginLoading} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-xl disabled:opacity-50">
              {childLoginLoading ? LOADING_MESSAGES.auth : 'Play'}
            </button>
          </form>
          <button type="button" onClick={() => goTo('landing')} className="w-full text-sm text-slate-500 hover:underline">
            Back
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'parent') {
    return (
      <div className="min-h-screen pb-24 md:pb-0 bg-slate-50 flex flex-col font-sans">
        <AppNav routeMode="parent" />
        <header className="bg-white p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button onClick={() => goTo('child')} className="p-2 hover:bg-slate-100 rounded-full transition-colors" aria-label="Back to play">
              <ArrowLeft className="text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Parent Portal</h1>
              {selectedChildId && children.find(c => c.id === selectedChildId) && (
                <p className="text-sm text-slate-500">Viewing: {children.find(c => c.id === selectedChildId)?.child_name}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium">
              <ShieldCheck size={16} />
              Weekly summary
            </div>
            <button type="button" onClick={() => goTo('setup')} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold">Add Child</button>
            <button
              type="button"
              onClick={async () => {
                await supabase?.auth.signOut();
                setSession(null);
                setProfile(null);
                setSelectedChildId(null);
                goTo('landing');
              }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold border border-slate-200"
            >
              Log out
            </button>
          </div>
        </header>

        {configError && (
          <div className="bg-amber-50 border-b border-amber-200 p-4 flex items-center gap-3 text-amber-800">
            <AlertTriangle size={20} className="shrink-0" />
            <p className="text-sm font-medium">{configError}</p>
            <button onClick={() => setConfigError(null)} className="ml-auto text-amber-900 font-bold">Close</button>
          </div>
        )}

        {parentDataLoading && (
          <div className="flex items-center justify-center gap-3 py-8 text-slate-600">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}>
              <Turtle size={32} className="text-emerald-500" />
            </motion.div>
            <p className="font-medium">{LOADING_MESSAGES.parent.summary}</p>
          </div>
        )}

        <main className="flex-1 p-6 max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar: Children List */}
          <aside className="lg:col-span-3 space-y-4">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest px-2">Your Children</h2>
            {children.map(child => (
              <div key={child.id} className="space-y-2">
                <button 
                  onClick={() => setSelectedChildId(child.id)}
                  className={cn(
                    "w-full p-4 rounded-2xl flex items-center gap-3 transition-all border-2 text-left",
                    selectedChildId === child.id 
                      ? "bg-white border-emerald-500 shadow-md" 
                      : "bg-slate-100 border-transparent hover:bg-slate-200"
                  )}
                >
                  {child.image_data ? (
                    <img src={child.image_data} className="w-10 h-10 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">🐢</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900">{child.child_name}</p>
                    <p className="text-xs text-slate-500">{child.points} brave moments • {child.child_age} yrs</p>
                  </div>
                </button>
                <div className="flex flex-wrap items-center gap-2 pl-1">
                  <span className="text-xs font-medium text-slate-500">Access:</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fetch('/api/profile', {
                        method: 'PUT',
                        headers: apiHeaders(child.id),
                        body: JSON.stringify({ access_allowed: !(child.access_allowed !== false) }),
                      }).then(() => fetchParentData());
                    }}
                    className={cn(
                      "text-xs font-bold px-2 py-1 rounded-lg",
                      child.access_allowed !== false ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                    )}
                  >
                    {child.access_allowed !== false ? 'Allowed' : 'Denied'}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRegenerateCodeResult(null);
                      fetch('/api/child/regenerate-code', {
                        method: 'POST',
                        headers: apiHeaders(child.id),
                      })
                        .then((r) => r.json())
                        .then((data) => data?.access_code && setRegenerateCodeResult(data.access_code))
                        .then(() => fetchParentData());
                    }}
                    className="text-xs font-bold text-slate-600 hover:text-slate-900 underline"
                  >
                    Change code
                  </button>
                </div>
                {regenerateCodeResult !== null && selectedChildId === child.id && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                    <p className="text-xs font-bold text-amber-800">New code: <span className="tracking-widest">{regenerateCodeResult}</span></p>
                    <button type="button" onClick={() => navigator.clipboard?.writeText(regenerateCodeResult)} className="text-xs text-amber-700 underline mt-1">Copy</button>
                    <button type="button" onClick={() => setRegenerateCodeResult(null)} className="ml-2 text-xs text-slate-600">Close</button>
                  </div>
                )}
              </div>
            ))}
          </aside>

          {/* Main Content Area */}
          <div className="lg:col-span-9 space-y-6">
            {/* Top Row: Signals & Requests */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Requests Section */}
              <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <MessageCircle size={20} className="text-blue-500" />
                  Pending Requests
                </h2>
                <div className="space-y-3">
                  {requests.length === 0 && <p className="text-slate-400 italic text-sm">No pending requests.</p>}
                  {requests.map(req => (
                    <div key={req.id} className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between">
                      <div>
                        <p className="text-xs font-black text-blue-600 uppercase">{req.request_type}</p>
                        <p className="text-slate-800 font-medium">{req.request_text}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleRequestAction(req.id, 'rejected')} className="p-2 bg-rose-100 text-rose-600 rounded-lg hover:bg-rose-200 transition-colors">Reject</button>
                        <button onClick={() => handleRequestAction(req.id, 'approved')} className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors">Approve</button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Signals Section */}
              <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Activity size={20} className="text-emerald-500" />
                  Interaction Signals
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-emerald-50 p-4 rounded-2xl">
                    <p className="text-[10px] font-black text-emerald-600 uppercase">Safety</p>
                    <p className="text-lg font-bold text-emerald-900">{report?.safety_status || 'Stable'}</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-2xl">
                    <p className="text-[10px] font-black text-blue-600 uppercase">Engagement</p>
                    <p className="text-lg font-bold text-blue-900">High</p>
                  </div>
                </div>
              </section>
            </div>

            {/* This week: courage + dinner question */}
            {(report?.courage_counts || report?.suggested_dinner_question) && (
              <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
                <h2 className="text-lg font-bold text-slate-900">This week your Explorer practiced</h2>
                {report?.courage_counts && (
                  <ul className="space-y-1 text-slate-700">
                    {report.courage_counts.social > 0 && <li>• Social courage ({report.courage_counts.social})</li>}
                    {report.courage_counts.performance > 0 && <li>• Performance bravery ({report.courage_counts.performance})</li>}
                    {report.courage_counts.repair > 0 && <li>• Repair courage ({report.courage_counts.repair})</li>}
                    {report.courage_counts.social === 0 && report.courage_counts.performance === 0 && report.courage_counts.repair === 0 && (
                      <li className="text-slate-400 italic">No brave moments yet this week.</li>
                    )}
                  </ul>
                )}
                {report?.suggested_dinner_question && (
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Suggested dinner question</p>
                    <p className="text-emerald-700 font-medium mt-1">"{report.suggested_dinner_question}"</p>
                  </div>
                )}
              </section>
            )}

            {/* Growth Moments & Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles size={20} className="text-amber-500" />
                  Growth Moments
                </h2>
                <div className="space-y-4">
                  {report?.growth_moments?.map((m, i) => (
                    <div key={i} className="border-l-4 border-amber-400 pl-4 py-1">
                      <p className="font-bold text-slate-900">{m.moment}</p>
                      <p className="text-sm text-slate-500">{m.description}</p>
                    </div>
                  )) || <p className="text-slate-400 italic">Analyzing growth...</p>}
                </div>
              </section>

              <section className="bg-emerald-900 text-white p-6 rounded-3xl shadow-xl space-y-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <User size={20} className="text-emerald-400" />
                  AI Summary
                </h2>
                <p className="text-emerald-50 text-sm leading-relaxed">{report?.summary || 'Generating summary...'}</p>
              </section>
            </div>

            {/* Book Recommendations */}
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Lightbulb size={20} className="text-emerald-500" />
                Personalized Reading List
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {report?.book_recommendations.map((book, i) => (
                  <div key={i} className="bg-slate-50 p-4 rounded-2xl space-y-2 border border-slate-100">
                    <div className="bg-white w-full aspect-[3/4] rounded-lg shadow-sm flex items-center justify-center text-slate-300">
                      <Lightbulb size={40} />
                    </div>
                    <p className="font-bold text-slate-900 leading-tight">{book.title}</p>
                    <p className="text-xs text-slate-500">by {book.author}</p>
                    <p className="text-[10px] text-slate-400 italic">{book.reason}</p>
                  </div>
                )) || <p className="text-slate-400 italic">Finding books...</p>}
              </div>
            </section>
          </div>
        </main>
      </div>
    );
  }

  // Incoming Call Screen
  if (mode === 'incoming-call') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-500 to-emerald-600 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
        {/* Animated background rings */}
        <motion.div
          animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute w-96 h-96 rounded-full bg-white"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0, 0.2] }}
          transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
          className="absolute w-80 h-80 rounded-full bg-white"
        />

        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center space-y-8 z-10"
        >
          {/* Character Avatar */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="relative"
          >
            {profile?.image_data ? (
              <img
                src={profile.image_data}
                alt="Character"
                className="w-48 h-48 rounded-full border-8 border-white shadow-2xl object-cover mx-auto"
              />
            ) : (
              <div className="w-48 h-48 bg-white rounded-full border-8 border-white shadow-2xl flex items-center justify-center text-8xl mx-auto">
                🐢
              </div>
            )}
            {/* Ringing indicator */}
            <motion.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ repeat: Infinity, duration: 0.5 }}
              className="absolute -top-4 -right-4 bg-white p-4 rounded-full shadow-xl"
            >
              <PhoneIncoming size={32} className="text-emerald-500" />
            </motion.div>
          </motion.div>

          {/* Call info */}
          <div>
            <h1 className="text-5xl font-black text-white mb-2">
              {profile?.character_name} is calling...
            </h1>
            <p className="text-2xl text-emerald-100 font-bold">
              Ready for a brave conversation?
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-6 justify-center pt-8">
            {/* Decline */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => goTo('child')}
              className="bg-red-500 hover:bg-red-600 p-8 rounded-full shadow-2xl"
            >
              <PhoneOff size={40} className="text-white" strokeWidth={3} />
            </motion.button>

            {/* Answer */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              onClick={() => {
                goTo('connecting-call');
              }}
              className="bg-green-500 hover:bg-green-600 p-8 rounded-full shadow-2xl"
            >
              <Phone size={40} className="text-white" strokeWidth={3} />
            </motion.button>
          </div>

          <p className="text-white/70 text-sm mt-4">
            Tap the green button to answer
          </p>
        </motion.div>
      </div>
    );
  }

  // Connecting Call Screen
  if (mode === 'connecting-call') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-400 to-emerald-500 flex flex-col items-center justify-center p-6 font-sans">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-8"
        >
          {/* Connecting animation */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
            className="relative"
          >
            {profile?.image_data ? (
              <img
                src={profile.image_data}
                alt="Character"
                className="w-40 h-40 rounded-full border-8 border-white shadow-2xl object-cover mx-auto"
              />
            ) : (
              <div className="w-40 h-40 bg-white rounded-full border-8 border-white shadow-2xl flex items-center justify-center text-7xl mx-auto">
                🐢
              </div>
            )}
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="absolute inset-0 rounded-full border-4 border-white/50"
            />
          </motion.div>

          <div>
            <h1 className="text-4xl font-black text-white mb-2">
              Starting a call with {profile?.character_name}...
            </h1>
            <motion.div
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="flex items-center justify-center gap-2 text-emerald-100 text-xl font-bold"
            >
              <div className="w-2 h-2 bg-white rounded-full" />
              <div className="w-2 h-2 bg-white rounded-full" style={{ animationDelay: '0.2s' }} />
              <div className="w-2 h-2 bg-white rounded-full" style={{ animationDelay: '0.4s' }} />
            </motion.div>
          </div>
        </motion.div>
      </div>
    );
  }

  // On Call Screen
  if (mode === 'on-call') {
    const handleSendOnCall = async () => {
      if (!input.trim() || isLoading) return;

      const childId = selectedChildId ?? profile?.id;
      if (childId == null) {
        const pickCharacterMsg = "Please pick a character first so we know who's on the call!";
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'model' && last?.content === pickCharacterMsg) return prev;
          return [...prev, {
            id: Date.now(),
            role: 'model' as const,
            content: pickCharacterMsg,
            timestamp: new Date().toISOString()
          }];
        });
        return;
      }

      const userMsg = input;
      setInput('');
      setIsLoading(true);

      const tempId = Date.now();
      setMessages(prev => [...prev, { id: tempId, role: 'user', content: userMsg, timestamp: new Date().toISOString() }]);

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: apiHeaders(childId),
          body: JSON.stringify({ message: userMsg, child_id: childId }),
        });
        const data = await res.json();

        if (res.status === 401) {
          setConfigError(ERROR_MESSAGES.auth.pleaseLogIn);
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
      } catch (err) {
        console.error(err);
        setMessages(prev => [...prev, {
          id: Date.now(),
          role: 'model',
          content: "Oops! I'm having a little trouble. Can you check the internet?",
          timestamp: new Date().toISOString()
        }]);
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col font-sans max-w-2xl mx-auto relative">
        {/* Header - Character Video Area */}
        <div className="bg-gradient-to-b from-emerald-500 to-emerald-600 p-8 relative">
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
          <div className="flex flex-col items-center justify-center py-12">
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
                  className="w-64 h-64 rounded-full border-8 border-white shadow-2xl object-cover"
                />
              ) : (
                <div className="w-64 h-64 bg-white rounded-full border-8 border-white shadow-2xl flex items-center justify-center text-9xl">
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

            <h2 className="text-4xl font-black text-white mt-6">
              {profile?.character_name}
            </h2>
            <p className="text-emerald-100 font-bold text-lg">Your Brave Friend</p>
          </div>
        </div>

        {/* Scrolling conversation: big words, last few messages, doesn't take too much space */}
        <div ref={scrollRef} className="flex-1 min-h-0 flex flex-col bg-slate-800 px-4 py-3 overflow-y-auto">
          <div className="space-y-2 pb-2">
            {/* Last 6 messages + live transcripts: scroll away as new ones appear (dedupe "pick character" errors) */}
            {(() => {
              const pickChar = "Please pick a character first so we know who's on the call!";
              const recent = messages.slice(-6).filter((msg, i, arr) => {
                if (msg.role !== 'model' || msg.content !== pickChar) return true;
                return !arr.slice(0, i).some(m => m.role === 'model' && m.content === pickChar);
              });
              return recent;
            })().map((msg) => (
              <div
                key={msg.id}
                className={cn("flex w-full", msg.role === 'user' ? "justify-end" : "justify-start")}
              >
                <div className={cn(
                  "max-w-[90%] px-4 py-3 rounded-2xl text-xl leading-snug",
                  msg.role === 'user'
                    ? "bg-emerald-500 text-white"
                    : "bg-white text-slate-900"
                )}>
                  <div className="prose prose-lg prose-p:my-1 prose-p:leading-snug max-w-none [&_*]:text-inherit">
                    <Markdown>{msg.content}</Markdown>
                  </div>
                </div>
              </div>
            ))}

            {/* Live: what the character just said (voice mode) */}
            {aiTranscript && (
              <div className="flex justify-start">
                <div className="max-w-[90%] bg-white px-4 py-3 rounded-2xl shadow-lg">
                  <p className="text-xs font-bold text-emerald-600 uppercase mb-1">{profile?.character_name}</p>
                  <p className="text-slate-900 text-xl leading-snug">{aiTranscript}</p>
                </div>
              </div>
            )}

            {/* Live: what the child is saying (voice mode) */}
            {(childTranscript || voiceRecognition.interimTranscript) && (
              <div className="flex justify-end">
                <div className="max-w-[90%] bg-emerald-500 px-4 py-3 rounded-2xl shadow-lg">
                  <p className="text-xs font-bold text-emerald-100 uppercase mb-1">{profile?.child_name}</p>
                  <p className="text-white text-xl leading-snug">
                    {childTranscript || voiceRecognition.interimTranscript}
                    <span className="inline-block w-2 h-5 bg-white ml-1 animate-pulse align-middle" />
                  </p>
                </div>
              </div>
            )}

            {/* Loading */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/90 px-4 py-3 rounded-2xl flex gap-2 items-center">
                  {[0, 0.2, 0.4].map(d => (
                    <motion.div
                      key={d}
                      animate={{ y: [0, -6, 0] }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: d }}
                      className="w-2.5 h-2.5 bg-emerald-400 rounded-full"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Listening indicator (compact) */}
            {voiceRecognition.isListening && !childTranscript && !voiceRecognition.interimTranscript && (
              <div className="flex justify-center py-1">
                <div className="bg-emerald-500/30 px-4 py-2 rounded-full flex items-center gap-2">
                  <Mic size={18} className="text-white" />
                  <span className="text-white font-bold text-sm">Listening...</span>
                </div>
              </div>
            )}

            {/* Voice/speech error – friendly message and dismiss */}
            {(getVoiceErrorMessage(voiceRecognition.error) || (speechError && ERROR_MESSAGES.speech.soundHiccup)) && (
              <div className="flex justify-center py-2">
                <div className="bg-amber-500/90 text-white px-4 py-3 rounded-2xl flex items-center justify-between gap-3 max-w-md">
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
              </div>
            )}
          </div>
        </div>

        {/* Input Area - Minimized in Voice Mode */}
        <div className="p-4 bg-slate-900 border-t-2 border-slate-700">
          {/* Voice Mode Instructions */}
          {isVoiceMode ? (
            <div className="text-center py-6">
              <p className="text-slate-400 text-sm mb-2">Voice mode active</p>
              <p className="text-white font-bold text-lg">Tap the mic button to toggle voice</p>
              <button
                onClick={() => setShowTextInput(!showTextInput)}
                className="mt-4 text-emerald-400 underline text-sm"
              >
                {showTextInput ? 'Hide' : 'Show'} keyboard
              </button>
            </div>
          ) : null}

          {/* Text Input (Collapsed in Voice Mode) */}
          {(!isVoiceMode || showTextInput) && (
            <div className="flex gap-3 items-center mb-4">
              <div className="flex-1 bg-slate-800 border-4 border-slate-700 rounded-[32px] px-6 py-4 focus-within:border-emerald-500 transition-all">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendOnCall()}
                  placeholder="Say something..."
                  className="w-full bg-transparent outline-none text-white placeholder:text-slate-500 text-xl font-bold"
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleSendOnCall}
                disabled={isLoading}
                className="touch-target bg-emerald-500 hover:bg-emerald-600 text-white p-5 rounded-2xl shadow-xl disabled:opacity-50 min-h-[48px] min-w-[48px]"
              >
                <Send size={28} strokeWidth={3} />
              </motion.button>
            </div>
          )}

          {/* Call controls */}
          <div className="flex justify-center gap-4">
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
