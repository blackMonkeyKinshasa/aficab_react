export const APP_SCHEME = 'aficab://';
export const APP_DEEP_LINK_HOST = 'aficab.com';
export const APP_DEEP_LINK_ORIGIN = `${APP_SCHEME}${APP_DEEP_LINK_HOST}`;
export const APP_AUTH_CALLBACK_URL = `${APP_DEEP_LINK_ORIGIN}/auth/callback`;
export const IOS_UNIVERSAL_LINK = 'https://aficab.com/redirect';

export const APP_STORE_URL = 'https://apps.apple.com/us/app/aficab/id6754878824?l=fr-FR';
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=io.kinvtc.mapstracking';
export const WEBSITE_URL = 'https://aficab.com';

export function getStoreUrl(platform: string) {
  if (platform === 'ios') {
    return APP_STORE_URL;
  }

  if (platform === 'android') {
    return PLAY_STORE_URL;
  }

  return WEBSITE_URL;
}
