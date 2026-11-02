import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Component: Button', () => {
  it('deve renderizar o texto do botão corretamente', () => {
    render(<Button>Salvar Transação</Button>);
    expect(screen.getByRole('button', { name: /salvar transação/i })).toBeInTheDocument();
  });

  it('deve disparar evento de clique quando não desabilitado', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Ação</Button>);

    await userEvent.click(screen.getByRole('button', { name: /ação/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('não deve disparar clique quando estiver desabilitado ou carregando', async () => {
    const handleClick = vi.fn();
    render(
      <Button disabled onClick={handleClick}>
        Desabilitado
      </Button>
    );

    await userEvent.click(screen.getByRole('button', { name: /desabilitado/i }));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('deve exibir indicador de carregamento quando isLoading for true', () => {
    render(<Button isLoading>Processando</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button.querySelector('.animate-spin')).toBeInTheDocument();
  });
});
