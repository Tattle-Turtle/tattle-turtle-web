/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
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
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
  points: number;
  completed: boolean;
};

type ParentReport = {
  summary: string;
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
};

export default function App() {
  const [mode, setMode] = useState<'child' | 'parent' | 'landing' | 'setup' | 'chat' | 'missions'>('landing');
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
  const [setupData, setSetupData] = useState({ 
    parent_contact: '', 
    child_name: '', 
    child_age: '', 
    character_name: 'Shelly', 
    character_type: 'Turtle', 
    color: 'Emerald' 
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

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
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchProfile = async () => {
    const res = await fetch('/api/profile');
    const data = await res.json();
    setProfile(data);
  };

  const fetchMessages = async () => {
    const res = await fetch('/api/messages');
    const data = await res.json();
    setMessages(data);
  };

  const fetchBadges = async () => {
    const res = await fetch('/api/badges');
    const data = await res.json();
    setBadges(data);
  };

  const fetchMissions = async () => {
    const res = await fetch('/api/missions');
    const data = await res.json();
    setMissions(data);
  };

  const fetchParentData = async () => {
    try {
      const [reportRes, requestsRes, childrenRes] = await Promise.all([
        fetch('/api/parent/report'),
        fetch('/api/parent/requests'),
        fetch('/api/parent/children')
      ]);

      if (reportRes.status === 401 || requestsRes.status === 401 || childrenRes.status === 401) {
        setConfigError("Shelly needs her magic key! Please set your GEMINI_API_KEY in the Secrets panel.");
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
      if (childrenData && childrenData.length > 0 && !selectedChildId) {
        setSelectedChildId(childrenData[0].id);
      }
    } catch (err) {
      console.error("Error fetching parent data:", err);
    }
  };

  const handleRequestAction = async (id: number, status: 'approved' | 'rejected') => {
    await fetch(`/api/parent/requests/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    fetchParentData();
  };

  const handleSetup = async () => {
    setIsCreating(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...setupData,
          child_age: parseInt(setupData.child_age)
        }),
      });
      const data = await res.json();
      setProfile(data);
      setMode('child');
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
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
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json();
      
      if (res.status === 401) {
        setConfigError("Shelly needs her magic key! Please set your GEMINI_API_KEY in the Secrets panel.");
        setIsLoading(false);
        return;
      }

      if (!res.ok) {
        setMessages(prev => [...prev, { 
          id: Date.now(), 
          role: 'model', 
          content: data.error || "Something went wrong. Let's try again!", 
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
        content: "Oops! I'm having a little trouble. Can you check the internet?", 
        timestamp: new Date().toISOString() 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const progress = Math.min(((profile?.points || 0) % 100 / 100) * 100, 100);
  const currentBadge = badges[badges.length - 1];

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
              {profile ? `Ready to talk to ${profile.character_name}?` : "Your Super Friendly AI Companion!"}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 w-full">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => profile ? setMode('child') : setMode('setup')}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-black py-8 px-8 rounded-3xl shadow-[0_8px_0_rgb(5,150,105)] transition-all flex items-center justify-center gap-4 text-2xl"
            >
              <MessageCircle size={32} strokeWidth={3} />
              {profile ? "LET'S PLAY!" : "GET STARTED"}
            </motion.button>
            <button 
              onClick={() => setMode('parent')}
              className="bg-white hover:bg-emerald-50 text-emerald-700 font-bold py-4 px-8 rounded-2xl border-2 border-emerald-200 shadow-sm transition-all flex items-center justify-center gap-3"
            >
              <ShieldCheck size={20} />
              Parents Only
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (mode === 'setup') {
    return (
      <div className="min-h-screen bg-emerald-50 flex flex-col items-center justify-center p-6 font-sans">
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
              <h3 className="text-3xl font-black text-emerald-900 uppercase mb-2">Creating Magic...</h3>
            </div>
          )}

          <div className="text-center">
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3].map(s => (
                <div key={s} className={cn("w-3 h-3 rounded-full", setupStep >= s ? "bg-emerald-500" : "bg-emerald-100")} />
              ))}
            </div>
            <h2 className="text-3xl font-black text-emerald-900 uppercase">
              {setupStep === 1 ? "Parent Info" : setupStep === 2 ? "Child Info" : "Choose Friend"}
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
                <div className="grid grid-cols-3 gap-3">
                  {['Turtle', 'Dolphin', 'Crab'].map(type => (
                    <button
                      key={type}
                      onClick={() => setSetupData({ ...setupData, character_type: type })}
                      className={cn("py-4 rounded-2xl font-bold border-4", setupData.character_type === type ? "bg-emerald-500 text-white border-emerald-600" : "bg-emerald-50 text-emerald-600 border-emerald-100")}
                    >
                      {type}
                    </button>
                  ))}
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
      <div className="min-h-screen bg-emerald-50 flex flex-col font-sans max-w-2xl mx-auto shadow-2xl relative">
        <header className="bg-white p-6 border-b-4 border-emerald-100 sticky top-0 z-20 space-y-4">
          <div className="flex items-center justify-between">
            <button onClick={() => setMode('landing')} className="p-2 hover:bg-emerald-50 rounded-xl">
              <ArrowLeft className="text-emerald-600" size={24} />
            </button>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-black text-emerald-500 uppercase tracking-widest">Explorer</p>
                <p className="text-xl font-black text-emerald-900">{profile?.child_name}</p>
              </div>
              {profile?.image_data ? (
                <img src={profile.image_data} alt="Avatar" className="w-12 h-12 rounded-full border-2 border-emerald-200 object-cover" />
              ) : (
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-2xl">🐢</div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-1">
              <div className="flex justify-between text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                <span>Level {profile?.level}</span>
                <span>{profile?.points % 100}/100 XP</span>
              </div>
              <div className="h-4 bg-emerald-50 rounded-full border-2 border-emerald-100 overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-emerald-500" />
              </div>
            </div>
            <div className="bg-amber-100 px-4 py-2 rounded-2xl border-2 border-amber-200 flex items-center gap-2">
              <Star size={20} className="text-amber-600" fill="currentColor" />
              <span className="font-black text-amber-700 text-lg">{profile?.points}</span>
            </div>
          </div>

          {currentBadge && (
            <div className="bg-white p-3 rounded-2xl border-2 border-emerald-100 flex items-center gap-3 shadow-sm">
              <span className="text-3xl">{currentBadge.icon}</span>
              <div>
                <p className="text-[10px] font-black text-emerald-500 uppercase">Current Badge</p>
                <p className="font-bold text-emerald-900">{currentBadge.name}</p>
              </div>
            </div>
          )}
        </header>

        <main className="flex-1 p-6 space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setMode('chat')}
              className="bg-emerald-500 p-8 rounded-[40px] shadow-[0_12px_0_rgb(5,150,105)] text-white flex flex-col items-center gap-4 group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform">
                <MessageCircle size={120} />
              </div>
              <div className="bg-white/20 p-6 rounded-full">
                <Send size={48} strokeWidth={3} />
              </div>
              <div className="text-center">
                <h3 className="text-4xl font-black uppercase tracking-tight">Brave Call</h3>
                <p className="text-emerald-100 font-bold">Talk to {profile?.character_name}!</p>
              </div>
            </motion.button>

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setMode('missions')}
              className="bg-white p-8 rounded-[40px] shadow-[0_12px_0_rgb(209,213,219)] border-4 border-slate-100 text-slate-800 flex flex-col items-center gap-4 group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform text-slate-900">
                <Trophy size={120} />
              </div>
              <div className="bg-amber-100 p-6 rounded-full text-amber-600">
                <Trophy size={48} strokeWidth={3} />
              </div>
              <div className="text-center">
                <h3 className="text-4xl font-black uppercase tracking-tight">Missions</h3>
                <p className="text-slate-400 font-bold">Earn stars and level up!</p>
              </div>
            </motion.button>
          </div>

          <button 
            onClick={() => setMode('setup')}
            className="w-full py-4 text-emerald-600 font-bold flex items-center justify-center gap-2 hover:bg-emerald-100 rounded-2xl transition-colors"
          >
            <Settings size={20} />
            Change Character
          </button>
        </main>
      </div>
    );
  }

  if (mode === 'chat') {
    return (
      <div className="min-h-screen bg-emerald-50 flex flex-col font-sans max-w-2xl mx-auto shadow-2xl relative">
        <header className="bg-white p-4 flex items-center justify-between border-b-4 border-emerald-100 sticky top-0 z-20">
          <button onClick={() => setMode('child')} className="p-3 hover:bg-emerald-50 rounded-2xl transition-colors">
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
                <h3 className="text-2xl font-black uppercase tracking-tight">Badge Earned!</h3>
                <p className="text-lg font-bold">{showBadgePopup.name}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-4 bg-white border-t-4 border-emerald-100">
          <div className="flex gap-3 bg-emerald-50 p-3 rounded-[32px] border-4 border-emerald-100 focus-within:border-emerald-300 transition-all shadow-inner">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSend()} placeholder="Type here..." className="flex-1 bg-transparent px-4 py-2 outline-none text-emerald-900 placeholder:text-emerald-300 text-xl font-bold" />
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleSend} disabled={isLoading} className="bg-emerald-500 hover:bg-emerald-600 text-white p-4 rounded-2xl shadow-[0_4px_0_rgb(5,150,105)] disabled:opacity-50"><Send size={28} strokeWidth={3} /></motion.button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'missions') {
    return (
      <div className="min-h-screen bg-emerald-50 flex flex-col font-sans max-w-2xl mx-auto shadow-2xl">
        <header className="bg-white p-6 border-b-4 border-emerald-100 flex items-center gap-4">
          <button onClick={() => setMode('child')} className="p-2 hover:bg-emerald-50 rounded-xl">
            <ArrowLeft className="text-emerald-600" size={24} />
          </button>
          <h1 className="text-3xl font-black text-emerald-900 uppercase">Missions</h1>
        </header>
        <main className="p-6 space-y-4">
          {missions.map(m => (
            <div key={m.id} className="bg-white p-6 rounded-[32px] border-4 border-emerald-100 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-xl font-black text-emerald-900">{m.title}</h3>
                <p className="text-slate-500 font-medium">{m.description}</p>
              </div>
              <div className="bg-amber-100 px-4 py-2 rounded-2xl border-2 border-amber-200 text-amber-700 font-black flex items-center gap-2">
                <Star size={16} fill="currentColor" />
                {m.points}
              </div>
            </div>
          ))}
          <div className="bg-emerald-100 p-8 rounded-[40px] border-4 border-dashed border-emerald-300 text-center space-y-2">
            <p className="text-emerald-700 font-black text-xl uppercase">More Coming Soon!</p>
            <p className="text-emerald-600 font-medium">Keep talking to earn more stars!</p>
          </div>
        </main>
      </div>
    );
  }

  if (mode === 'parent') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <header className="bg-white p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button onClick={() => setMode('landing')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ArrowLeft className="text-slate-600" />
            </button>
            <h1 className="text-2xl font-bold text-slate-900">Parent Portal</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium">
              <ShieldCheck size={16} />
              Monitoring Active
            </div>
            <button className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold">Add Child</button>
          </div>
        </header>

        {configError && (
          <div className="bg-amber-50 border-b border-amber-200 p-4 flex items-center gap-3 text-amber-800">
            <AlertTriangle size={20} className="shrink-0" />
            <p className="text-sm font-medium">{configError}</p>
            <button onClick={() => setConfigError(null)} className="ml-auto text-amber-900 font-bold">Close</button>
          </div>
        )}

        <main className="flex-1 p-6 max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar: Children List */}
          <aside className="lg:col-span-3 space-y-4">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest px-2">Your Children</h2>
            {children.map(child => (
              <button 
                key={child.id}
                onClick={() => setSelectedChildId(child.id)}
                className={cn(
                  "w-full p-4 rounded-2xl flex items-center gap-3 transition-all border-2",
                  selectedChildId === child.id 
                    ? "bg-white border-emerald-500 shadow-md" 
                    : "bg-slate-100 border-transparent hover:bg-slate-200"
                )}
              >
                {child.image_data ? (
                  <img src={child.image_data} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">🐢</div>
                )}
                <div className="text-left">
                  <p className="font-bold text-slate-900">{child.child_name}</p>
                  <p className="text-xs text-slate-500">Lvl {child.level} • {child.child_age} yrs</p>
                </div>
              </button>
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

            {/* Growth Moments & Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles size={20} className="text-amber-500" />
                  Growth Moments
                </h2>
                <div className="space-y-4">
                  {report?.growth_moments.map((m, i) => (
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

  return null;
}
