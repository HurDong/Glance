import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BellDot,
  BellRing,
  Check,
  CheckCheck,
  MessageSquareQuote,
  UserPlus,
  WalletCards,
} from 'lucide-react';
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/api/notifications';
import { EmptyState } from '@/components/common/EmptyState';
import { formatRelativeTime } from '@/lib/format';
import { useToastStore } from '@/stores/toastStore';

type NotificationTone = {
  label: string;
  icon: typeof BellRing;
  badgeClassName: string;
  iconClassName: string;
};

function getNotificationTone(type: string): NotificationTone {
  switch (type) {
    case 'GROUP_INVITE':
      return {
        label: '그룹 초대',
        icon: UserPlus,
        badgeClassName:
          'border-violet-400/30 bg-violet-500/12 text-violet-700 dark:text-violet-200',
        iconClassName: 'text-violet-600 dark:text-violet-300',
      };
    case 'GROUP_JOIN':
      return {
        label: '그룹 참여',
        icon: BellDot,
        badgeClassName:
          'border-emerald-400/30 bg-emerald-500/12 text-emerald-700 dark:text-emerald-200',
        iconClassName: 'text-emerald-600 dark:text-emerald-300',
      };
    case 'GROUP_SHARE':
      return {
        label: '포트폴리오 공유',
        icon: WalletCards,
        badgeClassName:
          'border-sky-400/30 bg-sky-500/12 text-sky-700 dark:text-sky-200',
        iconClassName: 'text-sky-600 dark:text-sky-300',
      };
    case 'COMMENT':
      return {
        label: '댓글',
        icon: MessageSquareQuote,
        badgeClassName:
          'border-amber-400/30 bg-amber-500/12 text-amber-700 dark:text-amber-100',
        iconClassName: 'text-amber-600 dark:text-amber-300',
      };
    default:
      return {
        label: type.replace(/_/g, ' '),
        icon: BellRing,
        badgeClassName:
          'border-[color:var(--soft-panel-border)] bg-[color:var(--soft-panel-bg)] text-[color:var(--text-main)]',
        iconClassName: 'text-[color:var(--text-main)]',
      };
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

  const notifications = notificationsQuery.data ?? [];
  const unreadCount = unreadQuery.data ?? 0;
  const readCount = Math.max(0, notifications.length - unreadCount);

  return (
    <div className="space-y-5">
      <section className="mobile-hero-card overflow-hidden rounded-[32px] border px-5 py-4 shadow-card">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[color:var(--brand-accent)]">
              Notification Center
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-[color:var(--text-main)]">
              알림 {unreadCount}개
            </h2>
            <p className="mt-2 text-sm leading-6 text-[color:var(--text-sub)]">
              주요 알림과 읽음 상태를 한곳에서 확인합니다.
            </p>
          </div>

          <div className="mobile-icon-surface flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border">
            <BellRing size={20} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2.5">
          <div className="mobile-soft-card rounded-[20px] border px-3 py-2.5">
            <p className="text-[11px] text-[color:var(--text-sub)]">새 알림</p>
            <p className="mt-1 text-lg font-black text-[color:var(--text-main)]">{unreadCount}</p>
          </div>
          <div className="mobile-soft-card rounded-[20px] border px-3 py-2.5">
            <p className="text-[11px] text-[color:var(--text-sub)]">읽음 완료</p>
            <p className="mt-1 text-lg font-black text-[color:var(--text-main)]">{readCount}</p>
          </div>
          <div className="mobile-soft-card rounded-[20px] border px-3 py-2.5">
            <p className="text-[11px] text-[color:var(--text-sub)]">전체</p>
            <p className="mt-1 text-lg font-black text-[color:var(--text-main)]">
              {notifications.length}
            </p>
          </div>
        </div>

        <div className="mt-3">
          <button
            type="button"
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending || unreadCount === 0}
            className="flex w-full items-center justify-center gap-2 rounded-[18px] bg-[color:var(--brand-solid)] px-5 py-3.5 text-[15px] font-semibold text-white shadow-[0_16px_30px_rgba(37,99,235,0.22)] transition disabled:opacity-40"
          >
            <CheckCheck size={18} />
            모두 읽음 처리
          </button>
        </div>
      </section>

      {notifications.length > 0 ? (
        <section className="space-y-3">
          <div className="px-1">
            <h3 className="text-lg font-black tracking-tight text-[color:var(--text-main)]">
              알림 목록
            </h3>
            <p className="mt-1 text-sm text-[color:var(--text-sub)]">
              최근 수신 알림을 시간순으로 확인할 수 있습니다.
            </p>
          </div>

          <div className="space-y-3">
            {notifications.map((notification) => {
              const tone = getNotificationTone(notification.type);
              const Icon = tone.icon;

              return (
                <article
                  key={notification.id}
                  className={`rounded-[28px] border px-4 py-4 shadow-card transition ${
                    notification.isRead
                      ? 'mobile-soft-card opacity-60'
                      : 'mobile-hero-card border-blue-400/30 shadow-[0_22px_40px_rgba(37,99,235,0.14)]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border ${
                        notification.isRead
                          ? 'border-[color:var(--soft-panel-border)] bg-[color:var(--soft-panel-bg)]'
                          : 'border-blue-400/30 bg-blue-500/14'
                      }`}
                    >
                      <Icon
                        size={18}
                        className={
                          notification.isRead ? 'text-[color:var(--text-sub)]' : tone.iconClassName
                        }
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tone.badgeClassName}`}
                          >
                            {tone.label}
                          </span>
                          {!notification.isRead ? (
                            <span className="rounded-full bg-blue-500 px-2 py-1 text-[10px] font-bold text-white">
                              NEW
                            </span>
                          ) : null}
                        </div>

                        <span className="shrink-0 pl-3 text-[11px] font-medium text-[color:var(--text-sub)]">
                          {formatRelativeTime(notification.createdAt)}
                        </span>
                      </div>

                      <p
                        className={`mt-3 text-[15px] font-bold leading-6 break-words ${
                          notification.isRead
                            ? 'text-[color:var(--text-sub)]'
                            : 'text-[color:var(--text-main)]'
                        }`}
                      >
                        {notification.content}
                      </p>

                      {!notification.isRead ? (
                        <button
                          type="button"
                          onClick={() => markOneMutation.mutate(notification.id)}
                          disabled={markOneMutation.isPending}
                          className="mobile-notification-action mt-4 flex min-h-[3.5rem] w-full items-center justify-center gap-2 rounded-[20px] border px-4 py-3 text-sm font-semibold transition hover:border-[color:var(--brand-solid)] hover:brightness-[1.03] disabled:opacity-50"
                        >
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--nav-hover-bg)]">
                            <Check size={14} />
                          </span>
                          읽음 처리
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : (
        <EmptyState
          title="아직 알림이 없어요"
          description="새로운 소식이 생기면 이 화면에서 바로 확인할 수 있어요."
        />
      )}
    </div>
  );
}
