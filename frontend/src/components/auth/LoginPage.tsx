import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import axios from 'axios';

// API Base URL (Should be in env, but hardcoding for now as per project style)
const API_BASE_URL = 'http://localhost:8080/api/v1/auth';

export const LoginPage = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    setLoginError('');
    try {
      const response = await axios.post(`${API_BASE_URL}/login`, data);
      const { accessToken } = response.data;
      
      // For now, we decode email/nickname from token or just mock it since backend returns token only currently
      // Note: Backend login endpoint returns TokenDto. To get user info, we might need another endpoint or decode JWT.
      // For this step, I'll just use the email from the form and a placeholder nickname, 
      // OR better, update backend Login to return User info too. 
      // Let's assume for now we just store email.
      // ACTUAL PLAN: Decode JWT or Fetch User Info. 
      // For simplicity/speed: I'll trust the email input for display or fetch profile later.
      // Let's just set email as nickname for now if we don't have it.
      
      login({ email: data.email, nickname: data.email.split('@')[0] }, accessToken);
      navigate('/');
    } catch (error: any) {
      console.error(error);
      setLoginError('이메일 또는 비밀번호를 확인해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 bg-card p-8 rounded-2xl shadow-lg border border-border">
        <div className="flex items-center space-x-2 text-muted-foreground hover:text-primary transition-colors cursor-pointer" onClick={() => navigate('/')}>
            <ArrowLeft size={20} />
            <span className="text-sm">메인으로 돌아가기</span>
        </div>
        
        <div className="text-center">
          <h2 className="text-3xl font-bold text-primary tracking-tight">Glance</h2>
          <p className="mt-2 text-sm text-muted-foreground">로그인하고 더 많은 기능을 이용해보세요.</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-muted-foreground mb-1">
                이메일
              </label>
              <input
                id="email"
                type="email"
                placeholder="name@example.com"
                className="w-full bg-muted border-none rounded-lg px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none"
                {...register("email", { required: "이메일을 입력해주세요" })}
              />
              {errors.email && <span className="text-red-500 text-xs mt-1">{String(errors.email.message)}</span>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-muted-foreground mb-1">
                비밀번호
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="비밀번호를 입력해주세요"
                  className="w-full bg-muted border-none rounded-lg px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none pr-10"
                  {...register("password", { required: "비밀번호를 입력해주세요" })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <span className="text-red-500 text-xs mt-1">{String(errors.password.message)}</span>}
            </div>
          </div>

          {loginError && (
            <div className="text-red-500 text-sm text-center bg-red-500/10 py-2 rounded-lg">
              {loginError}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </button>
          
           <div className="text-center text-sm">
            <span className="text-muted-foreground">계정이 없으신가요? </span>
            <Link to="/signup" className="font-medium text-primary hover:text-primary/80">
              회원가입
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};
