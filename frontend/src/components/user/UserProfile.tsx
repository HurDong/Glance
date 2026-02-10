import React from 'react';
import { User, Mail, Bell, Shield, LogOut } from 'lucide-react';

export const UserProfile: React.FC = () => {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center space-x-4 mb-8">
        <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-3xl">
          DM
        </div>
        <div>
          <h1 className="text-2xl font-bold">Dong Min</h1>
          <p className="text-muted-foreground">Premium Member</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30">
          <h3 className="font-semibold">계정 설정</h3>
        </div>
        <div className="divide-y divide-border">
          <div className="p-4 flex items-center justify-between hover:bg-muted/50 cursor-pointer transition-colors">
            <div className="flex items-center space-x-3">
              <User className="text-muted-foreground" size={20} />
              <span>프로필 수정</span>
            </div>
            <span className="text-sm text-muted-foreground">Coming Soon</span>
          </div>
          <div className="p-4 flex items-center justify-between hover:bg-muted/50 cursor-pointer transition-colors">
            <div className="flex items-center space-x-3">
              <Mail className="text-muted-foreground" size={20} />
              <span>이메일 설정</span>
            </div>
            <span className="text-sm text-muted-foreground">ehd_a@example.com</span>
          </div>
          <div className="p-4 flex items-center justify-between hover:bg-muted/50 cursor-pointer transition-colors">
            <div className="flex items-center space-x-3">
              <Shield className="text-muted-foreground" size={20} />
              <span>보안 및 로그인</span>
            </div>
          </div>
          <div className="p-4 flex items-center justify-between hover:bg-muted/50 cursor-pointer transition-colors">
            <div className="flex items-center space-x-3">
              <Bell className="text-muted-foreground" size={20} />
              <span>알림 설정</span>
            </div>
          </div>
           <div className="p-4 flex items-center justify-between hover:bg-red-500/10 cursor-pointer transition-colors text-red-500">
            <div className="flex items-center space-x-3">
              <LogOut size={20} />
              <span>로그아웃</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
