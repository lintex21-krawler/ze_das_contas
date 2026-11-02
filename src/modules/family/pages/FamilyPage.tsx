import React, { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { authService } from '@/modules/auth/services/authService';
import { Users, Crown, Mail, Copy, CheckCircle2 } from 'lucide-react';

export const FamilyPage: React.FC = () => {
  const { currentFamily, profile } = useAuth();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'member' | 'viewer'>('member');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentFamily || !email.trim()) return;
    setIsSubmitting(true);
    setInviteMessage(null);
    try {
      const { token, expiresAt } = await authService.inviteMember(currentFamily.id, email.trim(), role);
      const link = `${window.location.origin}/login?invite=${token}`;
      await navigator.clipboard?.writeText(link);
      setInviteMessage(`Convite criado para ${email}. Link copiado para a área de transferência; válido até ${new Date(expiresAt).toLocaleDateString('pt-BR')}.`);
      setEmail('');
    } catch (err: any) {
      setInviteMessage(err.message || 'Não foi possível criar o convite. Apenas administradores podem convidar membros.');
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      <PageHeader title="Família & Membros" subtitle="Compartilhe o espaço financeiro com segurança" />
      <section className="p-5 rounded-card bg-background-card border border-border flex gap-3">
        <div className="w-11 h-11 rounded-xl bg-brand-secondary/15 text-brand-secondary flex items-center justify-center"><Users className="w-5 h-5" /></div>
        <div><h2 className="font-bold text-text-primary">{currentFamily?.name || 'Nenhuma família selecionada'}</h2><p className="text-xs text-text-secondary">Moeda: {currentFamily?.currency_code || 'BRL'} · Fuso: {currentFamily?.timezone || 'America/Sao_Paulo'}</p></div>
      </section>
      <section className="p-5 rounded-card bg-background-card border border-border flex flex-col gap-3">
        <h2 className="text-base font-bold text-text-primary">Membro atual</h2>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-background-elevated"><div className="w-9 h-9 rounded-full bg-brand-primary text-white flex items-center justify-center font-bold">{profile?.display_name?.charAt(0).toUpperCase() || 'U'}</div><div className="flex-1"><span className="block text-sm font-semibold">{profile?.display_name || 'Você'}</span><span className="text-xs text-text-secondary">{currentFamily?.role === 'admin' ? 'Administrador' : 'Membro'}</span></div>{currentFamily?.role === 'admin' && <Crown className="w-4 h-4 text-financial-warning" />}</div>
      </section>
      <form onSubmit={handleInvite} className="p-5 rounded-card bg-background-card border border-border flex flex-col gap-3">
        <h2 className="text-base font-bold text-text-primary flex items-center gap-2"><Mail className="w-4 h-4 text-brand-primary" />Convidar membro</h2>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" className="px-3.5 py-2.5 rounded-input bg-background-elevated border border-border text-sm" />
        <select value={role} onChange={(e) => setRole(e.target.value as 'member' | 'viewer')} className="px-3.5 py-2.5 rounded-input bg-background-elevated border border-border text-sm"><option value="member">Membro — pode registrar e editar</option><option value="viewer">Visualizador — somente consulta</option></select>
        <Button type="submit" variant="primary" isLoading={isSubmitting} leftIcon={<Copy className="w-4 h-4" />}>Criar convite e copiar link</Button>
        {inviteMessage && <p className="text-xs text-text-secondary flex gap-2"><CheckCircle2 className="w-4 h-4 text-financial-income shrink-0" />{inviteMessage}</p>}
      </form>
    </div>
  );
};
