import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp } = useAuth();

  const [isRegistering, setIsRegistering] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      if (isRegistering) {
        if (!displayName.trim()) {
          setErrorMsg('Por favor, informe seu nome ou apelido.');
          setIsSubmitting(false);
          return;
        }
        await signUp(email, password, displayName);

        // Quando a confirmação de e-mail está habilitada no Supabase, o cadastro
        // não cria uma sessão imediatamente. Não devemos navegar ao onboarding
        // sem sessão, pois a criação da família exige auth.uid() no servidor.
        const authenticatedUser = await authService.getCurrentUser();
        if (!authenticatedUser) {
          setSuccessMsg(
            'Conta criada! Confirme o link enviado para seu e-mail e, em seguida, entre com seu e-mail e senha para continuar.'
          );
          setIsRegistering(false);
          return;
        }

        setSuccessMsg('Conta criada com sucesso! Vamos configurar sua família.');
        navigate('/onboarding');
      } else {
        await signIn(email, password);
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      console.error('Erro na autenticação:', err);
      const msg = err.message || '';
      if (msg.includes('Invalid login credentials')) {
        setErrorMsg('E-mail ou senha incorretos.');
      } else if (msg.includes('already registered')) {
        setErrorMsg('Este e-mail já está cadastrado. Tente entrar.');
      } else if (msg.includes('Password should be at least')) {
        setErrorMsg('A senha deve ter pelo menos 6 caracteres.');
      } else {
        setErrorMsg(msg || 'Ocorreu um erro ao processar. Tente novamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background text-text-primary">
      <div className="w-full max-w-sm flex flex-col gap-6">
        {/* Logo & Headline */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-14 h-14 rounded-2xl bg-brand-primary/15 border border-brand-primary/30 flex items-center justify-center text-brand-primary font-bold text-2xl shadow-inner">
            Z
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary mt-1">
            Zé das Contas
          </h1>
          <p className="text-sm text-text-secondary">
            {isRegistering
              ? 'Crie seu acesso para gerenciar as finanças familiares.'
              : 'Seu dinheiro, organizado em família.'}
          </p>
        </div>

        {/* Mensagem de Erro / Sucesso */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-financial-expense/15 border border-financial-expense/30 text-financial-expense text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-financial-income/15 border border-financial-income/30 text-financial-income text-xs">
            {successMsg}
          </div>
        )}

        {/* Formulário */}
        <form
          onSubmit={handleSubmit}
          className="p-6 rounded-card bg-background-card border border-border shadow-md flex flex-col gap-4"
        >
          {isRegistering && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary">
                Seu Nome ou Apelido
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ex.: Lucas"
                className="w-full px-3.5 py-2.5 rounded-input bg-background-elevated border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">
              E-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@exemplo.com"
              className="w-full px-3.5 py-2.5 rounded-input bg-background-elevated border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-text-secondary">
                Senha
              </label>
              {!isRegistering && (
                <button
                  type="button"
                  onClick={() => alert('Para redefinir sua senha, solicite ao administrador da família ou utilize o e-mail cadastrado.')}
                  className="text-xs text-brand-primary hover:underline"
                >
                  Esqueceu a senha?
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full pl-3.5 pr-10 py-2.5 rounded-input bg-background-elevated border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isSubmitting}
            className="w-full mt-2"
          >
            {isRegistering ? 'Criar Minha Conta' : 'Entrar'}
          </Button>

          <div className="pt-2 border-t border-border flex items-center justify-center gap-1 text-xs text-text-secondary">
            <span>{isRegistering ? 'Já tem uma conta?' : 'Novo por aqui?'}</span>
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setErrorMsg(null);
              }}
              className="text-brand-primary font-semibold hover:underline"
            >
              {isRegistering ? 'Fazer login' : 'Criar conta familiar'}
            </button>
          </div>
        </form>

        <div className="flex items-center justify-center gap-2 text-xs text-text-secondary text-center">
          <ShieldCheck className="w-4 h-4 text-financial-income shrink-0" />
          <span>Isolamento e criptografia por família</span>
        </div>
      </div>
    </div>
  );
};
