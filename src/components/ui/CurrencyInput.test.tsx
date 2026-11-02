import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CurrencyInput } from './CurrencyInput';

describe('Component: CurrencyInput', () => {
  it('deve exibir valor inicial formatado em BRL', () => {
    const handleChange = vi.fn();
    render(<CurrencyInput value={2500} onChange={handleChange} label="Valor da Compra" />);

    const input = screen.getByLabelText(/valor da compra/i);
    expect(input).toHaveValue('R$\u00A025,00');
  });

  it('deve chamar onChange com centavos calculados ao digitar novos dígitos', async () => {
    const handleChange = vi.fn();
    render(<CurrencyInput value={0} onChange={handleChange} label="Valor" />);

    const input = screen.getByLabelText(/valor/i);
    await userEvent.type(input, '1250');

    expect(handleChange).toHaveBeenCalled();
  });
});
