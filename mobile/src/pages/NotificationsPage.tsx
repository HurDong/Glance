import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/api/notifications';
import { EmptyState } from '@/components/common/EmptyState';
import { SectionCard } from '@/components/common/SectionCard';
import { formatRelativeTime } from '@/lib/format';
import { useToastStore } from '@/stores/toastStore';

function formatTypeLabel(type: string) {
  switch (type) {
    case 'GROUP_INVITE':
      return '그룹 초대';
    case 'GROUP_JOIN':
      return '그룹 참여';
    case 'GROUP_SHARE':
      return '포트폴리오 공유';
    case 'COMMENT':
      return '댓글';
    default:
      return type.replace(/_/g, ' ');
  }
}

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.push);

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
  });

  const unreadQuery = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: getUnreadNotificationCount,
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      pushToast('모든 알림을 읽음 처리했어요.', 'success');
    },
    onError: (error) => {
      console.error(error);
      pushToast('전체 읽음 처리에 실패했어요.', 'error');
    },
  });

  const markOneMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
    onError: (error) => {
      console.error(error);
      pushToast('알림 읽음 처리에 실패했어요.', 'error');
    },
  });

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.28),transparent_28%),linear-gradient(145deg,#020617_0%,#111827_58%,#1e293b_100%)] px-6 py-6 shadow-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-300">놓치지 말아야 할 소식</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-50">
              {unreadQuery.data || 0}개
            </h2>
            <p className="mt-2 text-sm text-slate-300">아직 읽지 않은 알림이 남아 있어요.</p>
          </div>
          <button
            type="button"
            onClick={() => markAllMutation.mutate()}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
          >
            모두 읽음
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4 backdrop-blur">
            <p className="text-xs text-slate-400">전체 알림</p>
            <p className="mt-2 text-2xl font-bold text-slate-50">{notificationsQuery.data?.length || 0}</p>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4 backdrop-blur">
            <p className="text-xs text-slate-400">읽지 않음</p>
            <p className="mt-2 text-2xl font-bold text-slate-50">{unreadQuery.data || 0}</p>
          </div>
        </div>
      </section>

      <SectionCard title="알림 목록" description="최근에 받은 순서대로 정리해 두었어요.">
        {notificationsQuery.data && notificationsQuery.data.length > 0 ? (
          <div className="space-y-3">
            {notificationsQuery.data.map((notification) => (
              <div
                key={notification.id}
                className={`rounded-[22px] border px-4 py-4 ${
                  notification.isRead
                    ? 'border-white/10 bg-slate-900/65'
                    : 'border-blue-400/30 bg-blue-500/10 shadow-[0_0_0_1px_rgba(96,165,250,0.12)]'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      {!notification.isRead ? (
                        <span className="h-2.5 w-2.5 rounded-full bg-blue-400" />
                      ) : null}
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-200">
                        {formatTypeLabel(notification.type)}
                      </p>
                    </div>
                    <p className="mt-2 font-bold text-slate-50">{notification.content}</p>
                    <p className="mt-2 text-sm text-slate-400">
                      보낸 사람 {notification.senderNickname || '시스템'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatRelativeTime(notification.createdAt)}
                    </p>
                  </div>

                  {!notification.isRead ? (
                    <button
                      type="button"
                      onClick={() => markOneMutation.mutate(notification.id)}
                      className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/10"
                    >
                      읽음
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="아직 알림이 없어요"
            description="새로운 소식이 생기면 여기에서 바로 확인할 수 있어요."
          />
        )}
      </SectionCard>
    </div>
  );
}
