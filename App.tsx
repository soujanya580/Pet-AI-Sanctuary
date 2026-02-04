
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PetAvatar } from './components/PetAvatar.tsx';
import { ChatWindow } from './components/ChatWindow.tsx';
import { Message, PetStatus, PetType, PetStats, Mood, MoodEntry } from './types.ts';
import { lumiService } from './services/gemini.ts';
import { actionProcessor, InteractionSource } from './services/ActionProcessor.ts';
import { Footprints, Moon, Droplets, Utensils, Gamepad2, Heart } from 'lucide-react';

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
  
  // Mood Journey State
  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>(() => {
    const saved = localStorage.getItem('mood_history');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Mood Check-in States
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [followUpChoices, setFollowUpChoices] = useState<{ text: string, action: () => void }[]>([]);

  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    localStorage.setItem('mood_history', JSON.stringify(moodHistory));
  }, [moodHistory]);

  const speak = async (text: string, delay: number = 0) => {
    if (!text) return;
    const sanitized = lumiService.sanitize(text, petType);
    const cleanText = sanitized.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F3FB}-\u{1F3FF}\u{200D}\u{FE0F}]/gu, '').trim();

    setTimeout(async () => {
      try {
        const audioData = await lumiService.generateSpeech(cleanText, petType);
        if (audioData) {
          if (!audioContextRef.current) audioContextRef.current = new AudioContext();
          const buf = await decodeAudioData(decode(audioData), audioContextRef.current, 24000, 1);
          const s = audioContextRef.current.createBufferSource();
          const g = audioContextRef.current.createGain();
          g.gain.value = 0.6;
          s.buffer = buf; 
          s.connect(g).connect(audioContextRef.current.destination); 
          s.start();
          return;
        }
      } catch (e) {}

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.pitch = petType === PetType.DOG ? 0.9 : 1.2;
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }, delay);
  };

  const playInteractionSound = useCallback((type: 'crunch' | 'lap' | 'purr', isCat: boolean) => {
    if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = audioContextRef.current;
    
    if (type === 'crunch') {
      const duration = isCat ? 0.08 : 0.12;
      const noise = ctx.createBufferSource();
      const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(isCat ? 2200 : 1400, ctx.currentTime);
      filter.Q.setValueAtTime(isCat ? 3 : 1.5, ctx.currentTime);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(isCat ? 0.03 : 0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      noise.connect(filter).connect(gain).connect(ctx.destination);
      noise.start();
    } else if (type === 'lap') {
      const osc = ctx.createOscillator(); 
      const gain = ctx.createGain();
      osc.type = 'sine'; 
      osc.frequency.setValueAtTime(isCat ? 350 : 250, ctx.currentTime);
      gain.gain.setValueAtTime(0.02, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain).connect(ctx.destination);
      osc.start(); 
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'purr') {
      const osc = ctx.createOscillator(); 
      const gain = ctx.createGain();
      osc.type = 'sawtooth'; 
      osc.frequency.setValueAtTime(44, ctx.currentTime);
      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      osc.connect(gain).connect(ctx.destination);
      osc.start(); 
      osc.stop(ctx.currentTime + 0.2);
    }
  }, []);

  useEffect(() => {
    let timer: number;
    const isCat = petType === PetType.CAT;
    if (status === PetStatus.EATING) {
      timer = window.setInterval(() => playInteractionSound('crunch', isCat), 600);
    } else if (status === PetStatus.DRINKING) {
      timer = window.setInterval(() => playInteractionSound('lap', isCat), 400);
    } else if (status === PetStatus.PETTING) {
      timer = window.setInterval(() => playInteractionSound('purr', isCat), 250);
    }
    return () => clearInterval(timer);
  }, [status, petType, playInteractionSound]);

  const executeAction = async (input: string, source: InteractionSource) => {
    try {
      const action = await actionProcessor.process(input, source, petType, stats);
      if (action) {
        setStatus(action.animation);
        setMessages(prev => [...prev, 
          { id: `u-${Date.now()}`, text: input, sender: 'user', timestamp: Date.now() },
          { id: `s-${Date.now()}`, text: action.chatMessage, sender: 'system', timestamp: Date.now() }
        ]);
        
        speak(action.voiceText, action.duration > 3000 ? action.duration - 2000 : 1000);

        setStats(prev => ({
          hunger: Math.min(100, Math.max(0, prev.hunger + (action.statUpdate.hunger || 0))),
          thirst: Math.min(100, Math.max(0, prev.thirst + (action.statUpdate.thirst || 0))),
          happiness: Math.min(100, Math.max(0, prev.happiness + (action.statUpdate.happiness || 0))),
          energy: Math.min(100, Math.max(0, prev.energy + (action.statUpdate.energy || 0)))
        }));

        if (action.animation === PetStatus.EATING || action.animation === PetStatus.DRINKING) {
          setIsThinking(true);
          const resp = await lumiService.sendMessage(input, petType);
          const sanitizedResp = lumiService.sanitize(resp, petType);
          setMessages(prev => [...prev, { id: `l-${Date.now()}`, text: sanitizedResp, sender: 'lumi', timestamp: Date.now() }]);
          setIsThinking(false);
        }
        setTimeout(() => setStatus(PetStatus.IDLE), action.duration);
        return true;
      }
    } catch (e) {
      setIsThinking(false);
    }
    return false;
  };

  const handleSendMessage = async (text: string) => {
    try {
      const handled = await executeAction(text, 'chat');
      if (handled) return;

      setMessages(prev => [...prev, { id: Date.now().toString(), text, sender: 'user', timestamp: Date.now() }]);
      setIsThinking(true);
      setStatus(PetStatus.THINKING);

      const resp = await lumiService.sendMessage(text, petType);
      const sanitizedResp = lumiService.sanitize(resp, petType);
      
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), text: sanitizedResp, sender: 'lumi', timestamp: Date.now() }]);
      speak(sanitizedResp);
    } catch (e) {
      const fallback = lumiService.getLocalFallback(text, petType);
      setMessages(prev => [...prev, { id: Date.now().toString(), text: fallback, sender: 'lumi', timestamp: Date.now() }]);
      speak(fallback);
    } finally {
      setIsThinking(false);
      setTimeout(() => setStatus(PetStatus.IDLE), 3000);
    }
  };

  const startActivity = (activity: string) => {
    setFollowUpChoices([]);
    switch(activity) {
      case 'Stress Ball':
        setStatus(PetStatus.SQUEEZING);
        const msgSB = "Let's release that frustration. Squeeze as hard as you can... and release. 🎾";
        setMessages(prev => [...prev, { id: Date.now().toString(), text: msgSB, sender: 'lumi', timestamp: Date.now() }]);
        speak(msgSB);
        setTimeout(() => setStatus(PetStatus.IDLE), 6000);
        break;
      case 'Breathing':
        setStatus(PetStatus.BREATHING);
        const msgB = "In... 2... 3... and Out... 2... 3... ✨";
        setMessages(prev => [...prev, { id: Date.now().toString(), text: msgB, sender: 'lumi', timestamp: Date.now() }]);
        speak(msgB);
        setTimeout(() => setStatus(PetStatus.IDLE), 8000);
        break;
      case 'Grounding':
        setStatus(PetStatus.GUIDING);
        const msgG = "Name 5 things you can see right now. Take your time. ☁️";
        setMessages(prev => [...prev, { id: Date.now().toString(), text: msgG, sender: 'lumi', timestamp: Date.now() }]);
        speak(msgG);
        break;
      case 'Happy Dance':
        setStatus(PetStatus.HAPPY);
        const msgHD = "*Excited wiggle* Life is good! You're doing amazing! ❤️";
        setMessages(prev => [...prev, { id: Date.now().toString(), text: msgHD, sender: 'lumi', timestamp: Date.now() }]);
        speak(msgHD);
        setTimeout(() => setStatus(PetStatus.IDLE), 3000);
        break;
      case 'Lullaby':
        setStatus(PetStatus.HUMMING);
        const msgL = "*Soft rhythmic humming* Go to sleep, little one... rest your mind. 🌙";
        setMessages(prev => [...prev, { id: Date.now().toString(), text: msgL, sender: 'lumi', timestamp: Date.now() }]);
        speak(msgL);
        setTimeout(() => setStatus(PetStatus.IDLE), 10000);
        break;
      case 'Task Breakdown':
        const msgTB = "Let's break it down into tiny pieces. What's the very first tiny step? ☁️";
        setMessages(prev => [...prev, { id: Date.now().toString(), text: msgTB, sender: 'lumi', timestamp: Date.now() }]);
        speak(msgTB);
        break;
      default:
        handleSendMessage(activity);
    }
  };

  const handleMoodSelect = (mood: Mood) => {
    setShowMoodPicker(false);
    setMoodHistory(prev => [...prev, { mood, timestamp: Date.now() }]);
    
    let petResponse = "";
    let choices: { text: string, action: () => void }[] = [];

    switch(mood) {
      case Mood.HAPPY:
        petResponse = "Yay! Let's celebrate! *happy dance* ❤️";
        choices = [
          { text: "Happy Dance!", action: () => startActivity("Happy Dance") },
          { text: "Snap a Memory", action: () => handleSendMessage("Let's take a photo!") },
          { text: "Share a win", action: () => handleSendMessage("I have good news!") }
        ];
        setStatus(PetStatus.HAPPY);
        break;
      case Mood.SAD:
        petResponse = "I'm here with you. *gentle nuzzle* How can I support you? ❤️";
        choices = [
          { text: "Just sit together", action: () => { setStatus(PetStatus.SITTING); handleSendMessage("Let's just sit"); } },
          { text: "Soft Hum", action: () => startActivity("Lullaby") },
          { text: "Gentle Nuzzle", action: () => executeAction("pet", "ui") }
        ];
        break;
      case Mood.FRUSTRATED:
        petResponse = "I feel that too sometimes... Let's release that heavy energy together. 😤";
        choices = [
          { text: "Squeeze Stress Ball", action: () => startActivity("Stress Ball") },
          { text: "Deep Breaths", action: () => startActivity("Breathing") },
          { text: "Calming Patterns", action: () => handleSendMessage("Show me something calm") }
        ];
        break;
      case Mood.TIRED:
        petResponse = "Rest is a productive activity. Let me help you unwind. 😴";
        choices = [
          { text: "Lullaby", action: () => startActivity("Lullaby") },
          { text: "Power Nap", action: () => { setStatus(PetStatus.SLEEPY); handleSendMessage("Let's sleep"); } },
          { text: "Gentle Sway", action: () => { setStatus(PetStatus.SITTING); handleSendMessage("Sway with me"); } }
        ];
        break;
      case Mood.OVERWHELMED:
        petResponse = "One thing at a time. I'm right here. Let's focus our minds. 😰";
        choices = [
          { text: "Task Breakdown", action: () => startActivity("Task Breakdown") },
          { text: "Grounding (5-4-3-2-1)", action: () => startActivity("Grounding") },
          { text: "Big Stretch", action: () => { setStatus(PetStatus.STRETCHING); handleSendMessage("Let's stretch"); } }
        ];
        break;
      case Mood.ANXIOUS:
        petResponse = "You're safe here. Everything is okay. I won't leave you. ✨";
        choices = [
          { text: "Safe Space Exercise", action: () => handleSendMessage("Describe a safe place") },
          { text: "Finger Tracing", action: () => handleSendMessage("Let's trace shapes") },
          { text: "Play a game", action: () => executeAction("play", "ui") }
        ];
        break;
      case Mood.NEUTRAL:
        petResponse = "That's perfectly okay. I'm happy just being in your company. ☁️";
        choices = [
          { text: "Check Journey", action: () => handleSendMessage("Show my history") },
          { text: "Just relax", action: () => handleSendMessage("Let's just be") },
          { text: "Quick Activity", action: () => executeAction("play", "ui") }
        ];
        break;
    }

    const userMsg = `I am feeling ${mood}.`;
    setMessages(prev => [...prev, 
      { id: `mood-${Date.now()}`, text: userMsg, sender: 'user', timestamp: Date.now() },
      { id: `resp-${Date.now()}`, text: petResponse, sender: 'lumi', timestamp: Date.now() }
    ]);
    speak(petResponse);
    setFollowUpChoices(choices);
    
    if (mood !== Mood.HAPPY && mood !== Mood.NEUTRAL) {
      setTimeout(() => setStatus(PetStatus.IDLE), 5000);
    }
  };

  useEffect(() => {
    const names = { [PetType.DOG]: "Buddy", [PetType.CAT]: "Luna" };
    const t = `Hello, I'm ${names[petType]}. I'm so happy you're here! ✨`;
    setMessages([{ id: 'greeting', text: t, sender: 'lumi', timestamp: Date.now() }]);
    setStatus(PetStatus.HAPPY);
    speak(t, 1000);
    
    setTimeout(() => {
      const q = "How are you feeling today?";
      setMessages(prev => [...prev, { id: 'mood-prompt', text: q, sender: 'lumi', timestamp: Date.now() }]);
      speak(q);
      setShowMoodPicker(true);
      setStatus(PetStatus.IDLE);
    }, 3000);
  }, [petType]);

  return (
    <div className="relative w-full h-screen overflow-hidden gradient-bg flex flex-col items-center p-4 md:p-6 touch-none">
      <div className="z-10 w-full max-w-5xl flex justify-between items-center mb-4">
        <div className="bg-white/80 backdrop-blur-2xl p-1.5 rounded-full border-2 border-white shadow-lg flex gap-1">
          <button onClick={() => setPetType(PetType.DOG)} className={`p-2 rounded-full transition-all ${petType === PetType.DOG ? 'bg-amber-500 text-white shadow-md' : 'text-slate-600'}`}><Footprints size={18}/></button>
          <button onClick={() => setPetType(PetType.CAT)} className={`p-2 rounded-full transition-all ${petType === PetType.CAT ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600'}`}><Moon size={18}/></button>
        </div>
      </div>

      <div className="flex-1 w-full max-w-6xl flex flex-col lg:flex-row items-center justify-center gap-4 relative px-4">
        <div className="flex flex-col items-center lg:w-[40%] flex-shrink-0">
          <div className="w-full max-w-xs grid grid-cols-2 gap-3 mb-6 bg-white/40 p-4 rounded-3xl border-2 border-white backdrop-blur-md">
            <StatBar label="Hunger" value={stats.hunger} color="bg-orange-400" />
            <StatBar label="Thirst" value={stats.thirst} color="bg-blue-400" />
            <StatBar label="Happy" value={stats.happiness} color="bg-rose-400" />
            <StatBar label="Energy" value={stats.energy} color="bg-emerald-400" />
          </div>

          <div className="relative mb-4 transition-all hover:scale-105">
            <PetAvatar type={petType} status={status} onClick={() => executeAction('pet', 'ui')} />
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            <ActionButton icon={<Utensils size={18}/>} label="Feed" onClick={() => executeAction('feed', 'ui')} color="bg-orange-50 text-orange-600 ring-orange-100" />
            <ActionButton icon={<Droplets size={18}/>} label="Water" onClick={() => executeAction('water', 'ui')} color="bg-blue-50 text-blue-600 ring-blue-100" />
            <ActionButton icon={<Gamepad2 size={18}/>} label="Play" onClick={() => executeAction('play', 'ui')} color="bg-purple-50 text-purple-600 ring-purple-100" />
            <ActionButton icon={<Heart size={18}/>} label="Pet" onClick={() => executeAction('pet', 'ui')} color="bg-rose-50 text-rose-600 ring-rose-100" />
          </div>
        </div>

        <div className="w-full lg:w-[50%] max-lg:hidden max-w-lg h-[500px]">
          <ChatWindow 
            messages={messages} 
            onSendMessage={handleSendMessage} 
            isThinking={isThinking} 
            petName={petType === PetType.DOG ? "Buddy" : "Luna"} 
            showMoodPicker={showMoodPicker}
            onMoodSelect={handleMoodSelect}
            followUpChoices={followUpChoices}
            moodHistory={moodHistory}
          />
        </div>
      </div>
      
      <div className="mb-2 text-[10px] font-black tracking-[0.4em] uppercase opacity-30">PausePaws Sanctuary</div>
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
  <button onClick={onClick} className={`${color} p-3 rounded-3xl flex flex-col items-center gap-1 hover:scale-110 transition-all shadow-md border-2 border-white ring-2 select-none`}>
    {icon}<span className="text-[8px] font-black uppercase tracking-tighter">{label}</span>
  </button>
);

export default App;
