import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MoneyDisplay } from './MoneyDisplay';

describe('Component: MoneyDisplay', () => {
  it('deve exibir valor formatado em reais com algarismos tabulares', () => {
    render(<MoneyDisplay cents={10500} />);
    expect(screen.getByText('R$ 105,00')).toBeInTheDocument();
  });

  it('deve exibir máscara quando masked for true', () => {
    render(<MoneyDisplay cents={10500} masked />);
    expect(screen.getByText('••••••')).toBeInTheDocument();
  });

  it('deve aplicar classe de cor para receita e despesa', () => {
    const { container: incomeContainer } = render(
      <MoneyDisplay cents={5000} type="income" />
    );
    expect(incomeContainer.firstChild).toHaveClass('text-financial-income');

    const { container: expenseContainer } = render(
      <MoneyDisplay cents={-5000} type="expense" />
    );
    expect(expenseContainer.firstChild).toHaveClass('text-financial-expense');
  });
});
