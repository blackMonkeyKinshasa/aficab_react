import { usePostHog } from 'posthog-react-native';
import { Platform } from 'react-native';
import { ResType } from '@/constants/databaseEnum';

// ─── Helpers ────────────────────────────────────────────────────────────────

export function useAnalytics() {
  const posthog = usePostHog();

  return {
    // ── Authentification ──────────────────────────────────────────────────

    trackLogin(userId: string, email: string, phone: string | null) {
      posthog.capture('auth_login_succeeded', {
        user_id: userId,
        email,
        phone: phone ?? 'non renseigné',
        platform: Platform.OS,
      });
    },

    trackLogout(userId: string) {
      posthog.capture('auth_logout_completed', { user_id: userId });
    },

    // ── Parcours réservation ──────────────────────────────────────────────

    trackBookingStarted(type: ResType, params: {
      origin?: string;
      destination?: string;
      dateStart?: string;
      dateEnd?: string;
      tripType?: 'one-way' | 'round-trip';
    }) {
      posthog.capture('booking_flow_started', {
        reservation_type: type,
        origin: params.origin,
        destination: params.destination,
        date_start: params.dateStart,
        date_end: params.dateEnd,
        trip_type: params.tripType,
        platform: Platform.OS,
      });
    },

    trackVehicleSelected(carId: string, params: {
      carName: string;
      category: string | null;
      seats: number;
      fuel: string;
      price: number;
      reservationType: ResType;
    }) {
      posthog.capture('booking_vehicle_selected', {
        car_id: carId,
        car_name: params.carName,
        car_category: params.category,
        seats: params.seats,
        fuel: params.fuel,
        price: params.price,
        reservation_type: params.reservationType,
        platform: Platform.OS,
      });
    },

    trackVehicleOptionsChosen(carId: string, options: {
      withFuel: boolean;
      withDriver: boolean;
      extraOptions: string[];
      totalPrice: number;
    }) {
      posthog.capture('booking_vehicle_options_selected', {
        car_id: carId,
        with_fuel: options.withFuel,
        with_driver: options.withDriver,
        extra_options: options.extraOptions,
        total_price: options.totalPrice,
        platform: Platform.OS,
      });
    },

    trackBookingConfirmed(bookingId: string, params: {
      reservationType: ResType;
      carName: string;
      totalPrice: number;
      paymentMethod: string;
      origin?: string;
      destination?: string;
    }) {
      posthog.capture('booking_confirmation_completed', {
        booking_id: bookingId,
        reservation_type: params.reservationType,
        car_name: params.carName,
        total_price: params.totalPrice,
        payment_method: params.paymentMethod,
        origin: params.origin,
        destination: params.destination,
        platform: Platform.OS,
      });
    },

    // ── Paiement ──────────────────────────────────────────────────────────

    trackPaymentMethodSelected(method: string, phone?: string) {
      posthog.capture('payment_method_selected', {
        method,
        has_phone: !!phone && phone.length > 0,
        platform: Platform.OS,
      });
    },

    trackPaymentSubmitted(method: string, bookingId?: string) {
      posthog.capture('payment_submission_requested', {
        method,
        booking_id: bookingId,
        platform: Platform.OS,
      });
    },

    trackPaymentModalOpened(params: {
      bookingId: string;
      reservationType: ResType;
      totalPrice: number;
      carId: string | null;
      carName: string | null;
      hasGuest: boolean;
      hasComment: boolean;
    }) {
      posthog.capture('payment_modal_opened', {
        booking_id: params.bookingId,
        reservation_type: params.reservationType,
        total_price: params.totalPrice,
        car_id: params.carId,
        car_name: params.carName,
        has_guest: params.hasGuest,
        has_comment: params.hasComment,
        platform: Platform.OS,
      });
    },

    trackPaymentModalClosed(params: {
      bookingId?: string;
      reservationType?: ResType;
      source: 'backdrop' | 'flow-exit' | 'completion';
    }) {
      posthog.capture('payment_modal_closed', {
        booking_id: params.bookingId,
        reservation_type: params.reservationType,
        source: params.source,
        platform: Platform.OS,
      });
    },

    trackPaymentValidationFailed(params: {
      bookingId?: string;
      reservationType?: ResType;
      paymentMethod: string;
      reason: string;
    }) {
      posthog.capture('payment_validation_failed', {
        booking_id: params.bookingId,
        reservation_type: params.reservationType,
        payment_method: params.paymentMethod,
        reason: params.reason,
        platform: Platform.OS,
      });
    },

    trackBookingCreationRequested(params: {
      bookingId: string;
      reservationType: ResType;
      paymentMethod: string;
      paymentProvider: string;
      totalPrice: number;
      carId: string | null;
      clientId: string;
      hasGuest: boolean;
      hasComment: boolean;
    }) {
      posthog.capture('booking_creation_requested', {
        booking_id: params.bookingId,
        reservation_type: params.reservationType,
        payment_method: params.paymentMethod,
        payment_provider: params.paymentProvider,
        total_price: params.totalPrice,
        car_id: params.carId,
        client_id: params.clientId,
        has_guest: params.hasGuest,
        has_comment: params.hasComment,
        platform: Platform.OS,
      });
    },

    trackBookingCreationSucceeded(params: {
      bookingId: string;
      reservationType: ResType;
      paymentMethod: string;
      paymentProvider: string;
      totalPrice: number;
      paymentRecordsCount: number;
    }) {
      posthog.capture('booking_creation_succeeded', {
        booking_id: params.bookingId,
        reservation_type: params.reservationType,
        payment_method: params.paymentMethod,
        payment_provider: params.paymentProvider,
        total_price: params.totalPrice,
        payment_records_count: params.paymentRecordsCount,
        platform: Platform.OS,
      });
    },

    trackBookingCreationFailed(params: {
      bookingId?: string;
      reservationType?: ResType;
      paymentMethod?: string;
      paymentProvider?: string;
      errorMessage: string;
    }) {
      posthog.capture('booking_creation_failed', {
        booking_id: params.bookingId,
        reservation_type: params.reservationType,
        payment_method: params.paymentMethod,
        payment_provider: params.paymentProvider,
        error_message: params.errorMessage,
        platform: Platform.OS,
      });
    },

    trackPaymentNetworkRequested(params: {
      bookingId: string;
      paymentMethod: string;
      provider: string;
      transactionId: string;
      amount: string;
      currency: string;
      phoneNumber?: string;
    }) {
      posthog.capture('payment_provider_request_sent', {
        booking_id: params.bookingId,
        payment_method: params.paymentMethod,
        provider: params.provider,
        transaction_id: params.transactionId,
        amount: params.amount,
        currency: params.currency,
        has_phone: Boolean(params.phoneNumber),
        platform: Platform.OS,
      });
    },

    trackPaymentNetworkResponded(params: {
      bookingId: string;
      paymentMethod: string;
      provider: string;
      transactionId: string;
      status?: string | null;
      failureCode?: string | null;
      providerReference?: string | null;
    }) {
      posthog.capture('payment_provider_response_received', {
        booking_id: params.bookingId,
        payment_method: params.paymentMethod,
        provider: params.provider,
        transaction_id: params.transactionId,
        status: params.status,
        failure_code: params.failureCode,
        provider_reference: params.providerReference,
        platform: Platform.OS,
      });
    },

    trackPaymentNetworkFailed(params: {
      bookingId: string;
      paymentMethod: string;
      provider: string;
      transactionId: string;
      errorMessage: string;
    }) {
      posthog.capture('payment_provider_request_failed', {
        booking_id: params.bookingId,
        payment_method: params.paymentMethod,
        provider: params.provider,
        transaction_id: params.transactionId,
        error_message: params.errorMessage,
        platform: Platform.OS,
      });
    },

    // ── Profil utilisateur ────────────────────────────────────────────────

    trackUserIdentified(userId: string, params: {
      email: string;
      phone: string | null;
      clientType: string;
      city: string | null;
      country: string | null;
      colorScheme: string;
      platform: string;
    }) {
      posthog.identify(userId, {
        email: params.email,
        phone: params.phone ?? 'non renseigné',
        client_type: params.clientType,
        city: params.city,
        country: params.country,
        color_scheme: params.colorScheme,
        platform: params.platform,
      });
    },

    // ── GPS ───────────────────────────────────────────────────────────────

    trackUserLocation(userId: string, coords: { latitude: number; longitude: number }) {
      posthog.capture('location_capture_completed', {
        user_id: userId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        platform: Platform.OS,
      });
    },

    trackGooglePlacesAutocompleteFailed(params: {
      errorMessage: string;
      language: string;
      inputLength?: number;
      queryType: 'autocomplete';
    }) {
      posthog.capture('google_places_autocomplete_failed', {
        error_message: params.errorMessage,
        language: params.language,
        input_length: params.inputLength,
        query_type: params.queryType,
        platform: Platform.OS,
      });
    },

    // ── Parcours role / support ─────────────────────────────────────────

    trackRoleMismatchRedirect(userId: string, params: {
      email: string;
      role: string;
      sourceScreen: string;
      targetScreen: string;
    }) {
      posthog.capture('support_role_mismatch_redirected', {
        user_id: userId,
        email: params.email,
        detected_role: params.role,
        source_screen: params.sourceScreen,
        target_screen: params.targetScreen,
        platform: Platform.OS,
      });
    },

    trackRoleMismatchScreenViewed(userId: string, params: {
      email: string;
      role: string;
    }) {
      posthog.capture('support_role_mismatch_screen_viewed', {
        user_id: userId,
        email: params.email,
        detected_role: params.role,
        platform: Platform.OS,
      });
    },

    trackSupportContactOpened(userId: string, params: {
      email: string;
      role: string;
      sourceScreen: string;
    }) {
      posthog.capture('support_contact_opened', {
        user_id: userId,
        email: params.email,
        detected_role: params.role,
        source_screen: params.sourceScreen,
        platform: Platform.OS,
      });
    },

    trackSupportChannelSelected(userId: string, params: {
      email: string;
      role: string;
      sourceScreen: string;
      channel: 'whatsapp' | 'phone' | 'email';
    }) {
      posthog.capture('support_channel_selected', {
        user_id: userId,
        email: params.email,
        detected_role: params.role,
        source_screen: params.sourceScreen,
        channel: params.channel,
        platform: Platform.OS,
      });
    },
  };
}
