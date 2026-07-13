import { useMemo } from 'react';
import { Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { BookingSheetLayout, type SheetFooterAction } from '@/components/my-ui/BookingSheetLayout';
import { ClientType, ResStatus, ResType } from '@/constants/databaseEnum';
import { Booking } from '@/constants/dataInterface';
import { bookingSpacing } from '@/constants/spacing';
import { TranslationKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<ResStatus, string> = {
  [ResStatus.PENDING]: '#FFA500',
  [ResStatus.PENDINGDRIVER]: '#FFC107',
  [ResStatus.CONFIRMED]: '#2196F3',
  [ResStatus.STARTED]: '#9C27B0',
  [ResStatus.ENDED]: '#4CAF50',
  [ResStatus.CANCELED]: '#F44336',
  [ResStatus.ARCHIVED]: '#9E9E9E',
};

const STATUS_LABELS: Record<ResStatus, TranslationKey> = {
  [ResStatus.PENDING]: 'reservations.status.pending',
  [ResStatus.PENDINGDRIVER]: 'reservations.status.pendingDriver',
  [ResStatus.CONFIRMED]: 'reservations.status.confirmed',
  [ResStatus.STARTED]: 'reservations.status.started',
  [ResStatus.ENDED]: 'reservations.status.ended',
  [ResStatus.CANCELED]: 'reservations.status.canceled',
  [ResStatus.ARCHIVED]: 'reservations.status.archived',
};

const CLIENT_CANCELLABLE_STATUSES: ResStatus[] = [
  ResStatus.PENDING,
  ResStatus.PENDINGDRIVER,
  ResStatus.CONFIRMED,
];

const CAR_PLACEHOLDER = 'https://via.placeholder.com/120x80';

function fmtDateTime(iso: string | null | undefined, locale: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getCarImage(booking: Booking): string {
  const imgs = booking.car?.images;
  if (imgs && imgs.length > 0) return imgs[0] as string;
  return CAR_PLACEHOLDER;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between py-3">
      <Text className="text-typography-500 w-[30%] shrink text-sm">{label}</Text>
      <Text className="text-typography-900 ml-4 flex-1 text-right text-sm font-bold">{value}</Text>
    </View>
  );
}

function SolidDivider({ className }: { className?: string }) {
  return <View className={cn('border-outline-100 border-t opacity-40', className)} />;
}

function DashedDivider() {
  return (
    <View
      className="my-1"
      style={{
        borderTopWidth: StyleSheet.hairlineWidth,
        borderStyle: 'dashed',
        borderColor: '#e5e7eb',
      }}
    />
  );
}

export function canClientCancelBooking(booking: Booking) {
  if (!CLIENT_CANCELLABLE_STATUSES.includes(booking.status)) {
    return false;
  }

  if (!booking.departureAt) {
    return false;
  }

  const departureTime = new Date(booking.departureAt).getTime();

  if (Number.isNaN(departureTime)) {
    return false;
  }

  return departureTime - Date.now() >= 24 * 60 * 60 * 1000;
}

export interface BookingDetailSheetProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenReview: (booking: Booking) => void;
  onOpenPayment: (booking: Booking) => void;
  onClientCancelBooking: (booking: Booking) => void;
  isCancelling: boolean;
  t: (key: TranslationKey) => string;
  appLocale: string;
}

export function BookingDetailSheet({
  booking,
  isOpen,
  onClose,
  onOpenReview,
  onOpenPayment,
  onClientCancelBooking,
  isCancelling,
  t,
  appLocale,
}: BookingDetailSheetProps) {
  const footerActions = useMemo((): SheetFooterAction[] => {
    if (!booking) {
      return [];
    }

    // Construit les actions contextuelles affichées dans le pied de la feuille.
    const actions: SheetFooterAction[] = [];
    const isStandardClient = booking.client?.clientType !== ClientType.PREMIUM;
    const canPayBooking = isStandardClient && !booking.isPaid;
    const canCancelBooking = canClientCancelBooking(booking);

    if (
      canPayBooking &&
      (booking.status === ResStatus.PENDING || booking.status === ResStatus.PENDINGDRIVER)
    ) {
      actions.push({
        label: t('reservations.payment.open'),
        onPress: () => onOpenPayment(booking),
      });
    }

    if (booking.status === ResStatus.ENDED && !booking.review && booking.driverId) {
      actions.push({
        label: t('reservations.reviewForm.open'),
        onPress: () => onOpenReview(booking),
      });
    }

    if (canCancelBooking) {
      actions.push({
        label: isCancelling ? 'Annulation...' : 'Annuler la course',
        variant: 'outline',
        disabled: isCancelling,
        onPress: () => onClientCancelBooking(booking),
      });
    }

    return actions;
  }, [booking, isCancelling, onClientCancelBooking, onOpenPayment, onOpenReview, t]);

  if (!booking) {
    return null;
  }

  const statusColor = STATUS_COLORS[booking.status] ?? '#999';
  const driverUser = booking.driver?.user as Record<string, string> | undefined;
  const driverAvatar = driverUser?.avatar_url ?? null;
  const driverName = driverUser?.full_name ?? '—';
  const driverPhone = driverUser?.phone ?? null;
  const totalValue = booking.total != null ? `${booking.total} $` : '—';
  const showDriver =
    !!booking.driver &&
    (booking.status === ResStatus.CONFIRMED || booking.status === ResStatus.STARTED);

  return (
    <BookingSheetLayout
      visible={isOpen && !!booking}
      onDismiss={onClose}
      title={t('reservations.detailTitle')}
      snapPoints={[90]}
      footerActions={footerActions}>
      <View
        style={{
          paddingHorizontal: bookingSpacing.screenPaddingX,
          paddingTop: bookingSpacing.sectionGap,
          paddingBottom: 16,
        }}>
        {/* Visuel principal du vehicule associe a la reservation. */}
        <Image
          source={{ uri: getCarImage(booking) }}
          style={detailStyles.carImage}
          resizeMode="cover"
        />

        {/* Badge de statut pour donner l'etat courant en un coup d'oeil. */}
        <View
          className="w-full flex-row items-center justify-center self-center rounded-full p-4 text-center"
          style={{
            backgroundColor: `${statusColor}22`,
            marginVertical: 12,
          }}>
          <View
            className="mr-1.5 h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: statusColor }}
          />
          <Text className="text-sm font-semibold" style={{ color: statusColor }}>
            {t(STATUS_LABELS[booking.status] ?? 'reservations.status.pending')}
          </Text>
        </View>

        <View className="mt-2">
          {/* Resume principal: identite, type, vehicule et horaires de la course. */}
          <DetailRow label={t('reservations.field.id')} value={booking.id} />
          <DetailRow
            label={t('reservations.field.type')}
            value={
              booking.type === ResType.LOC
                ? t('reservations.type.dailyRental')
                : t('reservations.type.airportTransfer')
            }
          />
          <DetailRow
            label={t('reservations.field.vehicle')}
            value={`${booking.car?.name ?? '—'} ${showDriver ? `(${booking.car?.registrationId ?? '—'})` : ''}  `}
          />
          <DetailRow
            label={t('reservations.field.time.departure')}
            value={fmtDateTime(booking.departureAt, appLocale)}
          />
          <DetailRow
            label={t('reservations.field.time.return')}
            value={fmtDateTime(booking.arrivalAt, appLocale)}
          />
          {booking.rideStartAt ? (
            <DetailRow
              label={t('reservations.field.rideStart')}
              value={fmtDateTime(booking.rideStartAt, appLocale)}
            />
          ) : null}
          {booking.rideEndAt ? (
            <DetailRow
              label={t('reservations.field.rideEnd')}
              value={fmtDateTime(booking.rideEndAt, appLocale)}
            />
          ) : null}
          <DetailRow
            label={t('reservations.field.paid')}
            value={booking.isPaid ? t('common.yes') : t('common.no')}
          />

          <SolidDivider className="my-4" />

          {/* Lieux de prise en charge et de destination, plus les infos de vol si besoin. */}

          <DetailRow
            label={t('reservations.field.departure')}
            value={booking.departure?.label ?? '—'}

          />
          { booking.arrival?.label && (  
                <DetailRow
                label={t('reservations.field.return')}
                value={booking.arrival?.label ?? '—'}
              />)
             }
         
          {booking.taVolNumber ? (
            <DetailRow label={t('reservations.field.flightNumber')} value={booking.taVolNumber} />
          ) : null}

          {showDriver ? (
            <>
              <SolidDivider />
              {/* Informations chauffeur et raccourcis de contact lorsque la course est affectee. */}
              <View className="py-3">
                <View className="flex-row items-center">
                  <Image
                    source={{ uri: driverAvatar ?? CAR_PLACEHOLDER }}
                    style={driverStyles.avatar}
                  />
                  <View className="ml-3 min-w-0 flex-1">
                    <Text className="text-typography-900 text-sm font-bold">{driverName}</Text>
                    <Text className="text-typography-500 mt-1 text-sm">
                      {t('reservations.field.license')} : {booking.driver?.licenseNumber ?? '—'}
                    </Text>
                    <Text className="text-typography-500 mt-1 text-sm">
                      {t('reservations.field.status')} : {booking.driver?.status}
                    </Text>
                  </View>
                </View>
                {driverPhone ? (
                  <View className="mt-3 flex-row gap-2.5">
                    <TouchableOpacity
                      className="flex-1 items-center rounded-xl py-2.5"
                      style={{ backgroundColor: '#25D366' }}
                      onPress={() =>
                        Linking.openURL(`https://wa.me/${driverPhone.replace(/\D/g, '')}`)
                      }>
                      <Text className="text-sm font-bold text-white">
                        💬 {t('settings.whatsapp')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="flex-1 items-center rounded-xl py-2.5"
                      style={{ backgroundColor: '#2196F3' }}
                      onPress={() => Linking.openURL(`tel:${driverPhone}`)}>
                      <Text className="text-sm font-bold text-white">📞 {t('settings.call')}</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            </>
          ) : null}

          {booking.client ? (
            <>
              <SolidDivider className="my-4" />
              {/* Coordonnees du client rattache a la reservation. */}
              <DetailRow
                label={t('reservations.field.name')}
                value={booking.client.full_name ?? '—'}
              />
              <DetailRow label={t('reservations.field.email')} value={booking.client.email} />
              <DetailRow
                label={t('reservations.field.phone')}
                value={booking.clientPhone ?? booking.client.phone ?? '—'}
              />
            </>
          ) : null}

          {booking.review ? (
            <>
              <SolidDivider className="my-4" />
              {/* Notes et commentaire laisses apres la course. */}
              <DetailRow
                label={t('reservations.field.driving')}
                value={`${booking.review.ratingDriving}/5`}
              />
              <DetailRow
                label={t('reservations.field.punctuality')}
                value={`${booking.review.ratingPunctuality}/5`}
              />
              <DetailRow
                label={t('reservations.field.service')}
                value={`${booking.review.ratingService}/5`}
              />
              <DetailRow
                label={t('reservations.field.vehicle')}
                value={`${booking.review.ratingVehicle}/5`}
              />
              {booking.review.comment ? (
                <DetailRow
                  label={t('reservations.section.comment')}
                  value={booking.review.comment}
                />
              ) : null}
            </>
          ) : null}

          {booking.status === ResStatus.ENDED && !booking.review && booking.driverId ? (
            <>
              <SolidDivider className="my-4" />
              {/* Invitation a laisser un avis quand la course est terminee. */}
              <View className="py-3">
                <Text className="text-typography-900 text-sm font-bold">
                  {t('reservations.reviewForm.ctaTitle')}
                </Text>
                <Text className="text-typography-500 mt-2 text-sm leading-5">
                  {t('reservations.reviewForm.ctaDescription')}
                </Text>
              </View>
            </>
          ) : null}

          {booking.coupon ? (
            <>
              <SolidDivider className="my-4" />
              {/* Detail de la remise appliquee sur la reservation. */}
              <DetailRow
                label={t('reservations.field.discount')}
                value={`-${booking.coupon.discountAmount} $`}
              />
              <DetailRow
                label={t('reservations.field.beforeDiscount')}
                value={`${booking.coupon.originalAmount} $`}
              />
            </>
          ) : null}

          {booking.commentaire ? (
            <>
              <SolidDivider className="my-4" />
              {/* Commentaire libre saisi au moment de la reservation. */}
              <View className="py-3">
                <Text className="text-typography-500 text-sm">{booking.commentaire}</Text>
              </View>
            </>
          ) : null}

          <SolidDivider className="my-4" />

          {/* Recapitulatif financier affiche en bas de la fiche. */}
          <DetailRow label={t('reservations.field.total')} value={totalValue} />

          <DashedDivider />

          
        </View>
      </View>
    </BookingSheetLayout>
  );
}

const detailStyles = StyleSheet.create({
  carImage: {
    width: '100%',
    height: 200,
    borderRadius: 14,
    marginBottom: 4,
  },
});

const driverStyles = StyleSheet.create({
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ccc',
  },
});
