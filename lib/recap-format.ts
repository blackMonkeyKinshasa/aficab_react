export function formatRecapPrice(amount: number): string {
  return amount.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatRecapPriceWithCurrency(amount: number): string {
  return `${formatRecapPrice(amount)} USD`;
}
