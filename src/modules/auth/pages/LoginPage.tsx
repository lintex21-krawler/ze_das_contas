import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Na fase 2, integraremos com supabase.auth.signInWithPassword
    setTimeout(() => {
      setIsSubmitting(false);
      navigate('/');
    }, 600);
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
            Seu dinheiro, organizado em família.
          </p>
        </div>

        {/* Formulário */}
        <form
          onSubmit={handleSubmit}
          className="p-6 rounded-card bg-background-card border border-border shadow-md flex flex-col gap-4"
        >
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
              <button
                type="button"
                onClick={() => alert('Recuperação de senha será integrada com o Supabase Auth na Fase 2.')}
                className="text-xs text-brand-primary hover:underline"
              >
                Esqueceu a senha?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha secreta"
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
            Entrar
          </Button>

          <div className="pt-2 border-t border-border flex items-center justify-center gap-1 text-xs text-text-secondary">
            <span>Novo por aqui?</span>
            <button
              type="button"
              onClick={() => navigate('/onboarding')}
              className="text-brand-primary font-semibold hover:underline"
            >
              Criar conta familiar
            </button>
          </div>
        </form>

        <div className="flex items-center justify-center gap-2 text-xs text-text-secondary text-center">
          <ShieldCheck className="w-4 h-4 text-financial-income shrink-0" />
          <span>Dados criptografados e isolados por família</span>
        </div>
      </div>
    </div>
  );
};
