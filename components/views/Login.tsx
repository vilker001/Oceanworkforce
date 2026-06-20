
import React, { useState } from 'react';
import { Logo } from '../../constants';
import { supabase, isMissingSupabaseConfig } from '../../src/lib/supabase';


interface LoginProps {
  onLogin: (user: any) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isRecovering, setIsRecovering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Block login if Supabase is not configured
    if (isMissingSupabaseConfig) {
      setError('Configuração do servidor incompleta. Por favor, configure as variáveis de ambiente do Supabase no Vercel (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY).');
      setLoading(false);
      return;
    }

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) throw authError;

      onLogin({});

    } catch (err: any) {
      console.error('Login error:', err);
      setFailedAttempts(prev => prev + 1);

      // Translate common Supabase errors to Portuguese
      let errorMsg = err.message || 'Erro ao fazer login. Verifique suas credenciais.';
      if (
        errorMsg.includes('Database error querying schema') ||
        errorMsg.includes('querying schema') ||
        errorMsg.includes('failed to fetch') ||
        errorMsg.includes('Failed to fetch')
      ) {
        errorMsg = 'Erro de conexão com o banco de dados. As variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY precisam ser configuradas no Vercel.';
      } else if (errorMsg.includes('Invalid login credentials') || errorMsg.includes('invalid_credentials')) {
        errorMsg = 'E-mail ou senha incorretos. Tente novamente.';
      } else if (errorMsg.includes('Email not confirmed')) {
        errorMsg = 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada.';
      } else if (errorMsg.includes('Too many requests') || errorMsg.includes('rate limit')) {
        errorMsg = 'Muitas tentativas. Aguarde alguns instantes e tente novamente.';
      }

      setError(errorMsg);
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
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <Logo className="h-24" variant="black" />
            </div>
            <h1 className="text-3xl font-bold dark:text-white mb-2">
              {isRecovering ? 'Recuperar Senha' : 'Bem-vindo de volta'}
            </h1>
            <p className="text-text-sub">
              {isRecovering
                ? 'Digite seu e-mail para receber um link de redefinição.'
                : 'Acesse sua conta para gerenciar seus projetos.'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form className="flex flex-col gap-4" onSubmit={isRecovering ? handleRecovery : handleLogin}>
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
                  <button
                    type="button"
                    onClick={() => setIsRecovering(true)}
                    className="text-xs text-primary hover:underline font-semibold"
                  >
                    Esqueci minha senha
                  </button>
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
                : (isRecovering ? 'Enviar Link' : 'Entrar')}
            </button>
          </form>

          <div className="mt-4 text-center">
            {isRecovering && (
              <button
                onClick={() => setIsRecovering(false)}
                className="text-sm font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 hover:underline"
              >
                Voltar para o Login
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
