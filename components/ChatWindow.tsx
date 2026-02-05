
import React, { useState, useRef, useEffect } from 'react';
import { Message, Mood, MoodEntry } from '../types';
import { Send, Heart, Sparkles, BarChart2, Calendar, TrendingUp } from 'lucide-react';

interface ChatWindowProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  isThinking: boolean;
  petName?: string;
  showMoodPicker?: boolean;
  onMoodSelect?: (mood: Mood) => void;
  moodHistory: MoodEntry[];
  simulationData?: { type: 'feed' | 'water' | 'none', step: number };
}

const MOODS = [
  { mood: Mood.HAPPY, emoji: '😊', label: 'Happy', color: 'bg-amber-100 text-amber-700 hover:bg-amber-200' },
  { mood: Mood.SAD, emoji: '😢', label: 'Sad', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
  { mood: Mood.FRUSTRATED, emoji: '😤', label: 'Stressed', color: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
  { mood: Mood.TIRED, emoji: '😴', label: 'Tired', color: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' },
  { mood: Mood.OVERWHELMED, emoji: '😰', label: 'Overwhelmed', color: 'bg-purple-100 text-purple-700 hover:bg-purple-200' },
  { mood: Mood.ANXIOUS, emoji: '🤔', label: 'Anxious', color: 'bg-rose-100 text-rose-700 hover:bg-rose-200' },
  { mood: Mood.NEUTRAL, emoji: '😐', label: 'Okay', color: 'bg-slate-100 text-slate-700 hover:bg-slate-200' },
];

export const ChatWindow: React.FC<ChatWindowProps> = ({ 
  messages, 
  onSendMessage, 
  isThinking, 
  petName = "Lumi",
  showMoodPicker,
  onMoodSelect,
  moodHistory,
  simulationData
}) => {
  const [input, setInput] = useState('');
  const [view, setView] = useState<'chat' | 'history'>('chat');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current && view === 'chat') {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking, showMoodPicker, view, simulationData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isThinking) return;
    onSendMessage(input);
    setInput('');
  };

  const renderProgressBar = (text: string) => {
    const match = text.match(/([█░]+)\s*(\d+)%/);
    if (match) {
      const percentage = parseInt(match[2]);
      return (
        <div className="w-full bg-slate-100 rounded-full h-2.5 mt-2 mb-1 overflow-hidden">
          <div className="bg-sky-500 h-full transition-all duration-500" style={{ width: `${percentage}%` }} />
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full w-full bg-white/80 backdrop-blur-2xl rounded-[2.5rem] border-2 border-white shadow-2xl overflow-hidden ring-1 ring-black/5">
      <div className="p-5 border-b border-black/5 flex items-center justify-between bg-white/40">
        <div className="flex items-center gap-4">
          <button onClick={() => setView('chat')} className={`flex items-center gap-2 text-sm font-bold transition-all ${view === 'chat' ? 'text-black' : 'text-slate-400 hover:text-slate-600'}`}>
            <Heart size={18} className={view === 'chat' ? 'text-rose-500 fill-rose-500' : ''} />
            Care Chat
          </button>
          <button onClick={() => setView('history')} className={`flex items-center gap-2 text-sm font-bold transition-all ${view === 'history' ? 'text-black' : 'text-slate-400 hover:text-slate-600'}`}>
            <Calendar size={18} className={view === 'history' ? 'text-indigo-500' : ''} />
            Mood Journey
          </button>
        </div>
      </div>

      {view === 'history' ? (
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
           <h3 className="font-bold text-slate-800">Recent Reflections</h3>
           {moodHistory.slice(-5).map((entry, i) => (
             <div key={i} className="bg-white p-3 rounded-2xl border border-slate-100 flex items-center gap-3">
               <span className="text-xl">{MOODS.find(m => m.mood === entry.mood)?.emoji}</span>
               <div className="flex-1">
                 <p className="text-xs font-bold text-slate-700 capitalize">{entry.mood}</p>
                 <p className="text-[10px] text-slate-400">{new Date(entry.timestamp).toLocaleTimeString()}</p>
               </div>
             </div>
           ))}
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`
                  max-w-[90%] px-5 py-3 rounded-[1.5rem] text-sm leading-relaxed font-medium shadow-sm
                  ${msg.sender === 'user' 
                    ? 'bg-sky-500 text-white rounded-tr-none' 
                    : 'bg-white text-black border border-black/5 rounded-tl-none'}
                `}>
                  {msg.text.split('\n').map((line, i) => {
                    if (line.startsWith('[VOICE]:')) return null;
                    const isVisual = line.startsWith('[VISUAL]:');
                    const isProgress = line.startsWith('[PROGRESS]:');
                    const isAction = line.startsWith('[ACTION]:');
                    const isText = line.startsWith('[TEXT]:');
                    
                    const clean = line.replace(/^\[(VISUAL|PROGRESS|ACTION|TEXT)\]:\s*/i, "");
                    
                    if (isProgress) return <div key={i}>{renderProgressBar(clean)}<p className="text-[10px] opacity-40">{clean}</p></div>;
                    if (isVisual) return <p key={i} className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mt-1">{clean}</p>;
                    if (isAction) return <p key={i} className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full mt-2 inline-block border border-emerald-100">Next: {clean}</p>;
                    
                    return <p key={i} className={isText ? "font-bold" : ""}>{clean}</p>;
                  })}
                </div>
              </div>
            ))}

            {simulationData && simulationData.type !== 'none' && (
              <div className="bg-indigo-50 border-2 border-indigo-100 p-4 rounded-3xl animate-pulse">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 text-center">
                  Simulating {simulationData.type}... Step {simulationData.step}/10
                </p>
                <div className="w-full bg-indigo-200/50 rounded-full h-2.5 mt-2 overflow-hidden">
                  <div className="bg-indigo-500 h-full transition-all" style={{ width: `${(simulationData.step / 10) * 100}%` }} />
                </div>
              </div>
            )}

            {showMoodPicker && (
              <div className="flex flex-col gap-3 p-4 bg-slate-50 rounded-3xl border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 text-center">How are you today?</p>
                <div className="grid grid-cols-4 gap-2">
                  {MOODS.map(({ mood, emoji, color }) => (
                    <button key={mood} onClick={() => onMoodSelect?.(mood)} className={`${color} p-2 rounded-2xl flex items-center justify-center text-xl transition-all hover:scale-110 active:scale-90 shadow-sm`}>
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-5 bg-white/40 border-t border-black/5 flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Talk to ${petName}...`}
              className="flex-1 bg-white border-2 border-transparent focus:border-sky-400 rounded-2xl px-5 py-3 text-sm text-black font-medium focus:outline-none transition-all shadow-inner"
              disabled={isThinking || showMoodPicker}
            />
            <button type="submit" disabled={isThinking || !input.trim() || showMoodPicker} className="bg-black hover:bg-slate-800 disabled:bg-slate-300 text-white p-3.5 rounded-2xl transition-all shadow-lg active:scale-95">
              <Send size={20} />
            </button>
          </form>
        </>
      )}
    </div>
  );
};
