
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
  return (
    <div className={`flex items-center select-none ${className}`}>
      <img 
        src="/ocean-logo.png" 
        alt="Ocean Group" 
        className={`h-full w-auto object-contain transition-all duration-300 scale-[1.35] origin-left ${variant === 'white' ? 'brightness-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]' : ''}`} 
      />
    </div>
  );
};
