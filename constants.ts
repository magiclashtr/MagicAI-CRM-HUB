

import { Currency, User } from './types';

export const USD_TO_TRY_RATE = 32.83;

export const MOCK_CURRENT_USER: User = {
  name: 'Margarita',
  role: 'Director',
};

export const PAYMENT_METHODS = [
  'Карта',
  'Наличные',
  'IBAN',
  'Криптовалюта',
  'Другое'
];

export const formatCurrency = (amount: number, currency: Currency) => {
  const displayAmount = currency === 'TRY' ? amount * USD_TO_TRY_RATE : amount;
  const options = {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  };
  // Using a locale that supports both USD and TRY for consistency
  return new Intl.NumberFormat('en-US', options).format(displayAmount);
};