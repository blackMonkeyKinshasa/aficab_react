import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { useColorScheme } from 'nativewind';
import { Camera, ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n';

export default function Signup(){
    
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const { t } = useI18n();

  const statusOptions = [
    { label: t('signup.passenger'), value: 'passenger' },
    { label: t('signup.driver'), value: 'driver' },
    { label: t('signup.admin'), value: 'admin' },
  ];

  const handleSave = async () => {
    if (!fullName || !phoneNumber || !status) {
      Alert.alert(t('common.error'), t('signup.requiredFields'));
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert(t('common.error'), t('signup.userNotFound'));
        return;
      }

      // Mettre à jour le profil utilisateur
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
        Alert.alert(t('common.error'), error.message);
      } else {
        Alert.alert(t('signup.successTitle'), t('signup.successMessage'));
        router.replace('/(tabs)');
      }
    } catch (err) {
      Alert.alert(t('common.error'), t('auth.genericError'));
    } finally {
      setLoading(false);
    }
  };

  const handleContactSupport = () => {
    // Ouvrir le support client
    console.log('Contact support');
  };

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? 'bg-black' : 'bg-white'}`}
      edges={['top']}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Header */}
        <View className="px-6 py-8 items-center">
          <Text
            className={`text-3xl font-bold mb-4 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}
          >
            {t('signup.title')}
          </Text>
          <Text
            className={`text-base text-center ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            {t('signup.subtitle')}
          </Text>
        </View>

        {/* Avatar Section */}
        <View className="items-center mb-8">
          <View
            className={`w-24 h-24 rounded-full items-center justify-center relative ${
              isDark ? 'bg-gray-800' : 'bg-gray-100'
            }`}
          >
            {/* User Icon */}
            <View className="items-center">
              <Text className="text-5xl">👤</Text>
            </View>

            {/* Camera Icon Button */}
            <TouchableOpacity
              className={`absolute bottom-0 right-0 w-10 h-10 rounded-full items-center justify-center ${
                isDark ? 'bg-orange-500' : 'bg-orange-500'
              }`}
            >
              <Camera size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Form Section */}
        <View className="px-6 space-y-6">
          {/* Full Name Input */}
          <View>
            <Text
              className={`text-sm mb-2 ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              {t('signup.fullName')}
            </Text>
            <TextInput
              placeholder="User 54452"
              value={fullName}
              onChangeText={setFullName}
              placeholderTextColor={isDark ? '#666666' : '#999999'}
              className={`px-4 py-4 rounded-lg text-base font-medium ${
                isDark
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
              editable={!loading}
            />
          </View>

          {/* Phone Number Input */}
          <View>
            <Text
              className={`text-sm mb-2 ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              {t('signup.phoneNumber')}
            </Text>
            <TextInput
              placeholder="+243821606126"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              placeholderTextColor={isDark ? '#666666' : '#999999'}
              className={`px-4 py-4 rounded-lg text-base font-medium ${
                isDark
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
              editable={!loading}
            />
          </View>

          {/* Status Dropdown */}
          <View>
            <Text
              className={`text-sm mb-2 ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              {t('signup.status')}
            </Text>
            <TouchableOpacity
              onPress={() => setShowStatusDropdown(!showStatusDropdown)}
              className={`flex-row items-center justify-between px-4 py-4 rounded-lg ${
                isDark ? 'bg-gray-800' : 'bg-gray-100'
              }`}
            >
              <Text
                className={`text-base ${
                  status
                    ? isDark
                      ? 'text-white'
                      : 'text-gray-900'
                    : isDark
                    ? 'text-gray-400'
                    : 'text-gray-600'
                }`}
              >
                {status
                  ? statusOptions.find((opt) => opt.value === status)?.label
                  : t('signup.statusPlaceholder')}
              </Text>
              <ChevronDown
                size={24}
                color={isDark ? '#666666' : '#999999'}
              />
            </TouchableOpacity>

            {/* Dropdown Menu */}
            {showStatusDropdown && (
              <View
                className={`mt-2 rounded-lg overflow-hidden border ${
                  isDark
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-white border-gray-200'
                }`}
              >
                {statusOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => {
                      setStatus(option.value);
                      setShowStatusDropdown(false);
                    }}
                    className={`px-4 py-3 border-b ${
                      isDark ? 'border-gray-700' : 'border-gray-200'
                    }`}
                  >
                    <Text
                      className={`text-base ${
                        isDark ? 'text-white' : 'text-gray-900'
                      }`}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Save Button */}
          <Button
            onPress={handleSave}
            disabled={loading || !fullName || !phoneNumber || !status}
            className="bg-orange-500 h-12 rounded-lg mt-6"
          >
            <Text className="text-white font-bold text-base">
              {loading ? t('signup.saving') : t('signup.save')}
            </Text>
          </Button>

          {/* Support Text */}
          <View className="mt-8 items-center">
            <Text
              className={`text-sm ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              {t('auth.needHelp')}{' '}
              <Text
                className="text-orange-500 font-semibold"
                onPress={handleContactSupport}
              >
                {t('auth.contactSupport')}
              </Text>
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Indicator */}
      <View
        className={`h-1 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}
      />
    </SafeAreaView>
  );
}