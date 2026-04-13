export const isDev = true;
export const supabase_blank_profile_picture ='https://zbgzsejuyvtjwmgtigmx.supabase.co/storage/v1/object/public/avatar/empty_image/blank-profile-picture-973460_1280.png';

const getEnv = (key: 'EXPO_PUBLIC_SUPABASE_URL_DEV' | 'EXPO_PUBLIC_SUPABASE_URL_PROD' | 'EXPO_PUBLIC_SUPABASE_ANON_KEY_DEV' | 'EXPO_PUBLIC_SUPABASE_ANON_KEY_PROD') => {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }

  return value;
};

export const supabaseUrl_dev = getEnv('EXPO_PUBLIC_SUPABASE_URL_DEV');
export const supabaseUrl_Prod = getEnv('EXPO_PUBLIC_SUPABASE_URL_PROD');
export const supabaseAnonKey_dev = getEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY_DEV');
export const supabaseAnonKey_Prod = getEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY_PROD');
