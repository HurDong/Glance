import React, { useRef, useEffect } from 'react';
import { User, Mail, Bell, Shield, LogOut } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuthStore } from '../../stores/authStore';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ProfilePopoverProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
}

export const ProfilePopover: React.FC<ProfilePopoverProps> = ({ isOpen, onClose, anchorRef }) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuthStore();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // If clicking on the anchor button, let the anchor button's toggle handler work
      if (anchorRef.current && anchorRef.current.contains(event.target as Node)) {
        return;
      }
      
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen || !user) return null;

  return (
    <div 
      ref={popoverRef}
      className={cn(
        "absolute right-0 top-16 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200",
        "mr-6"
      )}
    >
      <div className="p-4 border-b border-border bg-muted/30 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
          {user.nickname ? user.nickname.substring(0, 2).toUpperCase() : 'ME'}
        </div>
        <div>
          <h3 className="font-bold text-sm">{user.nickname || 'Unknown User'}</h3>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
      </div>
      
      <div className="p-2">
        <div className="space-y-1">
          <button className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-accent text-sm transition-colors text-left">
            <User size={16} className="text-muted-foreground" />
            <span>프로필 수정</span>
          </button>
          {/* ... other standard buttons ... */}
        </div>
        
        <div className="my-2 border-t border-border" />
        
        <button 
            onClick={() => {
                logout();
                onClose();
            }}
            className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-red-500/10 text-red-500 text-sm transition-colors text-left"
        >
          <LogOut size={16} />
          <span>로그아웃</span>
        </button>
      </div>
    </div>
  );
};
