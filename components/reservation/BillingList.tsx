import { ActivityIndicator, FlatList, Image, Pressable, Text, View } from 'react-native';

import { useRouter } from 'expo-router';

import { InvoiceDownloadButton } from '@/components/reservation/InvoiceDownloadButton';
import {
  CAR_PLACEHOLDER,
  fmtDateTime,
  getCarImage,
} from '@/components/reservation/reservation-helpers';
import { Booking } from '@/constants/dataInterface';
import { ResStatus } from '@/constants/databaseEnum';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import {
  invoiceShortDisplayId,
  resolveInvoiceKind,
  type InvoiceDocKind,
} from '@/lib/invoice-kind';

type BillingListProps = {
  bookings: Booking[];
  isDark: boolean;
  isLoading?: boolean;
  highlightId?: string | null;
};

function isBillable(booking: Booking) {
  return booking.status !== ResStatus.CANCELED;
}

function badgeKey(kind: InvoiceDocKind, isPaid: boolean): TranslationKey {
  if (kind === 'none') return 'billing.badgeNone';
  if (kind === 'proforma') return 'billing.badgeProforma';
  return isPaid ? 'billing.badgePaid' : 'billing.badgeInvoice';
}

export function BillingList({ bookings, isDark, isLoading, highlightId }: BillingListProps) {
  const { t, appLocale } = useI18n();
  const router = useRouter();
  const fg = isDark ? '#fff' : '#111827';
  const sub = isDark ? '#9CA3AF' : '#6B7280';
  const cardBg = isDark ? '#1E1E1E' : '#ffffff';
  const borderColor = isDark ? '#2F2F2F' : '#E5E7EB';
  const highlightBorder = '#F97316';
  const billable = bookings.filter(isBillable);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (billable.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: fg, fontSize: 17, fontWeight: '700', textAlign: 'center' }}>
          {t('billing.empty.title')}
        </Text>
        <Text style={{ color: sub, marginTop: 8, textAlign: 'center' }}>
          {t('billing.empty.description')}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={billable}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}
      renderItem={({ item }) => {
        const kind = resolveInvoiceKind({
          status: item.status,
          isPaid: Boolean(item.isPaid),
        });
        const docId = invoiceShortDisplayId(item.id, kind);
        const badge = t(badgeKey(kind, Boolean(item.isPaid)));
        const badgeColor =
          kind === 'proforma' ? '#F97316' : item.isPaid ? '#16A34A' : '#2563EB';
        const isHighlighted = Boolean(highlightId && item.id === highlightId);

        return (
          <View
            style={{
              backgroundColor: cardBg,
              borderRadius: 14,
              padding: 14,
              borderWidth: 1,
              borderColor: isHighlighted ? highlightBorder : borderColor,
            }}>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
              <Image
                source={{ uri: getCarImage(item) ?? CAR_PLACEHOLDER }}
                style={{
                  width: 64,
                  height: 48,
                  borderRadius: 8,
                  backgroundColor: isDark ? '#2A2A2A' : '#F3F4F6',
                }}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ color: fg, fontWeight: '700', fontSize: 15 }}>
                  {item.car?.name ?? item.id}
                </Text>
                {docId ? (
                  <Text style={{ color: sub, marginTop: 2 }}>{docId}</Text>
                ) : null}
                <Text style={{ color: sub, marginTop: 2 }}>
                  {item.departure?.label ?? '—'}
                </Text>
                <Text style={{ color: sub, marginTop: 2 }}>
                  {fmtDateTime(item.departureAt, appLocale)}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: badgeColor, fontWeight: '700' }}>{badge}</Text>
              <Text style={{ color: fg, fontWeight: '700' }}>
                {typeof item.total === 'number' ? `${item.total.toFixed(2)} USD` : '—'}
              </Text>
            </View>

            <InvoiceDownloadButton booking={item} />

            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push({ pathname: '/booking/[id]', params: { id: item.id } })
              }
              style={{ marginTop: 10, paddingVertical: 6 }}>
              <Text style={{ color: '#2563EB', fontWeight: '600', textAlign: 'center' }}>
                {t('billing.viewBooking')}
              </Text>
            </Pressable>
          </View>
        );
      }}
    />
  );
}
