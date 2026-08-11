
import React, { useState, useEffect } from 'react';
import { View, User, UserRole } from './types';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Login } from './components/views/Login';
import { Dashboard } from './components/views/Dashboard';
import { Clients } from './components/views/Clients';
import { Kanban } from './components/views/Kanban';
import { Calendar } from './components/views/Calendar';
import { KpiDashboard } from './components/views/KpiDashboard';
import { FinancialManagement } from './components/views/FinancialManagement';
import { TeamPerformance } from './components/views/TeamPerformance';
import { OnboardingWizard } from './components/views/OnboardingWizard';
import { ChangePassword } from './components/views/ChangePassword';
import { Projects } from './components/views/Projects';
import { PhotoSessions } from './components/views/PhotoSessions';
import { Trading } from './components/views/Trading';
import { Ranking } from './components/views/Ranking';
import { UserManagement } from './components/views/UserManagement';
import { Settings } from './components/views/Settings';
import { ServiceCatalog } from './components/views/ServiceCatalog';
import { InvoiceNew } from './components/views/InvoiceNew';
import { InvoiceHistory } from './components/views/InvoiceHistory';
import { DailyReports } from './components/views/DailyReports';


import { DEFAULT_AVATAR } from './constants';
import { supabase } from './src/lib/supabase';
import { useTasks } from './src/hooks/useTasks';
import { useClients } from './src/hooks/useClients';
import { useEvents } from './src/hooks/useEvents';
import { useTransactions } from './src/hooks/useTransactions';
import { useTeam } from './src/hooks/useTeam';
import { notificationService, NotificationService } from './src/services/notificationService';
import { ToastProvider, useToast } from './components/ui/Toast';
import { GlobalNotificationListener } from './components/GlobalNotificationListener';

const GlobalAlertOverride = () => {
  const { showToast } = useToast();
  useEffect(() => {
    window.alert = (msg: string) => {
      const type = msg.toLowerCase().includes('erro') || msg.toLowerCase().includes('falha') ? 'error' : 'info';
      showToast(type, msg, 5000);
    };
  }, [showToast]);
  return null;
};

const App: React.FC = () => {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // Navigation State
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);

  // Hooks
  const tasksHook = useTasks();
  const clientsHook = useClients();
  const eventsHook = useEvents();
  const transactionsHook = useTransactions();
  const teamHook = useTeam();

  const userRef = React.useRef<User | null>(null);
  const isMounted = React.useRef(true);
  const isFetchingProfile = React.useRef(false);

  // --- CORE AUTH LOGIC ---

  useEffect(() => {
    isMounted.current = true;
    checkAuthStatus();

    // Safety Timeouts
    const loadingTimeout = setTimeout(() => {
      // Only force recovery if stuck for 20s
      setLoading(prev => {
        if (prev) console.warn('App: Loading took too long, forcing recovery...');
        return false;
      });
    }, 20000); // 20 seconds max load time

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('App: Auth Event ->', event);

      if (!isMounted.current) return;

      if (event === 'SIGNED_IN' && session) {
        // Only trigger profile load if we don't have a user yet
        if (!userRef.current) {
          await loadProfile(session.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        resetState();
      }
    });

    return () => {
      isMounted.current = false;
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  // Refetch all hooks when user authenticates
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('App: User authenticated, refetching all data hooks...');
      tasksHook.refetch();
      clientsHook.refetch();
      eventsHook.refetch();
      transactionsHook.refetch();
      teamHook.refetch();
    }
  }, [isAuthenticated]);

  const resetState = () => {
    notificationService.stop();
    setIsAuthenticated(false);
    setUser(null);
    setNeedsOnboarding(false);
    setLoading(false);
    setCurrentView(View.DASHBOARD);
  };

  const checkAuthStatus = async () => {
    try {
      console.log('App: Checking session...');
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        console.log('App: No session found.');
        resetState();
        return;
      }

      console.log('App: Session found for', session.user.id);
      await loadProfile(session.user.id);

    } catch (err) {
      console.error('App: Session check failed', err);
      resetState();
    }
  };

  const loadProfile = async (userId: string) => {
    if (isFetchingProfile.current) {
      console.log('App: Profile already being fetched, skipping duplicate call.');
      return;
    }
    isFetchingProfile.current = true;
    console.log('App: Loading profile for', userId);
    setLoading(true);

    try {
      // 1. Fetch Profile with Timeout
      // Wrap the promise to enforce a 5s timeout
      const profilePromise = supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Profile load timed out')), 5000)
      );

      const { data: profile, error } = await Promise.race([profilePromise, timeoutPromise]) as any;

      if (error) {
        console.error('App: Profile fetch error', error);
        throw error;
      }

      // 2. Determine State
      if (profile) {
        console.log('App: Profile found');
        const p = profile as any;
        const rawRole = (p.role || 'Colaborador') as string;
        let normalizedRole = rawRole as UserRole;
        if (rawRole.toLowerCase().includes('projeto') || rawRole.toLowerCase().includes('projecto')) {
          normalizedRole = 'Gestor de Projetos';
        }

        const userData: User = {
          id: p.id,
          name: p.name || '',
          role: normalizedRole,
          avatar: p.avatar || DEFAULT_AVATAR,
          email: p.email || '',
          must_change_password: p.must_change_password ?? false,
          phone: p.phone,
          employeeId: p.employee_id,
          birthDate: p.birth_date,
          gender: p.gender
        };
        setUser(userData);
        userRef.current = userData;
        setIsAuthenticated(true);
        setNeedsOnboarding(false);

        // Start notification service for this user
        notificationService.start();
      } else {
        console.log('App: Profile missing -> Needs Onboarding');
        setIsAuthenticated(true); // Valid session
        setUser(null); // No profile data yet
        userRef.current = null;
        setNeedsOnboarding(true);
      }

    } catch (err) {
      console.error('App: Unexpected error loading profile', err);
      // Fallback: allow retry or onboarding effect
      setIsAuthenticated(true);
      setNeedsOnboarding(true);
    } finally {
      isFetchingProfile.current = false;
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  // --- HANDLERS ---

  const handleLoginSuccess = async (loginData?: { needsOnboarding?: boolean }) => {
    console.log('App: Handle Login Success', loginData);

    // If login component explicitly tells us new user (registration), show onboarding
    if (loginData?.needsOnboarding) {
      setIsAuthenticated(true);
      setNeedsOnboarding(true);
      setLoading(false);
      return;
    }

    // Otherwise, we re-run the full check to be sure
    await checkAuthStatus();
  };

  const handleFinishOnboarding = async (data: { role: UserRole; avatar: string; kpis: string[]; name: string; phone?: string; birthDate?: string; gender?: string; employeeId?: string }) => {
    console.log('App: Finishing Onboarding...', data);
    setLoading(true);

    try {
      // Retry getting auth user up to 3 times with 1s delay
      let authUser = null;
      for (let i = 0; i < 3; i++) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          authUser = user;
          break;
        }
        console.log(`Attempt ${i + 1}: No auth user yet, waiting...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (!authUser) {
        throw new Error('Não foi possível obter o usuário autenticado. Por favor, faça login novamente.');
      }

      console.log('Auth user found:', authUser.id);

      // Use DEFAULT_AVATAR if no avatar provided
      const avatarToUse = data.avatar || DEFAULT_AVATAR;

      // 1. Try to Insert Profile
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: authUser.id,
          email: authUser.email!,
          name: data.name,
          role: data.role,
          avatar: avatarToUse,
          phone: data.phone,
          birth_date: data.birthDate,
          gender: data.gender,
          employee_id: data.employeeId
        } as any);

      if (insertError) {
        // If error is duplicate key (23505), it means profile exists but wasn't loaded
        if (insertError.code === '23505') {
          console.warn('App: Profile already exists (duplicate key), attempting to load existing profile...');
          // Fall through to verification which will load the profile
        } else {
          console.error('Insert error:', insertError);
          throw insertError;
        }
      }

      // 2. Strict Verification/Loading: Read it back
      const { data: verifyProfile, error: verifyError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (verifyError || !verifyProfile) {
        throw new Error('Profile verification failed after insert/check');
      }

      // 3. Update State
      const vp = verifyProfile as any;

      // If we recovered from a duplicate key, we might want to update the profile with new data
      // avoiding overwriting if it was a race condition, but ensuring the user gets the role they selected if it was empty
      if (!vp.role || vp.role !== data.role) {
        // Use 'as any' to avoid strict type issues during this hotfix
        await supabase.from('users').update({
          role: data.role,
          name: data.name,
          avatar: avatarToUse
        } as any).eq('id', authUser.id);

        vp.role = data.role;
        vp.name = data.name;
        vp.avatar = avatarToUse;
      }

      setUser({
        name: vp.name,
        role: vp.role as UserRole,
        avatar: vp.avatar || DEFAULT_AVATAR
      });
      setNeedsOnboarding(false);
      setCurrentView(View.DASHBOARD);

    } catch (err: any) {
      console.error('App: Onboarding failed', err);
      const errorMessage = err.message || 'Erro desconhecido';
      alert(`Erro ao salvar perfil: ${errorMessage}\n\nDetalhes: ${JSON.stringify(err, null, 2)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    resetState();
  };

  const handleUpdateAvatar = (newAvatar: string, newName: string) => {
    if (user) {
      setUser({ ...user, avatar: newAvatar, name: newName });
    }
  };

  // --- RENDERING ---

  // 1. Loading Spinner (Global)
  const [showLoadingButton, setShowLoadingButton] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (loading) {
      timer = setTimeout(() => setShowLoadingButton(true), 5000);
    } else {
      setShowLoadingButton(false);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-zinc-900 gap-6">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
        {showLoadingButton && (
          <div className="flex flex-col items-center gap-2 animate-in fade-in zoom-in duration-500">
            <p className="text-zinc-500 text-sm">O carregamento está demorando mais que o esperado...</p>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors border border-zinc-200 dark:border-zinc-700"
            >
              Forçar Recarregamento
            </button>
          </div>
        )}
      </div>
    );
  }

  // 2. Not Authenticated -> Login
  if (!isAuthenticated) {
    return <Login onLogin={handleLoginSuccess} />;
  }

  // 2.5 Force Password Change if must_change_password is true
  if (user && user.must_change_password) {
    return <ChangePassword userId={user.id || ''} onPasswordChanged={checkAuthStatus} />;
  }

  // 3. Authenticated but Needs Onboarding -> Wizard
  // Also catches "Profile Not Found" case safely
  if (needsOnboarding || !user) {
    return <OnboardingWizard onFinish={handleFinishOnboarding} />;
  }

  // 4. Authenticated & Has Profile -> Main App
  const renderView = () => {
    switch (currentView) {
      case View.DASHBOARD:
        return <Dashboard currentUser={user} />;
      case View.CLIENTS:
        return <Clients
          user={user}
          team={teamHook.team}
          clients={clientsHook.clients}
          onAddClient={async (c) => { await clientsHook.createClient(c); }}
          onUpdateClient={async (id, u) => { await clientsHook.updateClient(id, u); }}
          onDeleteClient={async (id) => { await clientsHook.deleteClient(id); }}
          error={clientsHook.error}
        />;
      case View.KANBAN:
        return <Kanban
          tasks={tasksHook.tasks}
          onTaskCreate={async (task) => {
            await tasksHook.createTask(task);
          }}
          onTaskUpdate={async (id, updates) => {
            await tasksHook.updateTask(id, updates);
          }}
          onTaskDelete={async (id) => {
            await tasksHook.deleteTask(id);
          }}
          userRole={user.role}
          currentUser={user}
          team={teamHook.team}
        />;
      case View.CALENDAR:
        return <Calendar
          events={eventsHook.events}
          onAddEvent={async (e) => { await eventsHook.createEvent(e); }}
          tasks={tasksHook.tasks}
          userRole={user.role}
          onDeleteEvent={async (id) => { await eventsHook.deleteEvent(id); }}
          team={teamHook.team}
        />;
      case View.KPI_SETUP:
        return <KpiDashboard currentUser={user} team={teamHook.team} />;
      case View.FINANCE:
        return <FinancialManagement
          transactions={transactionsHook.transactions}
          onAddTransaction={async (t) => { await transactionsHook.createTransaction(t); }}
          onUpdateStatus={(id, status) => transactionsHook.updateTransaction(id, { status })}
          onDeleteTransaction={async (id) => { await transactionsHook.deleteTransaction(id); }}
          userRole={user.role}
        />;
      case View.TEAM:
        return <TeamPerformance currentUser={user} team={teamHook.team} onRefetch={teamHook.refetch} error={teamHook.error} />;
      case View.PROJECTS:
        return <Projects currentUser={user} />;
      case View.PHOTO_SESSIONS:
        return <PhotoSessions 
          currentUser={user} 
          transactions={transactionsHook.transactions}
          onAddTransaction={async (t) => { await transactionsHook.createTransaction(t); }}
        />;
      case View.TRADING:
        return <Trading />;
      case View.RANKING:
        return <Ranking currentUser={user} />;
      case View.USER_MANAGEMENT:
        return <UserManagement />;
      case View.SETTINGS:
        return <Settings currentUser={user} />;
      case View.SERVICE_CATALOG:
        return <ServiceCatalog currentUser={user} />;
      case View.INVOICE_NEW:
        return <InvoiceNew user={user} onNavigate={setCurrentView} />;
      case View.INVOICE_HISTORY:
        return <InvoiceHistory user={user} onNavigate={setCurrentView} />;
      case View.DAILY_REPORTS:
        return <DailyReports currentUser={user} />;
      default:
        return <Dashboard />;

    }
  };

  return (
    <ErrorBoundary>
      <ToastProvider>
        <GlobalAlertOverride />
        <GlobalNotificationListener />
        <Layout
          currentView={currentView}
          setView={setCurrentView}
          onAddTask={async (task) => {
            await tasksHook.createTask({ ...task, status: 'Backlog' });
            return { ...task, id: 'temp', status: 'Backlog' };
          }}
          onAddFinancial={async (transaction) => {
            await transactionsHook.createTransaction({
              ...transaction,
              status: transaction.type === 'income' ? 'Recebido' : 'Pago'
            });
            return { ...transaction, id: 'temp', status: 'Pago' };
          }}
          user={user}
          onLogout={handleLogout}
          onUpdateAvatar={handleUpdateAvatar}
        >
          {renderView()}
        </Layout>
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default App;
