import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateUserByID } from '@/api/user';
import { User } from '@/constants/dataInterface';
import { queryKeys } from '@/lib/query/query-keys';

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, updates }: { userId: string; updates: Partial<User> }) =>
      updateUserByID(userId, updates),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.user.detail(variables.userId) });
    },
  });
}
