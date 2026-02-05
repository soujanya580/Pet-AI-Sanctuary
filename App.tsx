
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PetAvatar } from './components/PetAvatar.tsx';
import { ChatWindow } from './components/ChatWindow.tsx';
import { Message, PetStatus, PetType, PetStats, Mood, MoodEntry } from './types.ts';
import { lumiService } from './services/gemini.ts';
import { actionProcessor, InteractionSource } from './services/ActionProcessor.ts';
import { Footprints, Moon, Droplets, Utensils, Gamepad2, Heart, Zap } from 'lucide-react';

function decode(base64: string) {
  const b = atob(base64);
  const l = b.length;
  const y = new Uint8Array(l);
  for (let i = 0; i < l; i++) y[i] = b.charCodeAt(i);
  return y;
}

async function decodeAudioData(d: Uint8Array, c: AudioContext, s: number, n: number): Promise<AudioBuffer> {
  const i16 = new Int16Array(d.buffer);
  const f = i16.length / n;
  const b = c.createBuffer(n, f, s);
  for (let ch = 0; ch < n; ch++) {
    const cd = b.getChannelData(ch);
    for (let i = 0; i < f; i++) cd[i] = i16[i * n + ch] / 32768.0;
  }
  return b;
}

const App: React.FC = () => {
  const [petType, setPetType] = useState<PetType>(PetType.DOG);
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<PetStatus>(PetStatus.IDLE);
  const [stats, setStats] = useState<PetStats>({ hunger: 50, thirst: 50, happiness: 50, energy: 80 });
  const [isThinking, setIsThinking] = useState(false);
  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>(() => {
    const saved = localStorage.getItem('mood_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [isNight, setIsNight] = useState(false);

  // Simulation State
  const [simulationStep, setSimulationStep] = useState(0);
  const [simulationType, setSimulationType] = useState<'feed' | 'water' | 'none'>('none');

  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const hour = new Date().getHours();
    setIsNight(hour >= 21 || hour < 6);
    if (hour >= 21 || hour < 6) setStatus(PetStatus.SLEEPING);
  }, []);

  const speak = async (fullText: string) => {
    const voiceMatch = fullText.match(/\[VOICE\]:\s*"([^"]*)"/i);
    const voiceText = voiceMatch ? voiceMatch[1].trim() : "";
    if (!voiceText || voiceText === '""') return;

    try {
      const audioData = await lumiService.generateSpeech(voiceText, petType);
      if (audioData) {
        if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        const buf = await decodeAudioData(decode(audioData), audioContextRef.current, 24000, 1);
        const s = audioContextRef.current.createBufferSource();
        s.buffer = buf; 
        s.connect(audioContextRef.current.destination); 
        s.start();
      }
    } catch (e) {
      const utterance = new SpeechSynthesisUtterance(voiceText);
      window.speechSynthesis.speak(utterance);
    }
  };

  const startSimulation = (type: 'feed' | 'water') => {
    setSimulationType(type);
    setSimulationStep(0);
    setStatus(type === 'feed' ? PetStatus.EATING : PetStatus.DRINKING);
    
    const totalSteps = type === 'feed' ? 10 : 8;
    const interval = setInterval(() => {
      setSimulationStep(prev => {
        if (prev >= totalSteps) {
          clearInterval(interval);
          setSimulationType('none');
          setStatus(PetStatus.HAPPY);
          setTimeout(() => setStatus(PetStatus.IDLE), 2000);
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const handleSendMessage = async (text: string) => {
    setMessages(prev => [...prev, { id: Date.now().toString(), text, sender: 'user', timestamp: Date.now() }]);
    setIsThinking(true);

    const lower = text.toLowerCase();
    if (lower.includes('feed')) startSimulation('feed');
    else if (lower.includes('water')) startSimulation('water');

    try {
      const resp = await lumiService.sendMessage(text, petType);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), text: resp, sender: 'lumi', timestamp: Date.now() }]);
      speak(resp);
    } catch (e) {
      setMessages(prev => [...prev, { id: Date.now().toString(), text: "🐾 I'm here!", sender: 'lumi', timestamp: Date.now() }]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleMoodSelect = (mood: Mood) => {
    setShowMoodPicker(false);
    setMoodHistory(prev => [...prev, { mood, timestamp: Date.now() }]);
    const text = mood === Mood.SAD || mood === Mood.OVERWHELMED 
      ? `I'm feeling ${mood}. I need some help.`
      : `I'm feeling ${mood}.`;
    handleSendMessage(text);
  };

  useEffect(() => {
    const names = { [PetType.DOG]: "Buddy", [PetType.CAT]: "Luna" };
    const t = `[VOICE]: "Hi! I'm ${names[petType]}! So happy you're here! *wag*"\n[VISUAL]: Greets you warmly\n[TEXT]: Welcome to the sanctuary!`;
    setMessages([{ id: 'greet', text: t, sender: 'lumi', timestamp: Date.now() }]);
    setStatus(PetStatus.HAPPY);
    speak(t);
    setTimeout(() => { setShowMoodPicker(true); setStatus(PetStatus.IDLE); }, 2000);
  }, [petType]);

  return (
    <div className={`relative w-full h-screen overflow-hidden transition-all duration-1000 ${isNight ? 'bg-indigo-950' : 'gradient-bg'} flex flex-col items-center p-4 md:p-6 touch-none`}>
      {isNight && <div className="absolute inset-0 bg-orange-500/10 pointer-events-none mix-blend-overlay" />}
      
      <div className="z-10 w-full max-w-5xl flex justify-between items-center mb-4">
        <div className="bg-white/80 backdrop-blur-2xl p-1.5 rounded-full border-2 border-white shadow-lg flex gap-1">
          <button onClick={() => setPetType(PetType.DOG)} className={`p-2 rounded-full transition-all ${petType === PetType.DOG ? 'bg-amber-500 text-white shadow-md' : 'text-slate-600'}`}><Footprints size={18}/></button>
          <button onClick={() => setPetType(PetType.CAT)} className={`p-2 rounded-full transition-all ${petType === PetType.CAT ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600'}`}><Moon size={18}/></button>
        </div>
      </div>

      <div className="flex-1 w-full max-w-6xl flex flex-col lg:flex-row items-center justify-center gap-4 px-4">
        <div className="flex flex-col items-center lg:w-[40%] flex-shrink-0">
          <div className="w-full max-w-xs grid grid-cols-2 gap-3 mb-6 bg-white/40 p-4 rounded-3xl border-2 border-white backdrop-blur-md">
            <StatBar label="Hunger" value={stats.hunger} color="bg-orange-400" />
            <StatBar label="Thirst" value={stats.thirst} color="bg-blue-400" />
            <StatBar label="Happy" value={stats.happiness} color="bg-rose-400" />
            <StatBar label="Energy" value={stats.energy} color="bg-emerald-400" />
          </div>
          
          <PetAvatar type={petType} status={status} onClick={() => handleSendMessage("pet")} />
          
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            <ActionButton icon={<Utensils size={18}/>} label="Feed" onClick={() => handleSendMessage("feed")} color="bg-orange-50 text-orange-600 ring-orange-100" />
            <ActionButton icon={<Droplets size={18}/>} label="Water" onClick={() => handleSendMessage("water")} color="bg-blue-50 text-blue-600 ring-blue-100" />
            <ActionButton icon={<Gamepad2 size={18}/>} label="Play" onClick={() => handleSendMessage("play fetch")} color="bg-purple-50 text-purple-600 ring-purple-100" />
            <ActionButton icon={<Heart size={18}/>} label="Pet" onClick={() => handleSendMessage("pet")} color="bg-rose-50 text-rose-600 ring-rose-100" />
          </div>
        </div>

        <div className="w-full lg:w-[50%] max-lg:hidden max-w-lg h-[550px]">
          <ChatWindow 
            messages={messages} 
            onSendMessage={handleSendMessage} 
            isThinking={isThinking} 
            petName={petType === PetType.DOG ? "Buddy" : "Luna"} 
            showMoodPicker={showMoodPicker}
            onMoodSelect={handleMoodSelect}
            moodHistory={moodHistory}
            simulationData={{ type: simulationType, step: simulationStep }}
          />
        </div>
      </div>
      
      <div className="mb-2 text-[10px] font-black tracking-[0.4em] uppercase opacity-30 text-center">
        {isNight ? "Night Cycle Active" : "PausePaws Full Experience"}
      </div>
    </div>
  );
};

const StatBar: React.FC<{label: string, value: number, color: string}> = ({ label, value, color }) => (
  <div className="flex flex-col gap-1">
    <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter text-slate-600">
      <span>{label}</span>
      <span>{Math.round(value)}%</span>
    </div>
    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
      <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${value}%` }} />
    </div>
  </div>
);

const ActionButton: React.FC<{icon: any, label: string, onClick?: any, color: string}> = ({ icon, label, onClick, color }) => (
  <button onClick={onClick} className={`${color} p-4 rounded-3xl flex flex-col items-center gap-1 hover:scale-110 transition-all shadow-md border-2 border-white ring-2 select-none`}>
    {icon}<span className="text-[10px] font-black uppercase tracking-tighter">{label}</span>
  </button>
);

export default App;
