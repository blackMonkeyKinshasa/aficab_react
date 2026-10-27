export type InvoiceDocKind = 'none' | 'proforma' | 'invoice';

export function resolveInvoiceKind(booking: {
  status: string;
  isPaid: boolean;
}): InvoiceDocKind {
  if (booking.status === 'CANCELED') return 'none';
  if (
    booking.isPaid ||
    booking.status === 'ENDED' ||
    booking.status === 'ARCHIVED'
  ) {
    return 'invoice';
  }
  return 'proforma';
}

export function invoiceDisplayId(bookingId: string, kind: InvoiceDocKind) {
  if (kind === 'none') return null;
  return `${kind === 'invoice' ? 'FAC' : 'PRO'}-${bookingId}`;
}

export function invoiceShortDisplayId(bookingId: string, kind: InvoiceDocKind) {
  const full = invoiceDisplayId(bookingId, kind);
  if (!full) return null;
  const shortId = bookingId.slice(0, 8);
  return `${kind === 'invoice' ? 'FAC' : 'PRO'}-${shortId}`;
}
