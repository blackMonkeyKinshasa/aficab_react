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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"



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

export default function LoginScreen() {
 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [token, setToken] = useState(''); 

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

  const signInWithOTP = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        // set this to false if you do not want the user to be automatically signed up
        shouldCreateUser: true,
        emailRedirectTo: `/index`,
      },
    });

    if (error) Alert.alert(error.message);
    setLoading(false);
  }

  const verifyOTP = async ( _token: string) => {
    const {data: { session },error,} = await supabase.auth.verifyOtp({
      email: email,
      token: _token,
      type: 'email',
    });

    if (error) Alert.alert(error.message);
    setLoading(false);
    error ?? console.log('error:', error);

    if (session) {
      Alert.alert('Success', 'You have been signed in successfully!');
    //router.push('../index');
      console.log('Session:', session);
       setLoading(false);
       setDialogOpen(false);
    }

  }

  return (
    <SafeAreaView className='flex-1 bg-white dark:bg-black'>
      <ScrollView className="flex-1">
      <View className="flex-1 px-6 py-10 justify-between">
        
        {/* Header */}
        <View>
          {/* Logo */}
          <View className="items-center flex-1 justify-center  mb-8">
            <View className="flex-row items-end">
              <Text className=" text-gray-900 dark:text-white font-bold text-5xl" >aficab</Text>
              <Text className="text-orange-500 font-bold" style={{ fontSize: 42 }}>.</Text>
            </View>
          </View>

          {/* Description */}
          <Text className="text-center text-muted-foreground text-base mb-8">
            Inscrivez-vous pour profiter d'une expérience de réservation exceptionnelle.
          </Text>

          {/* Email Input */}
          <View className="mb-8 " >
            <Input
              placeholder="Adresse email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              
            />
          </View>

        

          {/* Error Message */}
          {error ? (
            <Text className="text-red-500 text-sm mb-4 text-center">{error}</Text>
          ) : null}

          {/* Main Button */}
          
           {GetButtonDialog(dialogOpen, setDialogOpen, colorScheme, signInWithOTP,
             loading, email, verifyOTP, token, setToken)}

          {/* Divider */}
          <View className="flex-row items-center mb-6">
            <View className="flex-1 h-px bg-gray-500 dark:bg-gray-600 " />
            <Text className="mx-3 text-sm  text-gray-900 dark:text-white">Ou</Text>
            <View className="flex-1 h-px bg-gray-500 dark:bg-gray-600 " />
          </View>

         {/* Google Button avec Dialog */}
        
  <Button className=" h-12 rounded-lg mb-4 flex-row items-center justify-center bg-gray-200 dark:bg-gray-500">
                <FontAwesome name="google" size={24} color={colorScheme === 'dark' ? '#ffffff' : '#000000'}/>
                <Text className="ml-3 font-semibold text-base  text-gray-900 dark:text-white">Continuer avec Google</Text>
              </Button>
          {/* Apple Button */}
          <Button className=" h-12 rounded-lg mb-8 flex-row items-center justify-center bg-gray-200 dark:bg-gray-500"
          onPress={toggleColorScheme}>
            <FontAwesome name="apple" size={24} color={colorScheme === 'dark' ? '#ffffff' : '#000000'} />
            <Text className="ml-3 font-semibold text-base  text-gray-900 dark:text-white">Continuer avec Apple</Text>
          </Button>
        </View>

        {/* Footer */}
        <View>
          {/* Terms Text */}
          <Text className="text-gray-600 dark:text-gray-400 text-xs leading-5 mb-6">
            En cliquant sur se connecter ou continuer, vous confirmez avoir lu et accepté les deux{' '}
            <Text className="text-orange-500 text-xs leading-5 mb-6 ">Conditions d'utilisation</Text>
            {' '}ainsi que notre{' '}
            <Text className="text-orange-500 text-xs leading-5 mb-6">Politique de confidentialité</Text>.
          </Text>

          {/* Support Text */}
          <Text className="text-gray-600 dark:text-gray-400 text-xs">
            Besoin d'aide ?{' '}
            <Text className="text-orange-500 text-xs">Contactez le service client.</Text>
          </Text>

        </View>
      </View>
    </ScrollView>
    </SafeAreaView>
 
  );
}

function GetButtonDialog(dialogOpen: boolean, setDialogOpen: React.Dispatch<React.SetStateAction<boolean>>, colorScheme: "light" | "dark" | undefined , signInWithOTP: () => void,
loading?: boolean, email?: string, verifyOTP?: (token: string) => void, token?: string, setToken?: React.Dispatch<React.SetStateAction<string>>) {
  

  
  return (
  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onPress={signInWithOTP}
            disabled={loading || !email }
            className="bg-orange-500 h-12 rounded-lg mb-6"
          >
            <Text className="text-white font-bold text-base">
              {loading ? 'Connexion...' : "S'inscrire / Se connecter"}
            </Text>
          </Button>
            

            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Entrez le code PIN ci-dessous</DialogTitle>
                <DialogDescription>
                  Un code OTP a été envoyé à votre adresse email. Veuillez le saisir ci-dessous pour continuer.
                </DialogDescription>
              </DialogHeader>
              {/* Contenu du dialog ici */}
               <View className="mb-4 mt-4 " >
                <Input
                placeholder="code OTP"
                keyboardType="number-pad"
                onChangeText={setToken}
                textAlign='center'
                />
                </View>
              {/* Button de fermeture du dialog */}
                <DialogFooter>
                  <View className="flex-row items-center justify-center">

                   {/* Button Valider */}
                    <Button className="bg-orange-500 h-12 rounded-lg flex-1 flex-row items-center justify-center "
                     onPress={() => {
                        if (token) {
                          verifyOTP && verifyOTP(token);
                        }else {Alert.alert('Veuillez entrer le code OTP')
                        }
                      }}
                    >
                      <Text className="text-white font-bold text-base">
                        Valider
                      </Text>
                    </Button>
                   
                
                
                </View>
                </DialogFooter>
            </DialogContent>
          </Dialog>

  );
}
