import { Text } from '@/components/ui/text';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';
import { useColorScheme } from 'nativewind';
import { Link, useRouter } from 'expo-router';
import type { ComponentType } from 'react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  User as UserIcon,
  Sun,
  Globe,
  Shield,
  HelpCircle,
  MessageCircle,
  Share2,
  Users,
  LogOut,
  Trash2,
  ChevronRight,
} from 'lucide-react-native';

export default function SettingsScreen() {
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const router = useRouter();
  const isDark = colorScheme === 'dark';
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      setCurrentUser(authUser);
    };
    getUser();
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', onPress: () => {}, style: 'cancel' },
        {
          text: 'Déconnexion',
          onPress: async () => {
            setLoading(true);
            try {
              await supabase.auth.signOut();
              router.replace('/(auth)/login');
            } catch (err) {
              Alert.alert('Erreur', 'Une erreur est survenue lors de la déconnexion');
            } finally {
              setLoading(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Supprimer le compte',
      'Cette action est irréversible. Tous vos données seront supprimées.',
      [
        { text: 'Annuler', onPress: () => {}, style: 'cancel' },
        {
          text: 'Supprimer',
          onPress: async () => {
            setLoading(true);
            try {
              // Implémenter la suppression du compte via Supabase
              await supabase.auth.signOut();
              router.replace('/(auth)/login');
            } catch (err) {
              Alert.alert('Erreur', 'Une erreur est survenue');
            } finally {
              setLoading(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const MenuItem = ({
    icon: Icon,
    label,
    onPress,
    isDanger = false,
  }: {
    icon: ComponentType<{ size?: number; color?: string; className?: string }>;
    label: string;
    onPress: () => void;
    isDanger?: boolean;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-row items-center justify-between py-3 px-4 `}
    >
      <View className="flex-row items-center flex-1">
        <Icon
          size={20}
          color={isDanger ? '#ef4444' : isDark ? '#ffffff' : '#12151C'}
         
        />
        <Text
          className={`text-sm font-semibold ml-4 ${
            isDanger
              ? 'text-red-500'
              : isDark
              ? 'text-white'
              : 'text-gray-900'
          }`}
        >
          {label}
        </Text>
      </View>
     
    </TouchableOpacity>
  );

  const SectionTitle = ({
    title,
    isOrange = false,
  }: {
    title: string;
    isOrange?: boolean;
  }) => (
    <Text
      className={`text-base font-bold px-4 py-4 ${
        isOrange
          ? 'text-orange-500'
          : isDark
          ? 'text-white'
          : 'text-gray-900'
      }`}
    >
      {title}
    </Text>
  );

  return (
    <SafeAreaView  >
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header avec Avatar */}
        <View
          className="flex-row items-center ml-4 ">
          <View className="flex-row items-center mb-4">
            {/** Avatar */}
          <Avatar alt="Zach Nugent's Avatar" >
            <AvatarImage source={{ uri: 'https://github.com/mrzachnugent.png' }} />
            <AvatarFallback>
              <Text>ZN</Text>
            </AvatarFallback>
          </Avatar>

            <UserIcon size={32}  color={isDark ? '#ffffff' : '#000000'} />

          </View>
            

            <View className="flex-1">
              <Text className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {currentUser?.user_metadata?.full_name || 'Utilisateur'}
              </Text>
              <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {currentUser?.email || 'email@example.com'}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center ml-6 mr-6 ">
            <View className="flex-1 h-px bg-gray-300 dark:bg-gray-600 " />
           
          </View>
        {/* Paramètres généraux */}

          <View className="ml-3 mt-4">


        <Link href="https://aficab.com/politique-de-confidentialite" asChild>
          <MenuItem
            icon={Shield}
            label="Politique de confidentialité"
            onPress={() => {
              // Naviguer vers la page de politique
            }}
          />
        </Link>


        <Link href="https://aide.aficab.com/" asChild>
          <MenuItem
            icon={HelpCircle}
            label="FAQ"
            onPress={() => {
              // Naviguer vers la FAQ
            }}
          />
         </Link>


        <MenuItem
          icon={MessageCircle}
          label="Contactez-nous"
          onPress={() => {
            // Ouvrir le formulaire de contact
          }}
        />

        {/* À propos et partage */}
        <SectionTitle title="À propos et partage" isOrange />

        <Link href="https://aficab.com/a-propos" asChild>
            <MenuItem
              icon={Share2}
              label="À propos de l'application"
              onPress={() => {
                // Naviguer vers la page à propos
              }}
            />
        </Link>


        <MenuItem
          icon={Users}
          label="Inviter un ami"
          onPress={() => {
            // Ouvrir le partage
          }}
        />

        {/* Compte */}
        <SectionTitle title="Compte" isOrange />

        <MenuItem
          icon={LogOut}
          label="Déconnexion"
          onPress={handleLogout}
          isDanger={false}
        />

        <MenuItem
          icon={Trash2}
          label="Delete Account"
          onPress={handleDeleteAccount}
          isDanger
        />

        </View>
        {/* Espacement bas */}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}