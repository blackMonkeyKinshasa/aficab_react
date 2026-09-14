import { useMutation, useQueryClient } from '@tanstack/react-query';

import { readNotification } from '@/api/activity';
import { queryKeys } from '@/lib/query/query-keys';

export function useReadNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => readNotification(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.activity.all });
    },
  });
}
