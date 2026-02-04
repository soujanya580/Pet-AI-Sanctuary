
import React, { useEffect, useState, useRef } from 'react';
import { PetStatus, PetType } from '../types';

interface PetAvatarProps {
  status: PetStatus;
  type: PetType;
  onClick: () => void;
  externalPointer?: { x: number; y: number } | null;
}

export const PetAvatar: React.FC<PetAvatarProps> = ({ status, type, onClick, externalPointer }) => {
  const [pettingIntensity, setPettingIntensity] = useState(0);
  const [irisOffset, setIrisOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const [wagAngle, setWagAngle] = useState(0);
  const [earBounce, setEarBounce] = useState(0);

  const [actionFrame, setActionFrame] = useState(0); 
  const [droplets, setDroplets] = useState<{id: number, x: number, y: number, vx: number, vy: number, life: number}[]>([]);
  const [crumbs, setCrumbs] = useState<{id: number, x: number, y: number, vx: number, vy: number, life: number, rot: number}[]>([]);

  useEffect(() => {
    const isActionActive = status === PetStatus.EATING || status === PetStatus.DRINKING;
    if (isActionActive) return;

    if (externalPointer && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = (externalPointer.x - centerX) / (rect.width / 2);
      const dy = (externalPointer.y - centerY) / (rect.height / 2);
      setIrisOffset({
        x: Math.max(-10, Math.min(10, dx * 10)),
        y: Math.max(-10, Math.min(10, dy * 10))
      });
    } else {
      setIrisOffset({ x: 0, y: 0 });
    }
  }, [externalPointer, status]);

  useEffect(() => {
    const animate = (time: number) => {
      const deltaTime = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;
      setPettingIntensity(prev => Math.max(0, prev - deltaTime * 0.4));

      const isActive = (status === PetStatus.HAPPY || status === PetStatus.EATING || status === PetStatus.DRINKING);
      
      const baseSpeed = isActive ? 10 : 3;
      const speedMult = 1 + pettingIntensity * 3;
      const amplitude = status === PetStatus.HAPPY ? 45 : (15 + pettingIntensity * 50);
      setWagAngle(Math.sin(time * 0.005 * baseSpeed * speedMult) * amplitude);
      
      // Ears bounce slightly in opposite phase or just standard wiggle
      setEarBounce(Math.sin(time * 0.008 * (isActive ? 2 : 1)) * (isActive ? 8 : 2));

      if (status === PetStatus.DRINKING || status === PetStatus.EATING) {
        setActionFrame(prev => (prev + 1) % 1200);
        if (status === PetStatus.DRINKING && actionFrame % 30 === 0) {
          setDroplets(prev => [...prev, { id: Math.random(), x: 100 + (Math.random() - 0.5) * 20, y: 170, vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 2, life: 1.0 }].slice(-15));
        }
        if (status === PetStatus.EATING && actionFrame % 25 === 0) {
          setCrumbs(prev => [...prev, { id: Math.random(), x: 100 + (Math.random() - 0.5) * 35, y: 160, vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 1.5, life: 1.0, rot: Math.random() * 360 }].slice(-15));
        }
      } else {
        setActionFrame(0);
      }

      setDroplets(prev => prev.map(d => ({ ...d, x: d.x + d.vx, y: d.y + d.vy + 0.15, life: d.life - 0.04 })).filter(d => d.life > 0));
      setCrumbs(prev => prev.map(c => ({ ...c, x: c.x + c.vx, y: c.y + c.vy + 0.25, life: c.life - 0.02, rot: c.rot + 10 })).filter(c => c.life > 0));

      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [status, type, actionFrame, pettingIntensity]);

  let headY = 0, jawGap = 0, noseJitter = 0, eyeSquint = 1;
  if (status === PetStatus.EATING || status === PetStatus.DRINKING) {
    const cycle = actionFrame % 45;
    if (cycle < 15) { headY = (cycle/15) * 10; eyeSquint = 0.8; }
    else if (cycle < 30) { headY = 10; jawGap = ((cycle-15)/15) * 8; eyeSquint = 0.3; }
    else { headY = (1 - (cycle-30)/15) * 10; eyeSquint = 0.9; }
  }
  
  noseJitter = Math.sin(performance.now() * 0.012) * 1.5;

  const isDog = type === PetType.DOG;
  const isCat = type === PetType.CAT;

  return (
    <div ref={containerRef} className="relative cursor-pointer transition-all transform touch-none select-none flex items-center justify-center" onClick={onClick}>
      <div className="absolute inset-0 pointer-events-none z-50">
        {droplets.map(d => <div key={d.id} className="absolute w-2 h-2 bg-blue-300/60 rounded-full blur-[1px]" style={{ left: `${d.x}px`, top: `${d.y}px`, opacity: d.life }} />)}
        {crumbs.map(c => <div key={c.id} className="absolute w-2 h-2 bg-amber-900/60 rounded-sm" style={{ left: `${c.x}px`, top: `${c.y}px`, opacity: c.life, transform: `rotate(${c.rot}deg)` }} />)}
      </div>

      <svg viewBox="0 0 200 200" className="w-72 h-72 drop-shadow-[0_25px_25px_rgba(0,0,0,0.15)] overflow-visible">
        {/* Ground Shadow */}
        <ellipse cx="100" cy="188" rx="65" ry="10" fill="rgba(0,0,0,0.06)" />
        
        {/* Interaction Elements */}
        {(status === PetStatus.EATING || status === PetStatus.DRINKING) && (
          <g transform="translate(55, 172)">
            <ellipse cx="45" cy="12" rx="42" ry="16" fill="#E2E8F0" />
            <ellipse cx="45" cy="8" rx="35" ry="11" fill={status === PetStatus.DRINKING ? "#0EA5E9" : "#78350F"} />
          </g>
        )}

        <g style={{ transform: `scale(${1 + pettingIntensity * 0.05})`, transformOrigin: 'center 160px' }}>
          
          {/* Tail Layer (behind body) */}
          <g style={{ transform: `rotate(${wagAngle}deg)`, transformOrigin: isDog ? '130px 145px' : '125px 145px' }}>
             {isDog ? (
               <g>
                 <path d="M130,145 Q170,135 160,95" stroke="#C68B59" strokeWidth="16" strokeLinecap="round" fill="none" />
                 <circle cx="160" cy="95" r="10" fill="#C68B59" />
               </g>
             ) : (
               <path d="M125,145 C150,140 180,120 160,70" stroke="#94A3B8" strokeWidth="10" strokeLinecap="round" fill="none" />
             )}
          </g>

          {/* Main Pet Body and Head Group */}
          <g style={{ transform: `translate(0, ${headY}px)` }}>
            
            {/* Ears Layer */}
            {isDog ? (
              <g>
                {/* Left Ear - Upright/Upside like cat */}
                <g style={{ transform: `rotate(${-earBounce * 0.8}deg)`, transformOrigin: '45px 85px' }}>
                  <path d="M45,85 L30,35 Q55,25 80,75 Z" fill="#C68B59" />
                  <path d="M50,80 L42,50 Q52,42 70,72 Z" fill="#A0522D" opacity="0.2" />
                </g>
                {/* Right Ear - Upright/Upside like cat */}
                <g style={{ transform: `rotate(${earBounce * 0.8}deg)`, transformOrigin: '155px 85px' }}>
                  <path d="M155,85 L170,35 Q145,25 120,75 Z" fill="#C68B59" />
                  <path d="M150,80 L158,50 Q148,42 130,72 Z" fill="#A0522D" opacity="0.2" />
                </g>
              </g>
            ) : (
              <g>
                <path d="M45,85 L25,40 L85,75 Z" fill="#94A3B8" style={{ transform: `rotate(${-earBounce * 0.5}deg)`, transformOrigin: '45px 85px' }} /> {/* Left Pointy */}
                <path d="M155,85 L175,40 L115,75 Z" fill="#94A3B8" style={{ transform: `rotate(${earBounce * 0.5}deg)`, transformOrigin: '155px 85px' }} /> {/* Right Pointy */}
                <path d="M45,85 L35,55 L75,75 Z" fill="#64748B" opacity="0.3" style={{ transform: `rotate(${-earBounce * 0.5}deg)`, transformOrigin: '45px 85px' }} />
                <path d="M155,85 L165,55 L125,75 Z" fill="#64748B" opacity="0.3" style={{ transform: `rotate(${earBounce * 0.5}deg)`, transformOrigin: '155px 85px' }} />
              </g>
            )}

            {/* Torso/Head Body */}
            <circle cx="100" cy="120" r="75" fill={isDog ? "#F5D6B8" : "#CBD5E1"} />
            
            {/* Soft Belly/Muzzle Area */}
            <ellipse cx="100" cy="138" rx="28" ry="20" fill={isDog ? "#FAE8D0" : "#F1F5F9"} opacity="0.6" />

            {/* Eyes */}
            <g style={{ transform: `scaleY(${eyeSquint})`, transformOrigin: 'center 105px' }}>
              <circle cx="68" cy="105" r="11" fill="#0F172A" />
              <circle cx="132" cy="105" r="11" fill="#0F172A" />
              <circle cx="65" cy="100" r="4" fill="white" style={{ transform: `translate(${irisOffset.x * 0.4}px, ${irisOffset.y * 0.4}px)` }} />
              <circle cx="129" cy="100" r="4" fill="white" style={{ transform: `translate(${irisOffset.x * 0.4}px, ${irisOffset.y * 0.4}px)` }} />
              <circle cx="72" cy="110" r="1.5" fill="white" opacity="0.4" />
              <circle cx="136" cy="110" r="1.5" fill="white" opacity="0.4" />
            </g>

            {/* Nose & Mouth area */}
            <g style={{ transform: `translate(0, ${noseJitter}px)` }}>
              <ellipse cx="100" cy="132" rx="8" ry="5.5" fill="#0F172A" />
              <path d="M90,145 Q100,152 110,145" fill="none" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
              {isCat && (
                <g opacity="0.4">
                  <path d="M70,135 L40,130" stroke="#0F172A" strokeWidth="1" />
                  <path d="M70,140 L40,145" stroke="#0F172A" strokeWidth="1" />
                  <path d="M130,135 L160,130" stroke="#0F172A" strokeWidth="1" />
                  <path d="M130,140 L160,145" stroke="#0F172A" strokeWidth="1" />
                </g>
              )}
            </g>

            {/* Mouth Gap for Eating/Drinking */}
            {jawGap > 0 && <ellipse cx="100" cy={148 + jawGap} rx="16" ry={jawGap} fill="#451A03" />}
          </g>
        </g>
      </svg>
    </div>
  );
};
