
export enum View {
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD',
  CALENDAR = 'CALENDAR',
  KPI_SETUP = 'KPI_SETUP',
  CLIENTS = 'CLIENTS',
  KANBAN = 'KANBAN',
  FINANCE = 'FINANCE',
  TEAM = 'TEAM',
  SETTINGS = 'SETTINGS',
  PROJECTS = 'PROJECTS',
  TRADING = 'TRADING',
  PHOTO_SESSIONS = 'PHOTO_SESSIONS',
  RANKING = 'RANKING',
  USER_MANAGEMENT = 'USER_MANAGEMENT',
  SERVICE_CATALOG = 'SERVICE_CATALOG',
  INVOICE_NEW = 'INVOICE_NEW',
  INVOICE_HISTORY = 'INVOICE_HISTORY',
  DAILY_REPORTS = 'DAILY_REPORTS',
}

export type UserRole =
  | 'Gestor de Projetos'
  | 'Gestor Técnico'
  | 'Gestor de Trading'
  | 'Fotógrafo'
  | 'Promotor de Venda'
  | 'Colaborador';

export interface User {
  id?: string;
  name: string;
  role: UserRole;
  avatar: string;
  email?: string;
  employeeId?: string;
  phone?: string;
  birthDate?: string;
  gender?: string;
  must_change_password?: boolean;
  is_blocked?: boolean;
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
  responsible_id?: string;
  startDate: string;
  dueDate: string;
  objectives: TaskObjective[];
  completionReport?: string;
  managerFeedback?: string;
  isLate?: boolean;
  relevance: number; // 1 to 5
  delegated_by?: string;
  delegated_by_name?: string;
  urgency?: 'Baixa' | 'Média' | 'Alta' | 'Crítica';
  completed_at?: string;
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
  companyName?: string;
  businessValue?: number;
  internalContact?: string;
  internalContactPhone?: string;
  internalContactRole?: string;
  clientResponsibleName?: string;
  clientResponsiblePhone?: string;
  status: ClientStatus;
  responsible: string;
  responsible_id?: string;
  services: string[];
  location: 'Maputo Cidade' | 'Maputo Província' | 'Outro';
  provenance: 'Redes Sociais' | 'Google' | 'Recomendação' | 'Evento' | 'Outro';
  lastActivity: string;
  initials: string;
  nextFollowUpDate?: string;
  nuit?: string;
}

export interface FollowUp {
  id: string;
  client_id: string;
  notes: string;
  current_stage: string;
  advances_funnel: boolean;
  next_follow_up_date: string;
  created_by?: string;
  created_at: string;
}

export type EventType = 'Reunião' | 'Feriado' | 'Folga' | 'Geral' | 'Etapa de Projeto' | 'Sessão de Foto' | 'Tarefa';

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
  employeeId?: string;
  birthDate?: string;
  gender?: string;
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
    kpis: { name: string; score: number; target?: number }[];
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

// ========================
// PROJECTS
// ========================
export interface ProjectObjective {
  text: string;
  completed: boolean;
}

export interface ProjectStage {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  objectives: ProjectObjective[];
  start_date: string;
  due_date: string;
  status: 'A Fazer' | 'Em Progresso' | 'Concluido';
  relevance: number;
  completed_at?: string;
  responsible_id?: string;
  responsible_name?: string;
  delegated_by?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  type: 'interno' | 'externo';
  client_id?: string;
  client_name?: string;
  status: 'Ativo' | 'Concluido';
  completion_report?: any;
  completed_at?: string;
  created_at: string;
  stages?: ProjectStage[];
}

// ========================
// PHOTO SESSIONS
// ========================
export interface ServiceCatalogItem {
  id: string;
  catalog_type: 'BMS Studio' | 'Ocean Group';
  name: string;
  description?: string;
  price_mt: number;
}

export interface PhotoSession {
  id: string;
  service_type: string;
  location_type: 'estúdio' | 'exterior';
  date: string;
  time: string;
  duration_estimated: string;
  client_name: string;
  client_phone: string;
  price_mt: number;
  notes?: string;
  status: 'Agendada' | 'Executada';
  photographer_id?: string;
  photographer_name?: string;
  created_at: string;
}

// ========================
// TRADING
// ========================
export interface TradingTrade {
  id: string;
  asset: string;
  lot: number;
  stop_loss_usd: number;
  take_profit_usd: number;
  open_date: string;
  close_date?: string;
  pre_trade_notes?: string;
  result?: 'positivo' | 'negativo';
  realized_usd?: number;
  observation?: string;
  classification?: 'dentro do plano' | 'fora do plano' | 'violação de regras';
  exchange_rate: number;
  created_by?: string;
  created_at: string;
}

// ========================
// GAMIFICATION
// ========================
export interface XpHistoryEntry {
  id: string;
  user_id: string;
  xp_amount: number;
  reason: string;
  created_at: string;
}

export interface TeamGoal {
  id: string;
  month: string; // 'YYYY-MM'
  target_xp: number;
  current_xp: number;
  achieved: boolean;
}

export interface MonthlyTitle {
  id: string;
  month: string;
  title_type: string;
  user_id: string;
  user_name?: string;
  xp_awarded: number;
}

// ========================
// SETTINGS
// ========================
export interface SystemSettings {
  id: string;
  exchange_rate: number;
}

export interface FixedExpense {
  id: string;
  name: string;
  value_mt: number;
}

export interface UserKpi {
  id: string;
  user_id: string;
  kpi_name: string;
  target_score: number;
  last_updated: string;
}

// ========================
// INVOICING
// ========================
export interface CompanyProfile {
  id: string;
  nome: string;
  nuit: string;
  contacto: string;
  endereco: string;
  instagram?: string;
  logo_url?: string;
  forma_pagamento_titulo?: string;
  banco?: string;
  nib?: string;
}

export interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  descricao: string;
  quantidade: number;
  preco_unitario: number;
  total_linha: number;
}

export interface Invoice {
  id: string;
  codigo: string;
  client_id: string;
  client_name?: string; // from join
  emitido_por: string;
  emitido_por_nome?: string; // from join
  data_emissao: string;
  subtotal: number;
  iva: number;
  total: number;
  estado: 'emitida' | 'paga' | 'anulada';
  pdf_url?: string;
  forma_pagamento?: string;
  validade_dias?: number;
  created_at?: string;
  items?: InvoiceItem[];
}

// ========================
// DAILY REPORTS
// ========================
export interface DailyReport {
  id: string;
  user_id: string;
  date: string;
  description: string;
  hours_dedicated: number;
  expected_output: string;
  manager_feedback?: string;
  created_at: string;
  updated_at: string;
  user_name?: string; // from join
}
