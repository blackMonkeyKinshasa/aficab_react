import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Link, Stack } from 'expo-router';
import { MoonStarIcon, StarIcon, SunIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { Alert, Image, type ImageStyle, View } from 'react-native';

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

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signInWithEmail(_email: string) {
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

  async function verifyOTP(_email: string) {
    const {
      data: { session },
      error,
    } = await supabase.auth.verifyOtp({
      email: 'email@example.com',
      token: '123456',
      type: 'email',
    });

    if (error) Alert.alert(error.message);
    setLoading(false);
  }

  return (
    <Stack.Screen>
      <AlertDialog>
        <AlertDialogTrigger>
          <Text>Show Alert Dialog</Text>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account and remove
              your data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onPress={() => {}}>
              <Text>Cancel</Text>
            </AlertDialogCancel>
            <AlertDialogAction onPress={() => {}}>
              <Text>Continue</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Stack.Screen>
  );
}
