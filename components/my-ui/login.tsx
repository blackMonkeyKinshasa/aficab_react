import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Link, Stack, useRouter } from 'expo-router';
import { MoonStarIcon, StarIcon, SunIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { Alert, Image, type ImageStyle, View } from 'react-native';
import { TextInput, TouchableOpacity, ScrollView } from 'react-native';
import {  SafeAreaView } from 'react-native-safe-area-context'

import { Input } from '@/components/ui/input';
import AntDesign from '@expo/vector-icons/AntDesign';
import FontAwesome from '@expo/vector-icons/FontAwesome';


import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';

export function LoginScreen() {
 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleEmailLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const { error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (err) {
        setError(err.message);
      } else {
        router.replace('/');
      }
    } catch (err) {
      setError('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setLoading(true);
    setError('');
    try {
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
      });
      if (err) {
        setError(err.message);
      } else {
        setError('Vérifiez votre email pour confirmer votre compte');
      }
    } catch (err) {
      setError('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  async function signInWithOTP(_email: string) {
    const { data, error } = await supabase.auth.signInWithOtp({
      email: _email,
      options: {
        // set this to false if you do not want the user to be automatically signed up
        shouldCreateUser: true,
        emailRedirectTo: `/index`,
      },
    });

    if (error) Alert.alert(error.message);
    setLoading(false);
  }

  async function verifyOTP(_email: string, _token: string) {
    const {data: { session },error,} = await supabase.auth.verifyOtp({
      email: _email,
      token: _token,
      type: 'email',
    });

    if (error) Alert.alert(error.message);
    setLoading(false);
    error ?? console.log('error:', error);

    if (session) {
      Alert.alert('Success', 'You have been signed in successfully!');
      router.push('../index');
      console.log('Session:', session);
    }

  }

  return (
    <SafeAreaView  style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView className="flex-1 bg-white">
      <View className="flex-1 px-6 py-10 justify-between">
        
        {/* Header */}
        <View>
          {/* Logo */}
          <View className="items-center flex-1 justify-center mt-12 mb-8">
            <View className="flex-row items-end">
              <Text className="text-black font-bold text-5xl" >aficab</Text>
              <Text className="text-orange-500 font-bold" style={{ fontSize: 42 }}>.</Text>
            </View>
          </View>

          {/* Description */}
          <Text className="text-center text-gray-400 text-base mb-8">
            Inscrivez-vous pour profiter d'une expérience de réservation exceptionnelle.
          </Text>

          {/* Email Input */}
          <View className="mb-4">
            <Input
              placeholder="Adresse email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              className="bg-gray-100 border-0 h-14 rounded-lg px-4"
              placeholderTextColor="#999"
            />
          </View>

          {/* Password Input */}
          <View className="mb-6">
            <Input
              placeholder="Mot de passe"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              className="bg-gray-100 border-0 h-14 rounded-lg px-4"
              placeholderTextColor="#999"
            />
          </View>

          {/* Error Message */}
          {error ? (
            <Text className="text-red-500 text-sm mb-4 text-center">{error}</Text>
          ) : null}

          {/* Main Button */}
          <Button
            onPress={handleEmailLogin}
            disabled={loading || !email || !password}
            className="bg-orange-500 h-14 rounded-full mb-6"
          >
            <Text className="text-white font-bold text-base">
              {loading ? 'Connexion...' : "S'inscrire / Se connecter"}
            </Text>
          </Button>

          {/* Divider */}
          <View className="flex-row items-center mb-6">
            <View className="flex-1 h-px bg-gray-300" />
            <Text className="mx-3 text-gray-500 text-sm">Ou</Text>
            <View className="flex-1 h-px bg-gray-300" />
          </View>

          {/* Google Button */}
          <TouchableOpacity className="bg-gray-100 h-14 rounded-lg mb-4 flex-row items-center justify-center">
            <AntDesign name="google" size={24} color="#EA4335" />
            <Text className="ml-3 text-black font-semibold text-base">Continuer avec Google</Text>
          </TouchableOpacity>

          {/* Apple Button */}
          <TouchableOpacity className="bg-gray-100 h-14 rounded-lg mb-8 flex-row items-center justify-center">
            <FontAwesome name="google" size={24} color="#000" />
            <Text className="ml-3 text-black font-semibold text-base">Continuer avec Apple</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View>
          {/* Terms Text */}
          <Text className="text-gray-600 text-xs leading-5 mb-6">
            En cliquant sur se connecter ou continuer, vous confirmez avoir lu et accepté les deux{' '}
            <Text className="text-orange-500 font-semibold">Conditions d'utilisation</Text>
            {' '}ainsi que notre{' '}
            <Text className="text-orange-500 font-semibold">Politique de confidentialité</Text>.
          </Text>

          {/* Support Text */}
          <Text className="text-gray-600 text-xs">
            Besoin d'aide ?{' '}
            <Text className="text-orange-500 font-semibold">Contactez le service client.</Text>
          </Text>

        </View>
      </View>
    </ScrollView>
    </SafeAreaView>
 
  );
}
