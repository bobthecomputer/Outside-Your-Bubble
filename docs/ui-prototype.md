# UI Prototype Snapshot

The following React component captures the UI concept that was supplied for the swipe deck, explore view, creation flow, and profile view. It is stored here as a historical reference and inspiration for future iterations.

```tsx
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { 
  X, Check, Info, ChevronDown, Share2, Bookmark, BrainCircuit, Globe2, 
  ShieldCheck, ShieldAlert, GraduationCap, Briefcase, Layout, Lightbulb, 
  ArrowRightLeft, RefreshCw, Mic2, Search, User, MessageSquare, 
  Map, Zap, Lock, Eye, Send, Sparkles, Radio, ThumbsUp, ThumbsDown, DollarSign,
  Coffee, Gavel, Handshake, TrendingUp, HeartPulse, FileText, AlertTriangle, Twitter, PlayCircle,
  History, Plus, Bell, Users, Video
} from 'lucide-react';

// --- DATA TYPES & CONFIG ---
type AppMode = 'student' | 'pro' | 'general';
type ViewState = 'deck' | 'explore' | 'create' | 'profile';
type ContentType = 'article' | 'paper' | 'leak' | 'social' | 'history';

// --- ENHANCED MOCK DATA ---
const MOCK_ITEMS = [
  // 1. STANDARD ARTICLE
  {
    id: '1',
    type: 'article',
    title: "The Future of Fusion Energy",
    summary: "Recent experiments verify net energy gain, but commercial viability remains decades away due to tritium scarcity.",
    source: "Physics Today",
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800",
    verificationStatus: "CONFIRMED",
    confidence: 85,
    bubbleFactor: "Outside your Tech feed",
    tags: ["Energy", "Physics"],
    impact: "Could lower electricity bills by 2050.",
    
    studyData: {
      oralTopic: "Is public funding for fusion justified?",
      flashcards: [
        { q: "Net Energy Gain?", a: "Output > Input." },
        { q: "Main obstacle?", a: "Tritium scarcity." }
      ]
    },
    proData: { 
        isLocked: true, 
        marketSignal: "High. Grants +200% YoY.",
        officePolitics: {
            target: "The CTO / Innovation Lead",
            advice: "Mention 'Tritium supply chains' to sound ahead of the curve.",
            risk: "Don't promise immediate ROI."
        }
    },
    generalData: { dinnerTalk: "Star in a bottle...", mentalHealth: "Optimistic 🟢" },
    perspectives: [{ region: "West", angle: "Triumph" }, { region: "South", angle: "Expensive" }],
    debateQuestion: "Fusion (50yr) vs Renewables (Now)?",
    comments: [{ user: "SarahPhy", text: "Baseload solution.", votes: 45 }]
  },
  
  // 2. HISTORICAL LESSON (New Type)
  {
    id: 'hist-1',
    type: 'history',
    title: "Case Study: The Kodak Blindspot",
    summary: "In 1975, a Kodak engineer invented the digital camera. Management hid it to protect film sales. 30 years later, they went bankrupt.",
    source: "Business History Archive",
    image: "https://images.unsplash.com/photo-1517260739337-6799d2eb9ce0?auto=format&fit=crop&q=80&w=800",
    verificationStatus: "CONFIRMED",
    confidence: 100,
    bubbleFactor: "Historical Lesson",
    tags: ["Strategy", "Failure", "History"],
    impact: "Don't ignore innovation just because it hurts your current margins.",
    
    studyData: {
      oralTopic: "Analyze the 'Innovator's Dilemma' using Kodak as the primary example.",
      flashcards: [
        { q: "Invention Year?", a: "1975" },
        { q: "Strategic Error?", a: "Protecting legacy assets over future growth." }
      ]
    },
    proData: { 
        isLocked: true, 
        marketSignal: "Lesson in Disruption.", 
        officePolitics: {
            target: "Product Managers",
            advice: "Use this story when proposing a pivot that cannibalizes current revenue.",
            risk: "You might be seen as a alarmist."
        }
    },
    generalData: { dinnerTalk: "Kodak actually invented the thing that killed them.", mentalHealth: "Reflective 🟣" },
    perspectives: [],
    debateQuestion: "Is self-cannibalization necessary for survival?",
    comments: []
  },

  // 3. LEAK / WHISTLEBLOWER
  {
    id: 'leak-1',
    type: 'leak',
    title: "Internal Memo: AI Water Scarcity",
    summary: "Leaked documents reveal data center cooling uses 4x more water than public reports admit.",
    source: "Verified Whistleblower",
    image: "https://images.unsplash.com/photo-1516110833967-0b5716ca1387?auto=format&fit=crop&q=80&w=800",
    verificationStatus: "DEVELOPING",
    confidence: 90,
    bubbleFactor: "Hidden from Mainstream",
    tags: ["AI", "Environment", "Leak"],
    impact: "Local water restrictions linked to server farms.",
    
    studyData: {
      oralTopic: "Ethics of corporate resource transparency.",
      flashcards: [
        { q: "Leak Subject?", a: "Water Consumption." },
        { q: "Discrepancy?", a: "4x higher." }
      ]
    },
    proData: { 
        isLocked: false, 
        marketSignal: "Regulatory Risk: EPA review incoming.",
        officePolitics: {
            target: "Sustainability Officer (ESG)",
            advice: "Ask if our cloud providers have water impact reports.",
            risk: "Don't accuse, just inquire."
        }
    },
    generalData: { dinnerTalk: "ChatGPT drinks a bottle of water per 20 queries.", mentalHealth: "Concerning 🔴" },
    perspectives: [{ region: "Corp", angle: "Trade Secret" }, { region: "Public", angle: "Resource Theft" }],
    debateQuestion: "Ration compute during droughts?",
    comments: []
  },
];

// --- UTILS ---
const getTypeColor = (type: ContentType) => {
  switch(type) {
    case 'leak': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
    case 'history': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    case 'paper': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
    case 'social': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    default: return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  }
};

const getTypeIcon = (type: ContentType) => {
  switch(type) {
    case 'leak': return <AlertTriangle size={14} />;
    case 'history': return <History size={14} />;
    case 'paper': return <FileText size={14} />;
    case 'social': return <Twitter size={14} />;
    default: return <Globe2 size={14} />;
  }
};

// --- SUB-COMPONENTS ---

const NavIcon = ({ icon: Icon, label, isActive, onClick, isMain }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 transition-all duration-300 ${isMain ? '-mt-6' : ''} ${isActive ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
  >
    <div className={`p-2 rounded-full transition-all ${isMain ? 'bg-indigo-600 p-4 shadow-lg shadow-indigo-500/40 border-4 border-slate-950' : isActive ? 'bg-white/10' : 'bg-transparent'}`}>
      <Icon size={isMain ? 28 : 24} strokeWidth={isActive || isMain ? 2.5 : 2} />
    </div>
    <span className="text-[10px] font-bold tracking-wide uppercase opacity-80">{label}</span>
  </button>
);

const SourceBadge = ({ type, source }) => (
  <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase border ${getTypeColor(type)}`}>
    {getTypeIcon(type)}
    <span>{source}</span>
  </div>
);

// --- VIEWS ---

// 1. EXPLORE VIEW
const ExploreView = ({ onOpenItem }) => {
  const categories = ["All", "History 📜", "Leaks 🚨", "Research 📄", "Viral 🐦"];
  
  return (
    <div className="h-full flex flex-col pb-24 overflow-hidden bg-slate-950">
      <div className="p-6 pb-2 shrink-0">
        <h2 className="text-3xl font-black text-white mb-1">Discover</h2>
        <div className="relative mt-4">
          <Search className="absolute left-4 top-3.5 text-slate-500" size={18} />
          <input type="text" placeholder="Search the archives..." className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-emerald-500 transition-colors" />
        </div>
      </div>

      <div className="px-6 flex gap-3 overflow-x-auto no-scrollbar pb-4 shrink-0">
        {categories.map((c, i) => (
          <button key={c} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${i === 0 ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-600'}`}>
            {c}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-6">
        <div className="grid grid-cols-2 gap-4 pb-8">
           {/* Featured History Item */}
           <div onClick={() => onOpenItem('hist-1')} className="col-span-2 bg-gradient-to-br from-amber-950 to-slate-900 rounded-2xl p-5 border border-amber-500/20 relative overflow-hidden group cursor-pointer">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"><History size={80}/></div>
              <SourceBadge type="history" source="Archive" />
              <h3 className="text-xl font-bold text-white mt-3 mb-2 leading-tight">The Kodak Blindspot</h3>
              <p className="text-sm text-slate-400 line-clamp-2">Why successful companies fail to see the future.</p>
           </div>

           {/* Leak Item */}
           <div onClick={() => onOpenItem('leak-1')} className="col-span-1 bg-slate-900 rounded-2xl p-4 border border-white/5 cursor-pointer hover:border-rose-500/30 transition-colors">
              <SourceBadge type="leak" source="Leak" />
              <h4 className="text-sm font-bold text-white mt-2 mb-1">AI Water Use</h4>
              <p className="text-xs text-slate-500">Internal Memo.</p>
           </div>
           
           {/* Article */}
           <div onClick={() => onOpenItem('1')} className="col-span-1 bg-slate-900 rounded-2xl p-4 border border-white/5 cursor-pointer hover:border-emerald-500/30 transition-colors">
              <SourceBadge type="article" source="News" />
              <h4 className="text-sm font-bold text-white mt-2 mb-1">Fusion Tech</h4>
              <p className="text-xs text-slate-500">Breakthrough?</p>
           </div>
        </div>
      </div>
    </div>
  );
};

// 2. CREATE VIEW (New)
const CreateView = () => (
  <div className="h-full flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-300">
     <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 border border-white/10 shadow-xl shadow-indigo-500/10">
        <Video size={32} className="text-indigo-400"/>
     </div>
     <h2 className="text-2xl font-bold text-white mb-2">Share Your Perspective</h2>
     <p className="text-slate-400 mb-8 max-w-xs">Record a reaction, summarize a news item for the community, or host a mini-debate.</p>
     <div className="space-y-3 w-full max-w-sm">
        <button className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all">
           <Video size={18} /> Record Video
        </button>
        <button className="w-full py-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-white flex items-center justify-center gap-2 border border-white/5 transition-all">
           <FileText size={18} /> Write Article
        </button>
     </div>
  </div>
);

// 3. PROFILE VIEW (Enhanced with Smart Notifications)
const ProfileView = ({ mode, setMode }) => {
  return (
    <div className="p-6 space-y-6 pb-24 overflow-y-auto h-full">
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-xl border-4 border-slate-900">
          <User size={32} className="text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Alex Explorer</h2>
          <div className="flex items-center gap-2 mt-1">
             <span className="text-slate-400 text-xs">Level 12 • 8 Day Streak</span>
          </div>
        </div>
      </div>

      {/* Mode Switcher - VISUALLY DISTINCT */}
      <div className="bg-slate-900 p-2 rounded-2xl border border-white/10">
        <h3 className="text-xs font-bold text-slate-500 uppercase ml-2 mb-2">Interface Mode</h3>
        <div className="grid grid-cols-3 gap-2">
           <button onClick={() => setMode('student')} className={`py-3 rounded-xl flex flex-col items-center gap-1 transition-all ${mode === 'student' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800 text-slate-500'}`}>
             <GraduationCap size={18} />
             <span className="text-[10px] font-bold">Student</span>
           </button>
           <button onClick={() => setMode('pro')} className={`py-3 rounded-xl flex flex-col items-center gap-1 transition-all ${mode === 'pro' ? 'bg-amber-600 text-white shadow-lg' : 'bg-slate-800 text-slate-500'}`}>
             <Briefcase size={18} />
             <span className="text-[10px] font-bold">Pro</span>
           </button>
           <button onClick={() => setMode('general')} className={`py-3 rounded-xl flex flex-col items-center gap-1 transition-all ${mode === 'general' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-800 text-slate-500'}`}>
             <Coffee size={18} />
             <span className="text-[10px] font-bold">General</span>
           </button>
        </div>
      </div>

      {/* Smart Notifications */}
      <div className="bg-slate-800 rounded-2xl p-5 border border-white/5">
        <h3 className="font-bold text-white flex items-center gap-2 mb-4"><Bell size={16} className="text-yellow-400"/> Smart Routine</h3>
        <div className="space-y-3">
           <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-white/5">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400"><Coffee size={14}/></div>
                 <div>
                    <div className="text-sm font-bold text-white">Morning Brief</div>
                    <div className="text-xs text-slate-500">08:00 AM • Motivation</div>
                 </div>
              </div>
              <div className="w-8 h-4 bg-emerald-500 rounded-full relative"><div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full"></div></div>
           </div>
           <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-white/5">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400"><Briefcase size={14}/></div>
                 <div>
                    <div className="text-sm font-bold text-white">Office Intel</div>
                    <div className="text-xs text-slate-500">12:00 PM • Career Tips</div>
                 </div>
              </div>
              <div className="w-8 h-4 bg-emerald-500 rounded-full relative"><div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full"></div></div>
           </div>
           <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-white/5">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-rose-500/20 rounded-lg text-rose-400"><HeartPulse size={14}/></div>
                 <div>
                    <div className="text-sm font-bold text-white">Decompress</div>
                    <div className="text-xs text-slate-500">06:00 PM • Good News</div>
                 </div>
              </div>
              <div className="w-8 h-4 bg-emerald-500 rounded-full relative"><div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full"></div></div>
           </div>
        </div>
      </div>
    </div>
  );
};

// 4. DECK VIEW & CARD
const DeckView = ({ items, onExpand, removeCard, mode }) => {
  const containerRef = useRef(null);
  return (
    <div className="flex-1 flex flex-col relative w-full h-full overflow-hidden">
      <div className="h-20 shrink-0" />
      <div className="flex-1 flex flex-col items=center justify-center relative w-full" ref={containerRef}>
        <div className="relative w-full max-w-md h-[60vh] min-h-[450px] px-4 perspective-1000">
           <AnimatePresence>
              {items.map((item, index) => (
                <Card key={item.id} item={item} index={index} active={index === 0} dragConstraints={containerRef} onSwipe={removeCard} expandCard={() => onExpand(item.id)} mode={mode} />
              ))}
           </AnimatePresence>
        </div>
      </div>
      <div className="h-24 flex items-center justify-center gap-8 z-10 pb-4 shrink-0">
        <button onClick={() => removeCard('left')} className="w-14 h-14 rounded-full bg-slate-900 border border-slate-700 text-rose-500 flex items-center justify-center hover:bg-rose-500/10 hover:scale-110 transition-all shadow-lg"><X strokeWidth={3} size={24}/></button>
        <button className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 text-indigo-400 flex items-center justify-center hover:bg-indigo-500/10 hover:scale-110 transition-all"><Info size={20}/></button>
        <button onClick={() => removeCard('right')} className="w-14 h-14 rounded-full bg-slate-900 border border-slate-700 text-emerald-500 flex items-center justify-center hover:bg-emerald-500/10 hover:scale-110 transition-all shadow-lg"><Check strokeWidth={3} size={24}/></button>
      </div>
    </div>
  );
}

const Card = ({ item, index, dragConstraints, onSwipe, active, expandCard, mode }) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-10, 10]);
  const scale = active ? 1 : 1 - index * 0.04;
  const yOffset = index * 12;
  const zIndex = 50 - index;
  const handleDragEnd = (event, info) => { if (Math.abs(info.offset.x) > 100) onSwipe(info.offset.x > 0 ? 'right' : 'left'); };

  // --- VISUAL MODES ---
  const isStudent = mode === 'student';
  const isPro = mode === 'pro';
  
  // Dynamic Styles based on Mode
  const cardBg = isStudent ? 'bg-slate-900' : isPro ? 'bg-slate-950' : 'bg-slate-900';
  const borderStyle = isStudent ? 'border-indigo-500/30 border-2' : isPro ? 'border-amber-600/40 border' : 'border-white/10 border';
  const overlayGradient = isStudent ? 'from-indigo-950/90' : isPro ? 'from-amber-950/90' : 'from-slate-950/80';
  
  return (
    <motion.div
      style={{ x: active ? x : 0, rotate: active ? rotate : 0, zIndex, scale, y: yOffset, opacity: index > 2 ? 0 : 1 }}
      drag={active ? "x" : false} dragConstraints={dragConstraints} onDragEnd={handleDragEnd} whileTap={{ cursor: "grabbing" }}
      layoutId={`card-${item.id}`}
      className={`absolute w-full h-full rounded-3xl overflow-hidden shadow-2xl origin-bottom transition-all duration-300 ${cardBg} ${borderStyle} ${active ? 'cursor-grab' : 'brightness-75'}`}
    >
      <div className="absolute inset-0">
        <img src={item.image} className="w-full h-full object-cover opacity-50" alt="" />
        <div className={`absolute inset-0 bg-gradient-to-t ${overlayGradient} via-slate-900/50 to-transparent`} />
        
        {/* Student Mode Grid Overlay */}
        {isStudent && <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(#6366f1 1px, transparent 1px), linear-gradient(90deg, #6366f1 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>}
      </div>

      <div className="absolute inset-0 p-6 flex flex-col justify-end text-white select-none">
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
           <SourceBadge type={item.type || 'article'} source={item.source} />
           {isStudent && <div className="bg-indigo-600/20 p-2 rounded-full backdrop-blur-md border border-indigo-500/50"><GraduationCap size={20} className="text-indigo-300"/></div>}
           {isPro && <div className="bg-amber-600/20 p-2 rounded-full backdrop-blur-md border border-amber-500/50"><Briefcase size={20} className="text-amber-300"/></div>}
        </div>

        <motion.div layoutId={`content-${item.id}`}>
          {/* Mode-Specific Preview Content */}
          {isStudent && item.studyData && (
              <div className="mb-3 p-3 bg-indigo-900/40 rounded-xl border border-indigo-500/30 backdrop-blur-sm">
                 <div className="text-[10px] font-bold text-indigo-300 uppercase mb-1 flex items-center gap-1"><Mic2 size={10}/> Oral Prep</div>
                 <div className="text-sm font-medium text-white line-clamp-1">"{item.studyData.oralTopic}"</div>
              </div>
          )}
          
          {isPro && item.proData && (
              <div className="mb-3 p-3 bg-amber-900/40 rounded-xl border border-amber-500/30 backdrop-blur-sm">
                 <div className="text-[10px] font-bold text-amber-300 uppercase mb-1 flex items-center gap-1"><TrendingUp size={10}/> Market Signal</div>
                 <div className="text-sm font-medium text-white line-clamp-1">{item.proData.marketSignal}</div>
              </div>
          )}

          <h2 className="text-3xl font-bold leading-tight mb-2 drop-shadow-lg">{item.title}</h2>
          
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
            <div className="text-xs text-slate-400 font-medium">{item.impact}</div>
            <button onClick={(e) => { e.stopPropagation(); expandCard(); }} className="bg-white/10 hover:bg-white/20 px-5 py-2.5 rounded-full text-sm font-bold backdrop-blur-md border border-white/10 flex items-center gap-2">
              Analyze <ChevronDown size={14} className="-rotate-90" />
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

// 5. DETAIL VIEW (Updated with Office Ecosystem)
const DetailView = ({ item, onClose, mode }) => {
  const [activeTab, setActiveTab] = useState('brief');
  if (!item) return null;
  const isPro = mode === 'pro';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/95 backdrop-blur-xl">
      <motion.div layoutId={`card-${item.id}`} className="w-full md:max-w-2xl h-full md:h-[90vh] bg-slate-900 md:rounded-3xl overflow-hidden shadow-2xl flex flex-col relative border border-white/10">
        <button onClick={onClose} className="absolute top-4 right-4 z-20 p-2 bg-black/50 rounded-full text-white hover:bg-white/20 transition-colors"><X size={20} /></button>

        <div className="h-56 relative shrink-0">
          <img src={item.image} className="w-full h-full object-cover" alt="" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-6 right-6">
             <h1 className="text-2xl font-bold text-white mb-2 leading-tight drop-shadow-lg">{item.title}</h1>
          </div>
        </div>

        <div className="px-6 flex gap-6 border-b border-white/10 overflow-x-auto no-scrollbar shrink-0">
          {['brief', mode === 'student' ? 'study' : mode === 'pro' ? 'strategy' : 'citizen', 'sources'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-3 text-sm font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-all ${activeTab === tab ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
              {tab}
            </button>
          ))}
        </div>

        <div className="px-6 py-6 overflow-y-auto custom-scrollbar flex-1 relative">
           {activeTab === 'brief' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <p className="text-lg text-slate-200 leading-relaxed font-light">{item.summary}</p>
                {item.type === 'history' && (
                    <div className="bg-amber-900/20 p-4 rounded-xl border border-amber-500/30 flex gap-3">
                        <History className="text-amber-500 shrink-0" />
                        <div>
                        <h4 className="font-bold text-amber-400 text-sm uppercase">Historical Lesson</h4>
                        <p className="text-sm text-slate-300">Those who don't learn from history are doomed to repeat it. This case study from 1975 mirrors current AI trends.</p>
                        </div>
                    </div>
                )}
              </div>
           )}

           {activeTab === 'study' && item.studyData && (
             <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
               <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 p-5 rounded-2xl border border-indigo-500/20 relative overflow-hidden">
                  <h4 className="text-xs font-bold text-indigo-300 uppercase flex items-center gap-2 mb-2"><Mic2 size={14} /> Oral Topic</h4>
                  <p className="text-white font-medium text-lg mb-4">"{item.studyData.oralTopic}"</p>
                  <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-white flex items-center justify-center gap-2"><PlayCircle size={18}/> Practice</button>
               </div>
               <div className="space-y-3">
                 {item.studyData.flashcards.map((fc, i) => (
                   <div key={i} className="bg-slate-800 p-4 rounded-xl border border-white/5"><div className="text-white font-bold">{fc.q}</div><div className="text-sm text-slate-300 pt-2 border-t border-white/10 mt-2">{fc.a}</div></div>
                 ))}
               </div>
             </div>
           )}

           {activeTab === 'strategy' && item.proData && (
             <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                {/* OFFICE POLITICS ECOSYSTEM */}
                <div className="bg-slate-800 p-5 rounded-2xl border border-white/5">
                    <h3 className="text-sm font-bold text-amber-400 uppercase mb-4 flex items-center gap-2"><Users size={16}/> Office Ecosystem</h3>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="p-3 bg-slate-900 rounded-xl border border-white/5">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">Key Stakeholder</span>
                            <div className="font-bold text-white mt-1">{item.proData.officePolitics?.target || "Team Lead"}</div>
                        </div>
                        <div className="p-3 bg-slate-900 rounded-xl border border-white/5">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">Status Impact</span>
                            <div className="font-bold text-emerald-400 mt-1">High Visibility</div>
                        </div>
                    </div>

                    <div className="bg-emerald-900/10 p-3 rounded-lg border border-emerald-500/20 mb-3">
                        <span className="text-[10px] text-emerald-400 uppercase font-bold flex items-center gap-1"><MessageSquare size={10}/> What to say</span>
                        <p className="text-sm text-slate-200 mt-1 italic">"{item.proData.officePolitics?.advice}"</p>
                    </div>

                    <div className="bg-rose-900/10 p-3 rounded-lg border border-rose-500/20">
                        <span className="text-[10px] text-rose-400 uppercase font-bold flex items-center gap-1"><AlertTriangle size={10}/> Risk</span>
                        <p className="text-sm text-slate-200 mt-1">{item.proData.officePolitics?.risk}</p>
                    </div>
                </div>
             </div>
           )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// --- MAIN APP ---
export default function UltimateDeck() {
  const [currentView, setCurrentView] = useState<ViewState>('deck');
  const [appMode, setAppMode] = useState<AppMode>('student');
  const [items, setItems] = useState(MOCK_ITEMS);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const removeCard = (direction) => {
    const newItems = [...items];
    const removed = newItems.shift();
    setItems(newItems);
    setTimeout(() => setItems(prev => [...prev, removed]), 500);
  };

  return (
    <div className="h-screen bg-slate-950 text-white overflow-hidden flex flex-col font-sans selection:bg-indigo-500/30">
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20 bg-gradient-to-b from-slate-950 to-transparent">
         <div className="flex items-center gap-2 pl-2">
            <h1 className="font-bold text-xl tracking-tight drop-shadow-md">Outside<span className="text-slate-500">YourBubble</span></h1>
         </div>
         <div className="text-xs font-mono px-3 py-1 rounded-full bg-white/5 border border-white/10">{appMode.toUpperCase()} MODE</div>
      </div>

      <main className="flex-1 relative overflow-hidden">
        {currentView === 'deck' && <DeckView items={items} onExpand={setExpandedId} removeCard={removeCard} mode={appMode} />}
        {currentView === 'explore' && <ExploreView onOpenItem={setExpandedId} />}
        {currentView === 'create' && <CreateView />}
        {currentView === 'profile' && <ProfileView mode={appMode} setMode={setAppMode} />}
      </main>

      <nav className="h-20 bg-slate-900/90 backdrop-blur-xl border-t border-white/5 flex items-center justify-around px-4 pb-2 shrink-0 z-30">
        <NavIcon icon={Layout} label="Feed" isActive={currentView === 'deck'} onClick={() => setCurrentView('deck')} isMain={false} />
        <NavIcon icon={Search} label="Explore" isActive={currentView === 'explore'} onClick={() => setCurrentView('explore')} isMain={false} />
        <NavIcon icon={Plus} label="Create" isActive={currentView === 'create'} onClick={() => setCurrentView('create')} isMain={true} />
        <NavIcon icon={User} label="Profile" isActive={currentView === 'profile'} onClick={() => setCurrentView('profile')} isMain={false} />
      </nav>

      <AnimatePresence>{expandedId && <DetailView item={items.find(i => i.id === expandedId)} onClose={() => setExpandedId(null)} mode={appMode}/>}</AnimatePresence>
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
    </div>
  );
}
```
