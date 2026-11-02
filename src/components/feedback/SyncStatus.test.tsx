import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SyncStatus } from './SyncStatus';

describe('Component: SyncStatus', () => {
  it('deve exibir status "Sincronizado" por padrão', () => {
    render(<SyncStatus status="synced" />);
    expect(screen.getByText('Sincronizado')).toBeInTheDocument();
  });

  it('deve exibir contagem de operações pendentes quando estiver offline/pendente', () => {
    render(<SyncStatus status="pending" pendingCount={3} />);
    expect(screen.getByText('3 pendentes')).toBeInTheDocument();
  });

  it('deve permitir tentar novamente quando houver erro', async () => {
    const handleRetry = vi.fn();
    render(<SyncStatus status="error" onRetry={handleRetry} />);

    expect(screen.getByText('Erro de sincronização')).toBeInTheDocument();
    const retryButton = screen.getByText('Tentar');
    await userEvent.click(retryButton);

    expect(handleRetry).toHaveBeenCalledTimes(1);
  });
});
