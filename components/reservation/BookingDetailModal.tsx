import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { color } from '@/constants/colors';
import { Booking } from '@/constants/dataInterface';
import { ClientType, ResStatus, ResType } from '@/constants/databaseEnum';
import { TranslationKey } from '@/lib/i18n';
import { Button } from '@/components/ui/button';

import { InvoiceDownloadButton } from '@/components/reservation/InvoiceDownloadButton';
import { resolveInvoiceKind } from '@/lib/invoice-kind';
import { buildPriceRecap, formatRecapPriceWithCurrency } from '@/lib/recap-format';

import {
  canClientCancelBooking,
  CAR_PLACEHOLDER,
  fmtDateTime,
  getCarImage,
  STATUS_COLORS,
  STATUS_LABELS,
} from './reservation-helpers';

type BookingDetailModalProps = {
  booking: Booking;
  isDark: boolean;
  disableStatusBar?: boolean;
  onClose: () => void;
  onOpenReview: (booking: Booking) => void;
  onOpenPayment: (booking: Booking) => void;
  onClientCancelBooking: (booking: Booking) => void;
  isCancelling: boolean;
  t: (key: TranslationKey) => string;
  appLocale: string;
};

export function BookingDetailModal({
  booking,
  isDark,
  disableStatusBar = false,
  onClose,
  onOpenReview,
  onOpenPayment,
  onClientCancelBooking,
  isCancelling,
  t,
  appLocale,
}: BookingDetailModalProps) {
  const bg = isDark ? '#262626' : '#f2f2f7';
  const fg = isDark ? '#fff' : '#000';
  const sub = isDark ? '#aaa' : '#555';
  const sep = isDark ? '#333' : '#eee';
  const modalBg = isDark ? color.appDarkBackground : '#fff';

  const statusColor = STATUS_COLORS[booking.status] ?? '#999';

  const Row = ({ label, value }: { label: string; value: string }) => (
    <View style={[styles.detailRow, { borderBottomColor: sep }]}>
      <Text style={[styles.detailLabel, { color: sub }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: fg }]}>{value}</Text>
    </View>
  );

  const driverUser = booking.driver?.user as Record<string, string> | undefined;
  const driverAvatar = driverUser?.avatar_url ?? null;
  const driverName = driverUser?.full_name ?? '—';
  const driverPhone = driverUser?.phone ?? null;
  const guestName =
    typeof booking.guest?.fullName === 'string' && booking.guest.fullName.trim()
      ? booking.guest.fullName.trim()
      : null;
  const guestPhone =
    typeof booking.guest?.phone === 'string' && booking.guest.phone.trim()
      ? booking.guest.phone.trim()
      : null;
  const guestEmail =
    typeof booking.guest?.email === 'string' && booking.guest.email.trim()
      ? booking.guest.email.trim()
      : null;
  const hasGuestBooking = Boolean(guestName || guestPhone || guestEmail);
  const bookingOptions = booking.options ?? {};
  const optionItems = Array.isArray(bookingOptions.options) ? bookingOptions.options : [];
  const dayExtensions = Array.isArray(bookingOptions.dayExtensions)
    ? bookingOptions.dayExtensions
    : [];
  const hasFuelOption = optionItems.some((option) => {
    const name = option.name?.toLowerCase() ?? '';
    return name.includes('fuel') || name.includes('carburant');
  });
  const hasFlexExtension =
    dayExtensions.some((item) => item.type === 'flex') ||
    (bookingOptions.extraTime?.name ?? '').toLowerCase().includes('flex') ||
    (typeof bookingOptions.flex === 'number' && bookingOptions.flex > 0);
  const hasPremiumExtension =
    dayExtensions.some((item) => item.type === 'premium') ||
    (bookingOptions.extraTime?.name ?? '').toLowerCase().includes('premium') ||
    (typeof bookingOptions.premium === 'number' && bookingOptions.premium > 0);
  const couponDiscountAmount =
    typeof booking.originalTotal === 'number' && typeof booking.total === 'number'
      ? Math.max(0, booking.originalTotal - booking.total)
      : null;
  const priceRecap = buildPriceRecap(
    booking,
    {
      rental: (days) =>
        `${t('reservations.type.dailyRental')} · ${days} ${
          days > 1 ? t('booking.dayPlural') : t('booking.daySingular')
        }`,
      transfer: t('reservations.type.airportTransfer'),
      flex: t('booking.flexShort'),
      premium: t('booking.premiumShort'),
      extraHoursFallback: t('booking.flexExtraHours'),
      discount: t('booking.discount'),
      total: t('booking.totalToPay'),
    },
    appLocale
  );
  const dailyDetails =
    booking.type === ResType.LOC
      ? ([
          t('booking.driverIncluded'),
          t('booking.serviceHoursSummary'),
          `${t('booking.city')}: ${t('booking.kinshasa')}`,
          t('booking.dailyCancellationSummary'),
          hasFuelOption || (typeof bookingOptions.fuel === 'number' && bookingOptions.fuel > 0)
            ? t('booking.fuelIncluded')
            : t('booking.fuelAtClientExpense'),
          hasFlexExtension ? t('booking.flexHoursSummary') : null,
          hasPremiumExtension ? t('booking.premiumHoursSummary') : null,
          booking.couponCode ? `${t('booking.promoCodeLabel')}: ${booking.couponCode}` : null,
          couponDiscountAmount && couponDiscountAmount > 0
            ? `${t('booking.discount')}: - ${couponDiscountAmount} $`
            : null,
        ].filter(Boolean) as string[])
      : [];
  const isStandardClient = booking.client?.clientType !== ClientType.PREMIUM;
  const canPayBooking = isStandardClient && !booking.isPaid;
  const canCancelBooking = canClientCancelBooking(booking);

  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={onClose}
      transparent={false}
      presentationStyle="formSheet"
      statusBarTranslucent={!disableStatusBar}>
      <View style={[styles.modalContainer, { backgroundColor: modalBg }]}>
        <View style={[styles.modalHeader, { backgroundColor: modalBg }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={{ color: fg, fontSize: 24 }}>× </Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: fg, flex: 1, textAlign: 'center' }]}>
            {t('reservations.detailTitle')}
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
          <Image
            source={{ uri: getCarImage(booking) }}
            style={styles.detailCarImage}
            resizeMode="cover"
          />

          <View
            style={[
              styles.statusBadgeLarge,
              { backgroundColor: `${statusColor}22`, borderColor: statusColor },
            ]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>
              {t(STATUS_LABELS[booking.status] ?? 'reservations.status.pending')}
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: bg, padding: 10, marginTop: 10 }]}>
            <Text style={[styles.sectionTitle, { color: fg }]}>
              {t('reservations.section.booking')}
            </Text>
            <Row label={t('reservations.field.id')} value={booking.id} />
            <Row
              label={t('reservations.field.type')}
              value={
                booking.type === ResType.LOC
                  ? t('reservations.type.dailyRental')
                  : t('reservations.type.airportTransfer')
              }
            />
            <Row
              label={t('reservations.field.vehicle')}
              value={`${booking.car?.name ?? '—'} (${booking.car?.registrationId ?? '—'})`}
            />
            <Row
              label={t('reservations.field.departure')}
              value={fmtDateTime(booking.departureAt, appLocale)}
            />
            <Row
              label={t('reservations.field.return')}
              value={fmtDateTime(booking.arrivalAt, appLocale)}
            />
            {booking.rideStartAt && (
              <Row
                label={t('reservations.field.rideStart')}
                value={fmtDateTime(booking.rideStartAt, appLocale)}
              />
            )}
            {booking.rideEndAt && (
              <Row
                label={t('reservations.field.rideEnd')}
                value={fmtDateTime(booking.rideEndAt, appLocale)}
              />
            )}
            <Row
              label={t('reservations.field.total')}
              value={booking.total != null ? `${booking.total} $` : '—'}
            />
            <Row
              label={t('reservations.field.paid')}
              value={booking.isPaid ? t('common.yes') : t('common.no')}
            />
          </View>

          {canPayBooking &&
          (booking.status === ResStatus.PENDING || booking.status === ResStatus.PENDINGDRIVER) ? (
            <View style={[styles.card, { backgroundColor: bg, padding: 14, marginTop: 10 }]}>
              <Button
                className="h-11 rounded-xl bg-orange-500"
                onPress={() => onOpenPayment(booking)}>
                <Text style={styles.primaryButtonText}>{t('reservations.payment.open')}</Text>
              </Button>
            </View>
          ) : null}

          <View style={[styles.card, { backgroundColor: bg, padding: 10, marginTop: 10 }]}>
            <Text style={[styles.sectionTitle, { color: fg }]}>
              {t('reservations.section.places')}
            </Text>
            <Row
              label={t('reservations.field.departure')}
              value={booking.departure?.label ?? '—'}
            />
            <Row
              label={t('reservations.field.arrival')}
              value={booking.type === ResType.LOC ? '...' : (booking.arrival?.label ?? '—')}
            />
            {booking.taVolNumber && (
              <Row label={t('reservations.field.flightNumber')} value={booking.taVolNumber} />
            )}
          </View>

          {dailyDetails.length > 0 ? (
            <View style={[styles.card, { backgroundColor: bg, padding: 10, marginTop: 10 }]}>
              <Text style={[styles.sectionTitle, { color: fg }]}>{t('booking.detailsTitle')}</Text>
              {dailyDetails.map((detail, index) => (
                <View key={`${booking.id}-detail-${index}`} style={styles.listRow}>
                  <Ionicons name="checkmark" size={18} color="orange" />
                  <Text style={{ color: fg, flex: 1, marginLeft: 10 }}>{detail}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={[styles.card, { backgroundColor: bg, padding: 10, marginTop: 10 }]}>
            <Text style={[styles.sectionTitle, { color: fg }]}>{t('booking.priceDetails')}</Text>
            {priceRecap.optionsMissing ? (
              <Text style={{ color: sub, fontSize: 13, marginBottom: 8 }}>
                {t('booking.priceDetailUnavailable')}
              </Text>
            ) : null}
            {priceRecap.lines
              .filter((line) => line.group !== 'total')
              .map((line, index) => (
                <Row
                  key={`recap-${index}-${line.label}`}
                  label={line.label}
                  value={
                    line.group === 'discount'
                      ? `- ${formatRecapPriceWithCurrency(Math.abs(line.amount))}`
                      : line.amount > 0
                        ? formatRecapPriceWithCurrency(line.amount)
                        : '—'
                  }
                />
              ))}
            <Row
              label={t('booking.rentalPrice')}
              value={formatRecapPriceWithCurrency(priceRecap.rentalSubtotal)}
            />
            {priceRecap.extraHoursSubtotal > 0 ||
            priceRecap.lines.some((line) => line.group === 'extraHours') ? (
              <Row
                label={t('booking.extraHoursPrice')}
                value={formatRecapPriceWithCurrency(priceRecap.extraHoursSubtotal)}
              />
            ) : null}
            <Row
              label={t('booking.totalToPay')}
              value={formatRecapPriceWithCurrency(Number(booking.total) || 0)}
            />
          </View>

          {booking.driver &&
          (booking.status === ResStatus.CONFIRMED || booking.status === ResStatus.STARTED) ? (
            <View style={[styles.card, { backgroundColor: bg, padding: 10, marginTop: 10 }]}>
              <Text style={[styles.sectionTitle, { color: fg }]}>
                {t('reservations.section.driver')}
              </Text>
              <View style={styles.driverRow}>
                <Image
                  source={{ uri: driverAvatar ?? CAR_PLACEHOLDER }}
                  style={styles.driverAvatar}
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.driverName, { color: fg }]}>{driverName}</Text>
                  <Text style={[styles.driverMeta, { color: sub }]}>
                    {t('reservations.field.license')} : {booking.driver.licenseNumber ?? '—'}
                  </Text>
                  <Text style={[styles.driverMeta, { color: sub }]}>
                    {t('reservations.field.status')} : {booking.driver.status}
                  </Text>
                </View>
              </View>
              {driverPhone ? (
                <View style={styles.contactRow}>
                  <TouchableOpacity
                    style={[styles.contactBtn, { backgroundColor: '#25D366' }]}
                    onPress={() =>
                      Linking.openURL(`https://wa.me/${driverPhone.replace(/\D/g, '')}`)
                    }>
                    <Text style={styles.contactBtnText}>💬 {t('settings.whatsapp')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.contactBtn, { backgroundColor: '#2196F3' }]}
                    onPress={() => Linking.openURL(`tel:${driverPhone}`)}>
                    <Text style={styles.contactBtnText}>📞 {t('settings.call')}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          ) : null}

          {booking.client ? (
            <View style={[styles.card, { backgroundColor: bg, padding: 10, marginTop: 10 }]}>
              <Text style={[styles.sectionTitle, { color: fg }]}>
                {t('reservations.section.client')}
              </Text>
              <Row label={t('reservations.field.name')} value={booking.client.full_name ?? '—'} />
              <Row label={t('reservations.field.email')} value={booking.client.email} />
              <Row label={t('reservations.field.phone')} value={booking.client.phone ?? '—'} />
            </View>
          ) : null}

          {hasGuestBooking ? (
            <View style={[styles.card, { backgroundColor: bg, padding: 10, marginTop: 10 }]}>
              <Text style={[styles.sectionTitle, { color: fg }]}>
                {t('booking.reservationFor')}
              </Text>
              {guestName ? <Row label={t('reservations.field.name')} value={guestName} /> : null}
              {guestPhone ? <Row label={t('reservations.field.phone')} value={guestPhone} /> : null}
              {guestEmail ? <Row label={t('reservations.field.email')} value={guestEmail} /> : null}
            </View>
          ) : null}

          {booking.review ? (
            <View style={[styles.card, { backgroundColor: bg, padding: 10, marginTop: 10 }]}>
              <Text style={[styles.sectionTitle, { color: fg }]}>
                {t('reservations.section.review')}
              </Text>
              <Row
                label={t('reservations.field.driving')}
                value={`${booking.review.ratingDriving}/5`}
              />
              <Row
                label={t('reservations.field.punctuality')}
                value={`${booking.review.ratingPunctuality}/5`}
              />
              <Row
                label={t('reservations.field.service')}
                value={`${booking.review.ratingService}/5`}
              />
              <Row
                label={t('reservations.field.vehicle')}
                value={`${booking.review.ratingVehicle}/5`}
              />
              {booking.review.comment ? (
                <Row label={t('reservations.section.comment')} value={booking.review.comment} />
              ) : null}
            </View>
          ) : null}

          {booking.status === ResStatus.ENDED && !booking.review && booking.driverId ? (
            <View style={[styles.card, { backgroundColor: bg, padding: 14, marginTop: 10 }]}>
              <Text style={[styles.sectionTitle, { color: fg }]}>
                {t('reservations.reviewForm.ctaTitle')}
              </Text>
              <Text style={[styles.ctaDescription, { color: sub }]}>
                {t('reservations.reviewForm.ctaDescription')}
              </Text>
              <Button
                className="h-11 rounded-xl bg-orange-500"
                onPress={() => onOpenReview(booking)}>
                <Text style={styles.primaryButtonText}>{t('reservations.reviewForm.open')}</Text>
              </Button>
            </View>
          ) : null}

          {booking.coupon ? (
            <View style={[styles.card, { backgroundColor: bg, padding: 10, marginTop: 10 }]}>
              <Text style={[styles.sectionTitle, { color: fg }]}>
                {t('reservations.section.coupon')}
              </Text>
              <Row
                label={t('reservations.field.discount')}
                value={`-${booking.coupon.discountAmount} j`}
              />
              <Row
                label={t('reservations.field.beforeDiscount')}
                value={`${booking.coupon.originalAmount} j`}
              />
            </View>
          ) : null}

          {booking.commentaire ? (
            <View style={[styles.card, { backgroundColor: bg, padding: 10, marginTop: 10 }]}>
              <Text style={[styles.sectionTitle, { color: fg }]}>
                {t('reservations.section.comment')}
              </Text>
              <Text style={[styles.commentText, { color: sub }]}>{booking.commentaire}</Text>
            </View>
          ) : null}

          {resolveInvoiceKind({
            status: booking.status,
            isPaid: Boolean(booking.isPaid),
          }) !== 'none' ? (
            <View style={[styles.card, { backgroundColor: bg, padding: 14, marginTop: 10 }]}>
              <Text style={[styles.sectionTitle, { color: fg, marginBottom: 10 }]}>
                {t('billing.title')}
              </Text>
              <InvoiceDownloadButton booking={booking} />
            </View>
          ) : null}

          {canCancelBooking ? (
            <View style={[styles.card, { backgroundColor: bg, padding: 14, marginTop: 10 }]}>
              <Button
                className="h-11 rounded-xl bg-red-500"
                onPress={() => onClientCancelBooking(booking)}
                disabled={isCancelling}>
                {isCancelling ? (
                  <View style={styles.cancelButtonContent}>
                    <ActivityIndicator size="small" color="#ffffff" />
                    <Text style={styles.primaryButtonText}>{t('reservations.cancelLoading')}</Text>
                  </View>
                ) : (
                  <Text style={styles.primaryButtonText}>{t('reservations.cancelAction')}</Text>
                )}
              </Button>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    marginHorizontal: 0,
  },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 16,
    borderBottomColor: '#ccc',
  },
  closeBtn: { marginRight: 12 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalScroll: { padding: 16, paddingBottom: 40 },
  detailCarImage: { width: '100%', height: 200, borderRadius: 14, marginBottom: 4 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailLabel: { fontSize: 13, flex: 1 },
  detailValue: { fontSize: 13, fontWeight: '500', flex: 2, textAlign: 'right' },
  statusBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginVertical: 12,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 5 },
  statusBadgeText: { fontSize: 13, fontWeight: '600' },
  driverRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  driverAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#ccc' },
  driverName: { fontSize: 15, fontWeight: '600' },
  driverMeta: { fontSize: 12 },
  contactRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  contactBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  contactBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  primaryButtonText: { color: '#ffffff', fontWeight: '700' },
  ctaDescription: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  commentText: { fontSize: 13, lineHeight: 18 },
  cancelButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
