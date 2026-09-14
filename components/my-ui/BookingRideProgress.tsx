import { useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ResStatus } from '@/constants/databaseEnum';
import { useI18n } from '@/lib/i18n';
import { useLayoutScale } from '@/lib/layout-scale';

type RideStepId = 'payment' | 'confirmed' | 'driver' | 'started' | 'ended';
type RideStepState = 'completed' | 'current' | 'upcoming';

function getCurrentStep(status: ResStatus, hasPaymentStep: boolean, isPaid: boolean) {
  if (
    hasPaymentStep &&
    !isPaid &&
    (status === ResStatus.PENDING || status === ResStatus.PENDINGDRIVER)
  ) {
    return 0;
  }

  const offset = hasPaymentStep ? 1 : 0;

  switch (status) {
    case ResStatus.CONFIRMED:
      return 1 + offset;
    case ResStatus.STARTED:
      return 2 + offset;
    case ResStatus.ENDED:
    case ResStatus.ARCHIVED:
      return 3 + offset;
    default:
      return offset;
  }
}

function getStepState(
  index: number,
  currentStep: number,
  isFinal: boolean
): RideStepState {
  if (index < currentStep || (isFinal && index === currentStep)) {
    return 'completed';
  }

  if (index === currentStep && !isFinal) {
    return 'current';
  }

  return 'upcoming';
}

export function BookingRideProgress({
  status,
  isPaid,
  isStandardClient,
}: {
  status: ResStatus;
  isPaid: boolean;
  isStandardClient: boolean;
}) {
  const { t } = useI18n();
  const { s, font } = useLayoutScale();
  const [isOpen, setIsOpen] = useState(false);
  const hasPaymentStep = isStandardClient;
  const currentStep = getCurrentStep(status, hasPaymentStep, isPaid);
  const isFinal = status === ResStatus.ENDED || status === ResStatus.ARCHIVED;

  const steps = useMemo(
    () =>
      [
        ...(hasPaymentStep
          ? [
              {
                id: 'payment' as const,
                defaultLabel: t('rideTracking.paymentPending'),
                currentLabel: t('rideTracking.paymentPending'),
                completedLabel: t('rideTracking.paid'),
              },
            ]
          : []),
        {
          id: 'confirmed' as const,
          defaultLabel: t('rideTracking.rideConfirmed'),
          completedLabel: t('rideTracking.rideConfirmed'),
        },
        {
          id: 'driver' as const,
          defaultLabel: t('rideTracking.driverAssignment'),
          currentLabel: t('rideTracking.driverAssigned'),
          completedLabel: t('rideTracking.driverAssigned'),
        },
        {
          id: 'started' as const,
          defaultLabel: t('rideTracking.rideStart'),
          currentLabel: t('rideTracking.rideInProgress'),
          completedLabel: t('rideTracking.rideInProgress'),
        },
        {
          id: 'ended' as const,
          defaultLabel: t('rideTracking.rideCompleted'),
          completedLabel: t('rideTracking.rideCompleted'),
        },
      ] satisfies Array<{
        id: RideStepId;
        defaultLabel: string;
        currentLabel?: string;
        completedLabel?: string;
      }>,
    [hasPaymentStep, t]
  );

  if (status === ResStatus.CANCELED) return null;

  const getStepLabel = (step: (typeof steps)[number], state: RideStepState) => {
    if (state === 'completed') {
      return step.completedLabel ?? step.defaultLabel;
    }

    if (state === 'current') {
      return step.currentLabel ?? step.defaultLabel;
    }

    return step.defaultLabel;
  };

  const getStateLabel = (state: RideStepState) => {
    if (state === 'completed') return t('rideTracking.completed');
    if (state === 'current') return t('rideTracking.current');
    return t('rideTracking.upcoming');
  };

  const getCurrentDescription = () => {
    if (hasPaymentStep && !isPaid && currentStep === 0) {
      return t('rideTracking.waitingPayment');
    }

    switch (status) {
      case ResStatus.PENDING:
      case ResStatus.PENDINGDRIVER:
        return t('rideTracking.waitingDriverAssignment');
      case ResStatus.CONFIRMED:
        return t('rideTracking.nextRideStart');
      case ResStatus.STARTED:
        return t('rideTracking.inProgressDescription');
      case ResStatus.ENDED:
      case ResStatus.ARCHIVED:
        return t('rideTracking.completedDescription');
      default:
        return t('rideTracking.upcoming');
    }
  };

  const currentStepItem = steps[Math.min(currentStep, steps.length - 1)];
  const currentState = getStepState(Math.min(currentStep, steps.length - 1), currentStep, isFinal);
  const currentLabel = currentStepItem ? getStepLabel(currentStepItem, currentState) : '';
  const currentDescription = getCurrentDescription();
  const currentColor = currentState === 'completed' ? '#16A34A' : '#FF5705';

  const renderMarker = (state: RideStepState, size = 24) => {
    const markerColor = state === 'completed' ? '#22C55E' : state === 'current' ? '#FF5705' : '#D1D5DB';

    return (
      <View
        className="items-center justify-center rounded-full border-2 bg-white dark:bg-[#1E1E1E]"
        style={{
          width: s(size),
          height: s(size),
          borderColor: markerColor,
          backgroundColor: state === 'completed' ? '#22C55E' : undefined,
        }}>
        {state === 'completed' ? (
          <Ionicons name="checkmark" size={s(size * 0.62)} color="#FFFFFF" />
        ) : state === 'current' ? (
          <View className="h-2.5 w-2.5 rounded-full bg-primary" />
        ) : null}
      </View>
    );
  };

  return (
    <View className="mb-4 overflow-hidden rounded-2xl border border-outline-100 bg-white dark:bg-[#1E1E1E]">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <TouchableOpacity
            className="flex-row items-center px-4 py-4"
            accessibilityRole="button"
            accessibilityState={{ expanded: isOpen }}
            accessibilityLabel={isOpen ? t('rideTracking.hideSteps') : t('rideTracking.showAllSteps')}>
            <View className="flex-1">
              <Text className="font-bold text-typography-900" style={{ fontSize: font.base }}>
                {t('rideTracking.title')}
              </Text>
              {!isOpen ? (
                <View className="mt-3 flex-row items-start">
                  {renderMarker(currentState)}
                  <View className="ml-3 flex-1">
                    <Text
                      className="font-semibold"
                      style={{ color: currentColor, fontSize: font.sm }}>
                      {currentLabel}
                    </Text>
                    {!isFinal ? (
                      <Text className="mt-1 text-typography-500" style={{ fontSize: font.xs }}>
                        {currentDescription}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : null}
            </View>
            <Ionicons
              name={isOpen ? 'chevron-up' : 'chevron-down'}
              size={s(20)}
              color="#6B7280"
            />
          </TouchableOpacity>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <View className="border-t border-outline-100 px-4 pb-4 pt-3">
            {steps.map((step, index) => {
              const state = getStepState(index, currentStep, isFinal);
              const label = getStepLabel(step, state);
              const stateColor =
                state === 'completed' ? '#16A34A' : state === 'current' ? '#FF5705' : '#9CA3AF';
              const lineColor = index < currentStep || (isFinal && index < steps.length - 1)
                ? '#22C55E'
                : '#E5E7EB';

              return (
                <View key={step.id} className="flex-row">
                  <View className="items-center">
                    {renderMarker(state)}
                    {index < steps.length - 1 ? (
                      <View className="w-0.5 flex-1" style={{ backgroundColor: lineColor, minHeight: s(18) }} />
                    ) : null}
                  </View>
                  <View className={`ml-3 flex-1 ${index < steps.length - 1 ? 'pb-4' : ''}`}>
                    <View className="flex-row items-center justify-between">
                      <Text
                        className="mr-3 flex-1 font-semibold"
                        style={{
                          color:
                            state === 'completed'
                              ? '#16A34A'
                              : state === 'current'
                                ? '#FF5705'
                                : '#6B7280',
                          fontSize: font.sm,
                        }}>
                        {label}
                      </Text>
                      <Text className="font-medium" style={{ color: stateColor, fontSize: font.xs }}>
                        {getStateLabel(state)}
                      </Text>
                    </View>
                    {state === 'current' && !isFinal ? (
                      <Text className="mt-1 text-typography-500" style={{ fontSize: font.xs }}>
                        {currentDescription}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        </CollapsibleContent>
      </Collapsible>
    </View>
  );
}
