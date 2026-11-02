import React, { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Repeat, Plus, Pause, Play, CalendarDays } from 'lucide-react';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { supabase } from '@/infrastructure/supabase/client';
import { MoneyCents, formatBRL } from '@/domain/money/money';

interface RecurringRule { id: string; description: string; amount_cents: number; transaction_type: 'expense' | 'income' | 'transfer'; frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'; start_date: string; is_active: boolean; payment_method: string | null; }

export const RecurringPage: React.FC = () => {
  const { currentFamily, user } = useAuth();
  const familyId = currentFamily?.id || '';
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [loadedFor, setLoadedFor] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carrega no servidor quando há conexão. As regras futuras serão integradas ao outbox.
  React.useEffect(() => {
    if (!familyId || loadedFor === familyId) return;
    supabase.from('recurring_rules').select('id, description, amount_cents, transaction_type, frequency, start_date, is_active, payment_method').eq('family_id', familyId).order('created_at', { ascending: false })
      .then(({ data, error: fetchError }) => { if (fetchError) setError(fetchError.message); else setRules((data || []) as RecurringRule[]); setLoadedFor(familyId); });
  }, [familyId, loadedFor]);

  const toggleRule = async (rule: RecurringRule) => {
    const { error: updateError } = await supabase.from('recurring_rules').update({ is_active: !rule.is_active }).eq('id', rule.id);
    if (updateError) { setError(updateError.message); return; }
    setRules((current) => current.map((r) => r.id === rule.id ? { ...r, is_active: !r.is_active } : r));
  };

  return <div className="flex flex-col gap-5">
    <PageHeader title="Recorrências & Assinaturas" subtitle="Planeje despesas e receitas que se repetem" rightAction={<Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsModalOpen(true)}>Nova regra</Button>} />
    {error && <p className="p-3 rounded-xl border border-financial-expense/30 bg-financial-expense/10 text-financial-expense text-xs">{error}</p>}
    {rules.length === 0 ? <EmptyState icon={<Repeat className="w-8 h-8" />} title="Nenhuma recorrência cadastrada" description="Cadastre aluguel, assinaturas, salário ou outras movimentações repetidas." actionLabel="Criar recorrência" onAction={() => setIsModalOpen(true)} /> : <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{rules.map((rule) => <div key={rule.id} className="p-4 rounded-card bg-background-card border border-border flex flex-col gap-3"><div className="flex justify-between gap-3"><div><h2 className="font-bold text-text-primary">{rule.description}</h2><p className="text-xs text-text-secondary flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{rule.frequency === 'monthly' ? 'Mensal' : rule.frequency === 'weekly' ? 'Semanal' : rule.frequency === 'yearly' ? 'Anual' : 'Diária'} · início {new Date(`${rule.start_date}T12:00:00`).toLocaleDateString('pt-BR')}</p></div><Button variant="outline" size="sm" onClick={() => toggleRule(rule)} leftIcon={rule.is_active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}>{rule.is_active ? 'Pausar' : 'Retomar'}</Button></div><span className={rule.transaction_type === 'income' ? 'text-financial-income font-bold' : 'text-financial-expense font-bold'}>{rule.transaction_type === 'income' ? '+' : '-'} {formatBRL(rule.amount_cents)}</span></div>)}</div>}
    {isModalOpen && <RecurringModal familyId={familyId} userId={user?.id || ''} onClose={() => setIsModalOpen(false)} onCreated={(rule) => { setRules((current) => [rule, ...current]); setIsModalOpen(false); }} />}
  </div>;
};

const RecurringModal: React.FC<{ familyId: string; userId: string; onClose: () => void; onCreated: (rule: RecurringRule) => void }> = ({ familyId, userId, onClose, onCreated }) => {
  const [description, setDescription] = useState(''); const [amount, setAmount] = useState<MoneyCents>(0); const [type, setType] = useState<'expense' | 'income'>('expense'); const [frequency, setFrequency] = useState<'monthly' | 'weekly' | 'yearly'>('monthly'); const [isSubmitting, setIsSubmitting] = useState(false);
  const submit = async (e: React.FormEvent) => { e.preventDefault(); if (!description.trim() || amount <= 0 || !familyId || !userId) return; setIsSubmitting(true); const start = new Date().toISOString().slice(0, 10); const { data, error } = await supabase.from('recurring_rules').insert({ family_id: familyId, created_by: userId, description: description.trim(), amount_cents: amount, transaction_type: type, frequency, interval_value: 1, start_date: start, is_active: true }).select('id, description, amount_cents, transaction_type, frequency, start_date, is_active, payment_method').single(); setIsSubmitting(false); if (error) { alert(error.message); return; } onCreated(data as RecurringRule); };
  return <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"><form onSubmit={submit} className="w-full max-w-md p-6 rounded-card bg-background-card border border-border flex flex-col gap-4"><h2 className="text-lg font-bold">Nova recorrência</h2><input required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Aluguel, Salário, Netflix" className="px-3.5 py-2.5 rounded-input bg-background-elevated border border-border text-sm" /><CurrencyInput label="Valor" value={amount} onChange={setAmount} /><div className="grid grid-cols-2 gap-2"><select value={type} onChange={(e) => setType(e.target.value as 'expense' | 'income')} className="px-3 py-2.5 rounded-input bg-background-elevated border border-border text-sm"><option value="expense">Despesa</option><option value="income">Receita</option></select><select value={frequency} onChange={(e) => setFrequency(e.target.value as 'monthly' | 'weekly' | 'yearly')} className="px-3 py-2.5 rounded-input bg-background-elevated border border-border text-sm"><option value="monthly">Mensal</option><option value="weekly">Semanal</option><option value="yearly">Anual</option></select></div><p className="text-xs text-text-secondary">A regra fica registrada. A geração automática de lançamentos será disponibilizada em seguida; por enquanto, continue registrando cada ocorrência manualmente.</p><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" variant="primary" isLoading={isSubmitting}>Salvar regra</Button></div></form></div>;
};
