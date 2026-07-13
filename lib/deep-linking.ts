import { APP_DEEP_LINK_HOST } from '@/constants/app-links';

const APP_LINK_HOSTS = new Set([APP_DEEP_LINK_HOST, `www.${APP_DEEP_LINK_HOST}`]);

const ROUTE_ALIASES: Record<string, string> = {
  '/': '/',
  '/home': '/',
  '/index': '/',
  '/reservation': '/(tabs)/reservation',
  '/reservations': '/(tabs)/reservation',
  '/bookings': '/(tabs)/reservation',
  '/notification': '/notificationsPage',
  '/notifications': '/notificationsPage',
  '/notifications-page': '/notificationsPage',
  '/notificationspage': '/notificationsPage',
  '/settings': '/(tabs)/settings',
};

const ALLOWED_APP_ROUTES = new Set([
  '/',
  '/(tabs)/reservation',
  '/(tabs)/settings',
  '/notificationsPage',
  '/edit-profile',
  '/create-profile',
  '/chekRole',
  '/update-app',
]);

function safelyDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizePathname(pathname: string) {
  const decodedPathname = safelyDecode(pathname || '/').trim();

  if (!decodedPathname || decodedPathname === '.') {
    return '/';
  }

  return decodedPathname.startsWith('/') ? decodedPathname : `/${decodedPathname}`;
}

function buildHref(pathname: string, searchParams?: URLSearchParams) {
  const normalizedPathname =
    ROUTE_ALIASES[normalizePathname(pathname)] ?? normalizePathname(pathname);

  if (!ALLOWED_APP_ROUTES.has(normalizedPathname)) {
    return null;
  }

  const search = searchParams?.toString();

  if (!search) {
    return normalizedPathname;
  }

  return `${normalizedPathname}?${search}`;
}

function resolveRedirectTarget(searchParams: URLSearchParams) {
  const nestedTarget =
    searchParams.get('path') ??
    searchParams.get('route') ??
    searchParams.get('screen') ??
    searchParams.get('link') ??
    searchParams.get('url') ??
    searchParams.get('pathname');

  if (!nestedTarget) {
    return '/';
  }

  return resolveAppHref(nestedTarget);
}

export function resolveAppHref(input: string | null | undefined): string | null {
  if (!input) {
    return null;
  }

  const trimmedInput = input.trim();

  if (!trimmedInput) {
    return null;
  }

  if (trimmedInput.startsWith('/')) {
    const [pathname, queryString = ''] = trimmedInput.split('?', 2);

    if (normalizePathname(pathname) === '/callback') {
      return null;
    }

    return buildHref(pathname, new URLSearchParams(queryString));
  }

  if (!trimmedInput.includes('://')) {
    return resolveAppHref(`/${trimmedInput}`);
  }

  try {
    const url = new URL(trimmedInput);
    const protocol = url.protocol.toLowerCase();
    const host = url.host.toLowerCase();
    const pathname = normalizePathname(url.pathname);

    if (pathname === '/callback') {
      return null;
    }

    if (!['http:', 'https:', 'aficab:', 'mobile:'].includes(protocol)) {
      return null;
    }

    if (!APP_LINK_HOSTS.has(host)) {
      return null;
    }

    if (pathname === '/redirect') {
      return resolveRedirectTarget(url.searchParams);
    }

    return buildHref(pathname, url.searchParams);
  } catch {
    return resolveAppHref(`/${trimmedInput}`);
  }
}
