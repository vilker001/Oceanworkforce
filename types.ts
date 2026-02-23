
export enum View {
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD',
  CALENDAR = 'CALENDAR',
  KPI_SETUP = 'KPI_SETUP',
  CLIENTS = 'CLIENTS',
  KANBAN = 'KANBAN',
  FINANCE = 'FINANCE',
  TEAM = 'TEAM'
}

export type UserRole =
  | 'Gestor de Projectos'
  | 'Gestor Criativo'
  | 'Gestor de Parceiros e Clientes'
  | 'Gestor de Trading e Negociação'
  | 'Designer'
  | 'Promoter de Venda'
  | 'Videomaker'
  | 'Colaborador';

export interface User {
  name: string;
  role: UserRole;
  avatar: string;
}

export interface TaskObjective {
  text: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  project: string;
  status: 'Backlog' | 'ToDo' | 'InProgress' | 'Review' | 'Done';
  priority: 'BAIXA' | 'MÉDIA' | 'ALTA' | 'CRÍTICA';
  responsible: string;
  startDate: string;
  dueDate: string;
  objectives: TaskObjective[];
  completionReport?: string;
  managerFeedback?: string;
}

export type ClientStatus =
  | 'Novo Lead'
  | 'Em Contacto'
  | 'Proposta Enviada'
  | 'Consultoria Marcada'
  | 'Convertido'
  | 'Repescagem'
  | 'Perdido';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  companyPhone?: string;
  internalContact?: string;
  internalContactPhone?: string;
  internalContactRole?: string;
  clientResponsibleName?: string;
  clientResponsiblePhone?: string;
  status: ClientStatus;
  responsible: string;
  services: string[];
  location: 'Maputo Cidade' | 'Maputo Província';
  provenance: 'Redes Sociais' | 'Google' | 'Andando pela cidade' | 'Recomendação' | 'Outro';
  lastActivity: string;
  initials: string;
}

export type EventType = 'Reunião' | 'Feriado' | 'Folga' | 'Geral';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: EventType;
  description?: string;
  creatorName?: string;
}

export interface KPI {
  id: string;
  name: string;
  selected: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  avatar: string;
  level: number;
  xp: number;
  badges: string[];
  metrics: {
    completed: number;
    pending: number;
    missed: number;
    objectivesMet: number;
    totalObjectives: number;
    kpis: { name: string; score: number }[];
    clients: string[];
  };
}

export interface Transaction {
  id: string;
  desc: string;
  date: string;
  cat: string;
  val: number;
  type: 'income' | 'expense' | 'investment';
  status: 'Pago' | 'Pendente' | 'Recebido';
}
