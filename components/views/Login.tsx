
import React, { useState } from 'react';
import { Logo } from '../../constants';
import { supabase } from '../../src/lib/supabase';

interface LoginProps {
  onLogin: (user: any) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isRecovering, setIsRecovering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) throw authError;

      onLogin({});

    } catch (err: any) {
      console.error('Login error:', err);
      // Increment failed attempts
      setFailedAttempts(prev => prev + 1);

      setError(err.message || 'Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Digite seu e-mail para recuperar a senha.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      alert('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
      setIsRecovering(false);
      setFailedAttempts(0); // Reset attempts
    } catch (err: any) {
      console.error('Recovery error:', err);
      let errorMessage = err.message || 'Erro ao enviar e-mail de recuperação.';

      if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        errorMessage = 'Muitas tentativas. Por favor, aguarde alguns instantes antes de tentar novamente.';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ... (handleRegister remains the same)

  // Update UI to show recovery option


  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor, insira seu nome completo.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: name.trim(),
          }
        }
      });

      if (authError) throw authError;

      if (data.user) {
        console.log('Registration successful, user:', data.user.id);

        // Check if session is already established (auto-confirm off or not required)
        if (data.session) {
          console.log('Session immediate, triggering onboarding');
          onLogin({ needsOnboarding: true });
          return;
        }

        // Wait a bit for the session to be fully established (if async)
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Verify session is established
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          console.log('Session established after wait, triggering onboarding');
          onLogin({ needsOnboarding: true });
        } else {
          // If no session, it likely means email confirmation is required
          alert('Conta criada com sucesso! Se necessário, verifique seu e-mail para confirmar o cadastro antes de fazer login.');
          setIsRegistering(false); // Switch back to login mode
        }
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login com Google.');
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-white dark:bg-zinc-900">
      {/* Brand Side */}
      <div className="relative hidden lg:flex w-1/2 flex-col justify-end bg-cover bg-center" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCcaDLhOsrfPF7Piz0lCg3GSxGQgCL6gMZJhsdgzej0nlUj_AHKnnBwOoxcKfYJ7G_DNiZ5-GUQCQ7cPQ5i-4ezk11EeFVeHB4LZMUZmuyYoq-N1wjOI_DG1iHQNluVVidDM5PeZuEKN52u5rjjs92UYRaK9RMnUtMv1RZTmF2hfACPy1ZQpQKnW088SG2842E3yTN93EbvhB93BP8K0F6cxbcNTsnlWu_7bG1me5VVrBYqwVSPFV2bkCTF3jY3crMQyGdXT-iV8js')" }}>
        <div className="absolute inset-0 bg-primary/40 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
        <div className="relative z-10 p-16 max-w-2xl text-white">
          <blockquote className="text-3xl font-bold leading-tight mb-6">
            "O oceano não divide os continentes, ele os conecta. Assim como nós conectamos seus projetos."
          </blockquote>
          <p className="text-white/80 font-medium">Ocean Group Management Suite</p>
        </div>
      </div>

      {/* Form Side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md flex flex-col gap-6">
          <div className="text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-4 mb-4">
              <Logo className="h-12" variant="black" />
            </div>
            <h1 className="text-3xl font-bold dark:text-white mb-2">
              {isRecovering ? 'Recuperar Senha' : (isRegistering ? 'Criar nova conta' : 'Bem-vindo de volta')}
            </h1>
            <p className="text-text-sub">
              {isRecovering
                ? 'Digite seu e-mail para receber um link de redefinição.'
                : (isRegistering
                  ? 'Junte-se ao time e comece a gerenciar seus projetos.'
                  : 'Acesse sua conta para gerenciar seus projetos.')}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form className="flex flex-col gap-4" onSubmit={isRecovering ? handleRecovery : (isRegistering ? handleRegister : handleLogin)}>
            {isRegistering && (
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold">Nome Completo</label>
                <input
                  className="rounded-lg border-gray-200 bg-gray-50 dark:bg-zinc-800 dark:border-zinc-700 p-3"
                  placeholder="Seu nome"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                />
              </div>
            )}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold">E-mail</label>
              <input
                className="rounded-lg border-gray-200 bg-gray-50 dark:bg-zinc-800 dark:border-zinc-700 p-3"
                placeholder="exemplo@oceangroup.com"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            {!isRecovering && (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold">Senha</label>
                  {failedAttempts >= 3 && (
                    <button
                      type="button"
                      onClick={() => setIsRecovering(true)}
                      className="text-xs text-primary hover:underline font-bold"
                    >
                      Esqueci minha senha
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    className="rounded-lg border-gray-200 bg-gray-50 dark:bg-zinc-800 dark:border-zinc-700 p-3 w-full pr-10"
                    placeholder="••••••••"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                  >
                    <span className="material-symbols-outlined text-xl">
                      {showPassword ? 'visibility' : 'visibility_off'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="bg-primary hover:bg-primary-dark text-white font-bold p-3 rounded-lg transition-all mt-2 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? 'Processando...'
                : (isRecovering ? 'Enviar Link' : (isRegistering ? 'Criar Conta' : 'Entrar'))}
            </button>
          </form>

          <div className="text-center flex flex-col gap-2">
            {!isRecovering && (
              <button
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-sm font-semibold text-primary hover:underline"
              >
                {isRegistering
                  ? 'Já tem uma conta? Entre aqui'
                  : 'Não tem uma conta? Registre-se'}
              </button>
            )}
            {isRecovering && (
              <button
                onClick={() => setIsRecovering(false)}
                className="text-sm font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 hover:underline"
              >
                Voltar para o Login
              </button>
            )}
          </div>

          <div className="relative flex items-center py-2">
            <div className="grow border-t border-gray-200 dark:border-zinc-800"></div>
            <span className="mx-4 text-xs font-semibold text-text-sub uppercase">Ou entre com</span>
            <div className="grow border-t border-gray-200 dark:border-zinc-800"></div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={handleGoogleLogin}
              type="button"
              className="flex items-center justify-center gap-2 border border-gray-200 dark:border-zinc-700 p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 font-semibold text-sm"
            >
              <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="size-5" alt="Google" />
              Continuar com Google
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
