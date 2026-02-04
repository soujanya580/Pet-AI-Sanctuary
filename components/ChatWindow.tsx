
import React, { useState, useRef, useEffect } from 'react';
import { Message, Mood, MoodEntry } from '../types';
import { Send, Heart, Sparkles, BarChart2, Calendar, TrendingUp, Info } from 'lucide-react';

interface ChatWindowProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  isThinking: boolean;
  petName?: string;
  showMoodPicker?: boolean;
  onMoodSelect?: (mood: Mood) => void;
  followUpChoices?: { text: string, action: () => void }[];
  moodHistory: MoodEntry[];
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
  followUpChoices,
  moodHistory
}) => {
  const [input, setInput] = useState('');
  const [view, setView] = useState<'chat' | 'history'>('chat');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current && view === 'chat') {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking, showMoodPicker, followUpChoices, view]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isThinking) return;
    onSendMessage(input);
    setInput('');
  };

  const getMoodEmoji = (mood: Mood) => MOODS.find(m => m.mood === mood)?.emoji || '😐';

  const renderHistory = () => {
    const last7Days = [...moodHistory].slice(-7);
    const moodCounts = last7Days.reduce((acc, entry) => {
      acc[entry.mood] = (acc[entry.mood] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dominantMood = Object.entries(moodCounts).sort((a,b) => b[1] - a[1])[0]?.[0] as Mood;

    return (
      <div className="flex-1 overflow-y-auto p-6 space-y-6 animate-in fade-in duration-500">
        <div className="bg-gradient-to-br from-indigo-50 to-sky-50 p-5 rounded-3xl border-2 border-white shadow-sm">
          <h3 className="flex items-center gap-2 font-bold text-indigo-900 mb-4">
            <BarChart2 size={18} />
            Your Mood Journey
          </h3>
          
          <div className="flex justify-between gap-1 mb-6">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
              const entry = last7Days[i];
              return (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg shadow-sm ${entry ? 'bg-white' : 'bg-slate-100 opacity-40'}`}>
                    {entry ? getMoodEmoji(entry.mood) : ''}
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{day}</span>
                </div>
              );
            })}
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3 bg-white/60 p-3 rounded-2xl">
              <TrendingUp size={16} className="text-emerald-500 mt-1" />
              <div>
                <p className="text-xs font-bold text-slate-700">Recent Trend</p>
                <p className="text-[11px] text-slate-500">
                  {dominantMood ? `You've been mostly feeling ${dominantMood} lately.` : "Start tracking to see your patterns!"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-white/60 p-3 rounded-2xl">
              <Info size={16} className="text-sky-500 mt-1" />
              <div>
                <p className="text-xs font-bold text-slate-700">Pet Insight</p>
                <p className="text-[11px] text-slate-500">
                  {dominantMood === Mood.HAPPY ? "You're glowing! Let's keep this energy up." : "Remember to take small breaks when things get heavy."}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Recent Logs</h4>
          {moodHistory.length === 0 ? (
            <p className="text-center py-10 text-slate-300 text-sm italic">No records yet...</p>
          ) : (
            [...moodHistory].reverse().map((entry, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getMoodEmoji(entry.mood)}</span>
                  <div>
                    <p className="text-sm font-bold text-slate-800 capitalize">{entry.mood}</p>
                    <p className="text-[10px] text-slate-400">{new Date(entry.timestamp).toLocaleDateString()} at {new Date(entry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full bg-white/80 backdrop-blur-2xl rounded-[2.5rem] border-2 border-white shadow-2xl overflow-hidden ring-1 ring-black/5">
      <div className="p-5 border-b border-black/5 flex items-center justify-between bg-white/40">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setView('chat')}
            className={`flex items-center gap-2 text-sm font-bold transition-all ${view === 'chat' ? 'text-black' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Heart size={18} className={view === 'chat' ? 'text-rose-500 fill-rose-500' : ''} />
            Chat
          </button>
          <button 
            onClick={() => setView('history')}
            className={`flex items-center gap-2 text-sm font-bold transition-all ${view === 'history' ? 'text-black' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Calendar size={18} className={view === 'history' ? 'text-indigo-500' : ''} />
            Journey
          </button>
        </div>
        <div className="flex gap-1">
           {[1,2,3].map(i => <Sparkles key={i} size={14} className="text-amber-400 opacity-40" />)}
        </div>
      </div>

      {view === 'history' ? renderHistory() : (
        <>
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide"
          >
            {messages.map((msg) => (
              <div 
                key={msg.id}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`
                  max-w-[90%] px-5 py-3 rounded-[1.5rem] text-base leading-relaxed font-medium shadow-sm
                  ${msg.sender === 'user' 
                    ? 'bg-sky-500 text-white rounded-tr-none' 
                    : msg.sender === 'system'
                    ? 'bg-emerald-50 text-emerald-800 border-2 border-emerald-100 rounded-lg italic text-sm'
                    : 'bg-white text-black border border-black/5 rounded-tl-none'}
                `}>
                  {msg.text.split('\n').map((line, i) => (
                    <p key={i} className={line.startsWith('[') ? 'text-xs opacity-60 font-mono mt-1' : ''}>
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            ))}

            {showMoodPicker && onMoodSelect && (
              <div className="flex flex-col gap-3 p-2 bg-slate-50/50 rounded-3xl border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 text-center mb-1">How are you feeling?</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {MOODS.map(({ mood, emoji, label, color }) => (
                    <button
                      key={mood}
                      onClick={() => onMoodSelect(mood)}
                      className={`${color} flex flex-col items-center justify-center p-2 rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-sm`}
                    >
                      <span className="text-xl">{emoji}</span>
                      <span className="text-[9px] font-bold uppercase mt-1">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {followUpChoices && followUpChoices.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-start animate-in fade-in slide-in-from-left-4 duration-500">
                {followUpChoices.map((choice, i) => (
                  <button
                    key={i}
                    onClick={choice.action}
                    className="px-4 py-2 bg-white border-2 border-sky-100 text-sky-600 rounded-full text-sm font-bold hover:bg-sky-50 transition-colors shadow-sm active:scale-95"
                  >
                    {choice.text}
                  </button>
                ))}
              </div>
            )}

            {isThinking && (
              <div className="flex justify-start">
                <div className="bg-white/60 px-5 py-3 rounded-[1.5rem] rounded-tl-none border border-black/5 flex gap-1.5 items-center">
                  <div className="w-2 h-2 bg-black rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-black rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-black rounded-full animate-bounce"></div>
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
              className="flex-1 bg-white border-2 border-transparent focus:border-sky-400 rounded-2xl px-5 py-3 text-black font-medium focus:outline-none transition-all placeholder:text-slate-400 shadow-inner"
              disabled={isThinking || showMoodPicker}
            />
            <button
              type="submit"
              disabled={isThinking || !input.trim() || showMoodPicker}
              className="bg-black hover:bg-slate-800 disabled:bg-slate-300 text-white p-3.5 rounded-2xl transition-all shadow-lg active:scale-95"
            >
              <Send size={22} />
            </button>
          </form>
        </>
      )}
    </div>
  );
};
