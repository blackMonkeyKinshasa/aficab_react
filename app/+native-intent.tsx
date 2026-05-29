import { resolveAppHref } from '@/lib/deep-linking';

export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  return resolveAppHref(path) ?? path;
}