import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Eye, EyeOff, X } from 'lucide-react';
import axios from 'axios';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// API Base URL
const API_BASE_URL = 'http://localhost:8080/api/v1/auth';

interface LoginPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
}

export const LoginPopover: React.FC<LoginPopoverProps> = ({ isOpen, onClose, anchorRef }) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

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

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    setLoginError('');
    try {
      const response = await axios.post(`${API_BASE_URL}/login`, data);
      const { accessToken } = response.data;
      
      login({ email: data.email, nickname: data.email.split('@')[0] }, accessToken);
      onClose(); // Close popover on success
      navigate('/'); // Ensure we are on main page (though likely already there)
    } catch (error: any) {
      console.error(error);
      setLoginError('이메일 또는 비밀번호를 확인해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={popoverRef}
      className={cn(
        "absolute right-0 top-16 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200",
        "mr-6"
      )}
    >
      <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
        <h3 className="font-bold text-sm">로그인</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={16} />
        </button>
      </div>
      
      <div className="p-4">
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <input
              type="email"
              placeholder="이메일"
              className="w-full bg-muted border-none rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
              {...register("email", { required: true })}
            />
            {errors.email && <span className="text-red-500 text-[10px] mt-1 block">이메일을 입력해주세요</span>}
          </div>

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="비밀번호"
              className="w-full bg-muted border-none rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none pr-8"
              {...register("password", { required: true })}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
             {errors.password && <span className="text-red-500 text-[10px] mt-1 block">비밀번호를 입력해주세요</span>}
          </div>

          {loginError && (
            <div className="text-red-500 text-xs text-center bg-red-500/10 py-1.5 rounded-md">
              {loginError}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-opacity-90 transition-opacity disabled:opacity-50"
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-muted-foreground border-t border-border pt-3">
          계정이 없으신가요? <br/>
          <Link 
            to="/signup" 
            className="text-primary hover:underline font-medium ml-1"
            onClick={onClose}
          >
            회원가입하기
          </Link>
        </div>
      </div>
    </div>
  );
};
