const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send';
const MAX_MESSAGES_PER_REQUEST = 100;

export type PushData = Record<string, unknown>;

export type SendExpoPushBody = {
  title: string;
  body: string;
  tokens?: string[];
  to?: string | string[];
  data?: PushData;
  sound?: 'default' | null;
  subtitle?: string;
  channelId?: string;
  badge?: number;
  ttl?: number;
  priority?: 'default' | 'normal' | 'high';
};

type ExpoMessage = {
  to: string;
  title: string;
  body: string;
  data?: PushData;
  sound?: 'default';
  subtitle?: string;
  channelId?: string;
  badge?: number;
  ttl?: number;
  priority?: 'default' | 'normal' | 'high';
};

type ExpoPushApiResponse = {
  data?: unknown[];
  errors?: Array<{ message?: string }>;
};

export type SendExpoPushResult = {
  success: boolean;
  sentCount: number;
  invalidTokens: string[];
  tickets: unknown[];
  errors: Array<{ message?: string }>;
};

export type SendExpoPushOptions = {
  endpoint?: string;
  expoAccessToken?: string;
  pushSecret?: string;
};

export function normalizeTokens(body: SendExpoPushBody) {
  const candidateTokens = [
    ...(Array.isArray(body.tokens) ? body.tokens : []),
    ...(Array.isArray(body.to) ? body.to : typeof body.to === 'string' ? [body.to] : []),
  ];

  return [...new Set(candidateTokens.map((token) => token.trim()).filter(Boolean))];
}

export function isExpoPushToken(token: string) {
  return /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/.test(token);
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function buildMessages(body: SendExpoPushBody, tokens: string[]) {
  return tokens.map<ExpoMessage>((token) => ({
    to: token,
    title: body.title,
    body: body.body,
    data: body.data,
    subtitle: body.subtitle,
    channelId: body.channelId,
    badge: body.badge,
    ttl: body.ttl,
    priority: body.priority,
    ...(body.sound === null ? {} : { sound: body.sound ?? 'default' }),
  }));
}

async function sendChunk(
  messages: ExpoMessage[],
  endpoint: string,
  expoAccessToken?: string,
  pushSecret?: string
) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(expoAccessToken ? { Authorization: `Bearer ${expoAccessToken}` } : {}),
      ...(pushSecret ? { 'x-expo-push-secret': pushSecret } : {}),
    },
    body: JSON.stringify(messages),
  });

  const result = (await response.json()) as ExpoPushApiResponse;

  if (!response.ok) {
    throw new Error(result?.errors?.[0]?.message ?? `Expo push API error: ${response.status}`);
  }

  return result;
}

export async function sendExpoPush(
  body: SendExpoPushBody,
  options: SendExpoPushOptions = {}
): Promise<SendExpoPushResult> {
  if (!body?.title?.trim() || !body?.body?.trim()) {
    throw new Error('Both title and body are required');
  }

  const normalizedTokens = normalizeTokens(body);
  const validTokens = normalizedTokens.filter(isExpoPushToken);
  const invalidTokens = normalizedTokens.filter((token) => !isExpoPushToken(token));

  if (validTokens.length === 0) {
    throw new Error('No valid Expo push token provided');
  }

  const messages = buildMessages(body, validTokens);
  const chunks = chunkArray(messages, MAX_MESSAGES_PER_REQUEST);
  const endpoint = options.endpoint ?? EXPO_PUSH_API_URL;

  const results = await Promise.all(
    chunks.map((chunk) => sendChunk(chunk, endpoint, options.expoAccessToken, options.pushSecret))
  );

  return {
    success: true,
    sentCount: validTokens.length,
    invalidTokens,
    tickets: results.flatMap((result) => (Array.isArray(result?.data) ? result.data : [])),
    errors: results.flatMap((result) => (Array.isArray(result?.errors) ? result.errors : [])),
  };
}

export function buildExpoPushBody(body: SendExpoPushBody) {
  const normalizedTokens = normalizeTokens(body);
  const validTokens = normalizedTokens.filter(isExpoPushToken);

  if (validTokens.length === 0) {
    throw new Error('No valid Expo push token provided');
  }

  return buildMessages(body, validTokens);
}