import { getActivity } from '@/api/activity';
import { Activity } from '@/constants/dataInterface';
import { POLLING } from '@/lib/query/polling';
import { queryKeys } from '@/lib/query/query-keys';
import { useFocusAwareQuery } from '@/lib/query/use-focus-aware-query';

import { QueryPollingOptions } from './query-options';

function normalizeActivities(data: unknown): Activity[] {
  if (Array.isArray(data)) {
    return data as Activity[];
  }

  if (
    data &&
    typeof data === 'object' &&
    Array.isArray((data as { activities?: unknown }).activities)
  ) {
    return (data as { activities: Activity[] }).activities;
  }

  return [];
}

export function useNotifications(userId: string | undefined, options?: QueryPollingOptions) {
  return useFocusAwareQuery<Activity[]>({
    queryKey: queryKeys.activity.list(userId ?? ''),
    queryFn: async () => {
      const data = await getActivity({ userId: userId! });
      const normalized = normalizeActivities(data);
      // #region agent log
      fetch('http://127.0.0.1:7678/ingest/e489a6eb-08fd-49a3-8970-439b9b875778',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'348b3c'},body:JSON.stringify({sessionId:'348b3c',runId:'pre-fix',hypothesisId:'H1',location:'useNotifications.ts:queryFn',message:'activity query result',data:{rawType:typeof data,rawIsArray:Array.isArray(data),rawKeys:data&&typeof data==='object'&&!Array.isArray(data)?Object.keys(data as object):null,normalizedLength:normalized.length,sample:normalized.slice(0,3).map((item)=>({id:item?.id,action:item?.action,createAt:item?.createAt,hasBooking:Boolean(item?.booking),bookingType:item?.booking?typeof item.booking:null}))},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      return normalized;
    },
    enabled: Boolean(userId) && (options?.enabled ?? true),
    pollingInterval: options?.pollingInterval ?? POLLING.none,
  });
}

export function useUnreadNotificationCount(
  userId: string | undefined,
  options?: QueryPollingOptions
) {
  return useFocusAwareQuery<Activity[], number>({
    queryKey: queryKeys.activity.unread(userId ?? ''),
    queryFn: async () => {
      const data = await getActivity({ userId: userId!, isRead: '0' });
      return normalizeActivities(data);
    },
    select: (activities) => activities.filter((activity) => !activity.isRead).length,
    enabled: Boolean(userId) && (options?.enabled ?? true),
    pollingInterval: options?.pollingInterval ?? POLLING.none,
  });
}
