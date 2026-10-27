import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { getBookingInvoice, getBookingInvoicePdf } from '@/api/booking';
import { ApiError } from '@/api/apiConfig';
import { Booking } from '@/constants/dataInterface';
import { useI18n } from '@/lib/i18n';
import { invoiceDisplayId, resolveInvoiceKind } from '@/lib/invoice-kind';
import { useLayoutScale } from '@/lib/layout-scale';
import { useAppToast } from '@/lib/toast';
import { cn } from '@/lib/utils';

type InvoiceDownloadButtonProps = {
  booking: Booking;
  className?: string;
};

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  if (typeof globalThis.btoa === 'function') {
    return globalThis.btoa(binary);
  }

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  let i = 0;

  while (i < binary.length) {
    const a = binary.charCodeAt(i++);
    const b = i < binary.length ? binary.charCodeAt(i++) : Number.NaN;
    const c = i < binary.length ? binary.charCodeAt(i++) : Number.NaN;
    const bitmap = (a << 16) | ((Number.isNaN(b) ? 0 : b) << 8) | (Number.isNaN(c) ? 0 : c);
    output +=
      chars.charAt((bitmap >> 18) & 63) +
      chars.charAt((bitmap >> 12) & 63) +
      (Number.isNaN(b) ? '=' : chars.charAt((bitmap >> 6) & 63)) +
      (Number.isNaN(c) ? '=' : chars.charAt(bitmap & 63));
  }

  return output;
}

export function InvoiceDownloadButton({ booking, className }: InvoiceDownloadButtonProps) {
  const { t, tf } = useI18n();
  const toast = useAppToast();
  const { font } = useLayoutScale();
  const isDark = useColorScheme() === 'dark';
  const [loading, setLoading] = useState(false);
  const kind = resolveInvoiceKind({
    status: booking.status,
    isPaid: Boolean(booking.isPaid),
  });

  if (kind === 'none') {
    return null;
  }

  const isProforma = kind === 'proforma';
  const label = isProforma ? t('billing.downloadProforma') : t('billing.downloadInvoice');
  const fg = isProforma ? '#ffffff' : isDark ? '#ffffff' : '#111827';
  const borderColor = isProforma ? '#F97316' : isDark ? '#2F2F2F' : '#E5E7EB';
  const backgroundColor = isProforma ? '#F97316' : 'transparent';

  const onPress = async () => {
    setLoading(true);

    try {
      // Revalider côté serveur avant téléchargement (état peut avoir changé)
      const meta = await getBookingInvoice(booking.id);
      const serverKind = meta.proforma ? 'proforma' : 'invoice';
      const shareLabel =
        serverKind === 'proforma' ? t('billing.downloadProforma') : t('billing.downloadInvoice');
      const pdf = await getBookingInvoicePdf(booking.id);
      const fallbackId = invoiceDisplayId(booking.id, serverKind) ?? `DOC-${booking.id}`;
      const defaultName = `${meta.id || fallbackId}.pdf`;
      const fileName = pdf.fileName?.endsWith('.pdf') ? pdf.fileName : defaultName;
      const cacheDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;

      if (!cacheDir) {
        throw new Error(t('billing.downloadUnavailable'));
      }

      const targetUri = `${cacheDir}${fileName}`;
      await FileSystem.writeAsStringAsync(targetUri, arrayBufferToBase64(pdf.data), {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (Platform.OS === 'web') {
        const blob = new Blob([pdf.data], { type: pdf.contentType ?? 'application/pdf' });
        const url = URL.createObjectURL(blob);
        if (typeof window !== 'undefined') {
          window.open(url, '_blank');
        }
        URL.revokeObjectURL(url);
      } else if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(targetUri, {
          mimeType: 'application/pdf',
          dialogTitle: shareLabel,
          UTI: 'com.adobe.pdf',
        });
      } else {
        throw new Error(t('billing.shareUnavailable'));
      }

      toast({
        title: t('billing.title'),
        description: tf('billing.downloadSuccess', { id: meta.id || fileName }),
        action: 'success',
      });
    } catch (error) {
      const apiError = error instanceof ApiError ? error : null;
      const description =
        apiError?.status === 409
          ? t('billing.notAvailable')
          : apiError?.status === 403
            ? t('billing.forbidden')
            : apiError?.status === 404
              ? t('billing.pdfNotReady')
              : apiError?.message ||
                (error instanceof Error ? error.message : t('billing.downloadError'));

      toast({
        title: t('common.error'),
        description,
        action: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      className={cn('flex-row items-center justify-center rounded-xl border py-3', className)}
      style={{ borderColor, backgroundColor }}
      disabled={loading}
      onPress={() => void onPress()}>
      {loading ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ActivityIndicator size="small" color={fg} />
          <Text className="font-semibold" style={{ color: fg, fontSize: font.sm }}>
            {t('billing.downloading')}
          </Text>
        </View>
      ) : (
        <Text className="font-semibold" style={{ color: fg, fontSize: font.sm }}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}
