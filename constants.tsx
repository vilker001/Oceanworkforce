
import React from 'react';

export const COLORS = {
  primary: '#0056b3',
  secondary: '#1f7693',
  success: '#078836',
  warning: '#e6a23c',
  danger: '#cf4444',
};

export const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?background=0D8ABC&color=fff&name=User';

// Removed random AVATARS array as per user request to enforce manual upload or generic fallback

export const TEAM_MEMBERS = [
  {
    id: '1',
    name: 'Sarah Chen',
    role: 'UX Designer Sênior',
    email: 'sarah.chen@oceangroup.com',
    phone: '+258 84 123 4567',
    avatar: DEFAULT_AVATAR,
    level: 12,
    xp: 2450,
    badges: ['Top Performer', 'Design Guru', 'Team Player'],
    metrics: {
      completed: 45,
      pending: 12,
      missed: 3,
      objectivesMet: 142,
      totalObjectives: 150,
      kpis: [
        { name: 'Qualidade', score: 95 },
        { name: 'Velocidade', score: 88 },
        { name: 'Pontualidade', score: 92 },
      ],
      clients: ['Acme Corp', 'Solaris Systems', 'Tech Nova'],
    }
  },
  {
    id: '2',
    name: 'Carlos Lima',
    role: 'Desenvolvedor Fullstack',
    email: 'carlos.lima@oceangroup.com',
    phone: '+258 82 987 6543',
    avatar: DEFAULT_AVATAR,
    level: 8,
    xp: 1200,
    badges: ['Code Master', 'Fast Learner'],
    metrics: {
      completed: 38,
      pending: 18,
      missed: 8,
      objectivesMet: 95,
      totalObjectives: 130,
      kpis: [
        { name: 'Qualidade', score: 82 },
        { name: 'Velocidade', score: 94 },
        { name: 'Pontualidade', score: 75 },
      ],
      clients: ['Oceanic Logistics', 'Beta Traders'],
    }
  },
  {
    id: '3',
    name: 'Ana Silva',
    role: 'Social Media Manager',
    email: 'ana.silva@oceangroup.com',
    phone: '+258 85 555 0199',
    avatar: DEFAULT_AVATAR,
    level: 15,
    xp: 3100,
    badges: ['Engagement Star', 'Creative Mind', 'Problem Solver'],
    metrics: {
      completed: 52,
      pending: 5,
      missed: 1,
      objectivesMet: 180,
      totalObjectives: 190,
      kpis: [
        { name: 'Engajamento', score: 91 },
        { name: 'Criatividade', score: 96 },
        { name: 'Resposta', score: 89 },
      ],
      clients: ['Hotel Polana', 'Mcel-TMcel', 'BIM'],
    }
  },
];

export const Logo: React.FC<{ className?: string; variant?: 'white' | 'black' }> = ({ className = "h-8", variant = 'black' }) => {
  const textColor = variant === 'white' ? '#FFFFFF' : '#000000';

  return (
    <div className={`flex items-center select-none ${className}`}>
      <svg viewBox="0 0 320 80" className="h-full w-auto" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="oceanWaveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: '#00adef', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#0056b3', stopOpacity: 1 }} />
          </linearGradient>
        </defs>
        {/* Texto OCEAN */}
        <text x="5" y="55" style={{ font: '800 58px Manrope, sans-serif', letterSpacing: '-3px' }} fill={textColor}>
          OCEAN
        </text>
        {/* Texto GROUP */}
        <text x="145" y="76" style={{ font: '700 18px Manrope, sans-serif', letterSpacing: '9px' }} fill={textColor}>
          GROUP
        </text>
        {/* Ondas estilizadas conforme o logo fornecido */}
        <path d="M5 52 Q 40 35, 90 52 T 180 52" stroke="url(#oceanWaveGrad)" strokeWidth="7" fill="none" strokeLinecap="round" />
        <path d="M10 62 Q 45 45, 95 62 T 185 62" stroke="#00adef" strokeWidth="4" fill="none" opacity="0.5" strokeLinecap="round" />
      </svg>
    </div>
  );
};
