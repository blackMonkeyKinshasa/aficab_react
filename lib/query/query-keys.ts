export const queryKeys = {
  appConfig: ['mobile-config'] as const,
  user: {
    detail: (userId: string) => ['user', userId] as const,
  },
  driver: {
    detail: (uid: string) => ['driver', uid] as const,
  },
  bookings: {
    all: ['bookings'] as const,
    list: (clientId: string) => ['bookings', 'list', clientId] as const,
  },
  booking: {
    detail: (id: string) => ['booking', id] as const,
  },
  activity: {
    all: ['activity'] as const,
    list: (userId: string) => ['activity', 'list', userId] as const,
    unread: (userId: string) => ['activity', 'unread', userId] as const,
  },
};
