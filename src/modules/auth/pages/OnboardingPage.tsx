import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Users, Wallet, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, refreshFamilies } = useAuth();
  const [step, setStep] = useState(1);
  const [familyName, setFamilyName] = useState('');
  const [accountName, setAccountName] = useState('Conta Corrente Principal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFinish = async () => {
    if (!familyName.trim()) {
      setErrorMsg('Informe um nome para sua família.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await authService.createFamily(familyName.trim(), accountName.trim());
      await refreshFamilies();
      navigate('/');
    } catch (err: any) {
      console.error('Erro ao criar família no Supabase:', err);
      setErrorMsg(err.message || 'Não foi possível criar a família. Verifique sua conexão.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background text-text-primary">
      <div className="w-full max-w-md flex flex-col gap-6">
        {/* Progresso do Onboarding */}
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <span>Passo {step} de 2</span>
          <span className="font-semibold text-brand-primary">
            {step === 1 ? 'Espaço Familiar' : 'Primeira Conta'}
          </span>
        </div>

        <div className="w-full h-1.5 rounded-full bg-background-elevated overflow-hidden">
          <div
            className="h-full bg-brand-primary transition-all duration-300"
            style={{ width: `${(step / 2) * 100}%` }}
          />
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-financial-expense/15 border border-financial-expense/30 text-financial-expense text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="p-6 rounded-card bg-background-card border border-border shadow-md flex flex-col gap-5">
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-brand-secondary/15 text-brand-secondary">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-text-primary">
                    Dê um nome para a família
                  </h2>
                  <p className="text-xs text-text-secondary">
                    Este será o ambiente seguro compartilhado entre vocês.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 mt-2">
                <label className="text-xs font-semibold text-text-secondary">
                  Nome da Família
                </label>
                <input
                  type="text"
                  required
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  placeholder="Ex.: Família Silva, Nosso Lar..."
                  className="w-full px-3.5 py-2.5 rounded-input bg-background-elevated border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-financial-income/15 text-financial-income">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-text-primary">
                    Configuração da primeira conta
                  </h2>
                  <p className="text-xs text-text-secondary">
                    Uma conta para registrar movimentações em dinheiro, PIX ou débito.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 mt-2">
                <label className="text-xs font-semibold text-text-secondary">
                  Nome da Conta / Instituição
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Ex.: Nubank, Itaú, Carteira..."
                  className="w-full px-3.5 py-2.5 rounded-input bg-background-elevated border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-border mt-2">
            {step === 1 ? (
              <span className="text-xs text-text-secondary">
                {user?.email}
              </span>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="md"
                disabled={isSubmitting}
                onClick={() => setStep(1)}
              >
                Voltar
              </Button>
            )}

            {step === 1 ? (
              <Button
                type="button"
                variant="primary"
                size="md"
                disabled={!familyName.trim()}
                onClick={() => setStep(2)}
              >
                Próximo
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="md"
                isLoading={isSubmitting}
                rightIcon={<CheckCircle2 className="w-4 h-4" />}
                onClick={handleFinish}
              >
                Concluir e Acessar
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
