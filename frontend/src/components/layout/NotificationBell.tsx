import React, { useEffect, useState, useRef } from 'react';
import { Bell, Check, Users, Share2, Heart, Info, X } from 'lucide-react';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { useAuthStore } from '../../stores/authStore';
import { clsx } from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

export const NotificationBell: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { notifications, unreadCount, fetchNotifications, fetchUnreadCount, markAsRead, markAllAsRead } = useNotificationStore();
    const { token } = useAuthStore();
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (token) {
            fetchNotifications();
            fetchUnreadCount();
        }
    }, [token, fetchNotifications, fetchUnreadCount]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleBellClick = () => {
        if (!isOpen) {
            fetchNotifications();
            fetchUnreadCount();
        }
        setIsOpen(!isOpen);
    };

    const handleNotificationClick = (id: number, isRead: boolean) => {
        if (!isRead) {
            markAsRead(id);
        }
    };

    const formatNotificationTime = (dateStr: string) => {
        try {
            if (!dateStr) return '방금 전';
            return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ko });
        } catch (e) {
            return '방금 전';
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'GROUP_JOIN': return <Users size={14} className="text-blue-500" />;
            case 'PORTFOLIO_SHARE': return <Share2 size={14} className="text-green-500" />;
            case 'REACTION': return <Heart size={14} className="text-red-500" />;
            default: return <Info size={14} className="text-gray-500" />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={handleBellClick}
                className="relative p-2 rounded-xl bg-card border border-border/50 hover:bg-muted/80 transition-all hover:scale-105 active:scale-95 shadow-sm group"
            >
                <Bell size={20} className="text-muted-foreground group-hover:text-primary transition-colors" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-background animate-in zoom-in duration-300 shadow-md">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-[320px] sm:w-[380px] bg-card/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] z-[100] animate-in fade-in slide-in-from-top-3 duration-200">
                    <div className="p-4 border-b border-border/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-base tracking-tight">알림</h3>
                            {unreadCount > 0 && (
                                <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black rounded-full">
                                    {unreadCount}개
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => markAllAsRead()}
                                className="text-[11px] font-bold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                            >
                                <Check size={12} /> 모두 읽음
                            </button>
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="p-1 hover:bg-muted rounded-lg transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto hide-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-3">
                                <div className="p-3 bg-muted rounded-full">
                                    <Bell size={24} className="opacity-40" />
                                </div>
                                <p className="text-sm font-bold opacity-60">새로운 알림이 없습니다.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col divide-y divide-border/40">
                                {notifications.map((n) => (
                                    <div
                                        key={n.id}
                                        onClick={() => handleNotificationClick(n.id, n.isRead)}
                                        className={clsx(
                                            "p-4 hover:bg-muted/50 transition-all cursor-pointer flex gap-4 items-start relative",
                                            !n.isRead ? "bg-primary/[0.03]" : "opacity-60 bg-transparent"
                                        )}
                                    >
                                        {!n.isRead && (
                                            <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-full shadow-[0_0_8px_var(--primary)]" />
                                        )}
                                        <div className={clsx(
                                            "p-2.5 bg-background border rounded-xl shadow-sm shrink-0 mt-1 transition-colors",
                                            !n.isRead ? "border-primary/20" : "border-border/40"
                                        )}>
                                            {getIcon(n.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={clsx(
                                                "text-sm leading-relaxed mb-1.5 transition-colors",
                                                !n.isRead ? "text-foreground font-bold" : "text-muted-foreground font-medium"
                                            )}>
                                                {n.content}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] font-bold text-muted-foreground/60">
                                                    {formatNotificationTime(n.createdAt)}
                                                </span>
                                                {n.isRead && (
                                                    <span className="text-[10px] font-black text-muted-foreground/40 bg-muted px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                                        Read
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <div className="p-3 border-t border-border/50 text-center">
                        <button className="text-xs font-black text-muted-foreground hover:text-primary transition-colors">
                            전체 알림 내역 보기
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
