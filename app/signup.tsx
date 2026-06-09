import { useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';

import { useRouter } from 'expo-router';
import { Camera, ChevronDown } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormField } from '@/components/my-ui/FormField';
import { Button, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { useAppToast } from '@/lib/toast';

export default function Signup() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const { t } = useI18n();
  const toast = useAppToast();
  const statusOptions: { label: string; value: string }[] = [
    { label: t('role.client'), value: 'client' },
    { label: t('signup.driver'), value: 'driver' },
  ];

 
  const handleSave = async () => {
    if (!fullName || !phoneNumber || !status) {
      toast({
        title: t('common.error'),
        description: t('signup.requiredFields'),
        action: 'error',
      });
      return;
    }

    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: t('common.error'),
          description: t('signup.userNotFound'),
          action: 'error',
        });
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone_number: phoneNumber,
          status: status,
          updated_at: new Date(),
        })
        .eq('id', user.id);

      if (error) {
        toast({
          title: t('common.error'),
          description: error.message,
          action: 'error',
        });
      } else {
        toast({
          title: t('signup.successTitle'),
          description: t('signup.successMessage'),
          action: 'success',
        });
        router.replace('/(tabs)');
      }
    } catch {
      toast({
        title: t('common.error'),
        description: t('auth.genericError'),
        action: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleContactSupport = () => {
    console.log('Contact support');
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="items-center px-6 py-8">
          <Text className="mb-4 text-3xl font-bold text-foreground">{t('signup.title')}</Text>
          <Text className="text-center text-base text-muted-foreground">
            {t('signup.subtitle')}
          </Text>
        </View>

        <View className="mb-8 items-center">
          <View className="relative h-24 w-24 items-center justify-center rounded-full bg-muted">
            <View className="items-center">
              <Text className="text-5xl">👤</Text>
            </View>

            <TouchableOpacity className="absolute bottom-0 right-0 h-10 w-10 items-center justify-center rounded-full bg-primary">
              <Camera size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <View className="space-y-6 px-6">
          <FormField
            label={t('signup.fullName')}
            placeholder="User 54452"
            value={fullName}
            onChangeText={setFullName}
            editable={!loading}
          />

          <FormField
            label={t('signup.phoneNumber')}
            placeholder="+243821606126"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            editable={!loading}
          />

          <View>
            <Text className="mb-2 text-sm text-muted-foreground">{t('signup.status')}</Text>
            <TouchableOpacity
              onPress={() => setShowStatusDropdown(!showStatusDropdown)}
              className="flex-row items-center justify-between rounded-xl bg-muted px-4 py-4">
              <Text className={`text-base ${status ? 'text-foreground' : 'text-muted-foreground'}`}>
                {status
                  ? statusOptions.find((opt: { label: string; value: string }) => opt.value === status)
                      ?.label
                  : t('signup.statusPlaceholder')}
              </Text>
              <ChevronDown size={24} color={isDark ? '#666666' : '#999999'} />
            </TouchableOpacity>

            {showStatusDropdown ? (
              <View className="mt-2 overflow-hidden rounded-lg border border-border bg-card">
                {statusOptions.map((option: { label: string; value: string }) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => {
                      setStatus(option.value);
                      setShowStatusDropdown(false);
                    }}
                    className="border-b border-border px-4 py-3">
                    <Text className="text-base text-foreground">{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </View>
          <Button
            action="primary"
            variant="solid"
            size="control"
            onPress={handleSave}
            isDisabled={loading || !fullName || !phoneNumber || !status}
            className="mt-6 w-full rounded-md">
            <ButtonText>{loading ? t('signup.saving') : t('signup.save')}</ButtonText>
          </Button>

          <View className="mt-8 items-center">
            <Text className="text-sm text-muted-foreground">
              {t('auth.needHelp')}{' '}
              <Text className="font-semibold text-primary" onPress={handleContactSupport}>
                {t('auth.contactSupport')}
              </Text>
            </Text>
          </View>
        </View>
      </ScrollView>

      <View className="h-1 bg-muted" />
    </SafeAreaView>
  );
}
