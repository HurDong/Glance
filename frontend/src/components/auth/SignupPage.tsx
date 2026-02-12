import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api/v1/auth';

export const SignupPage = () => {
  const { register, handleSubmit, formState: { errors }, watch } = useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [signupError, setSignupError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();



  const onSubmit = async (data: any) => {
    setIsLoading(true);
    setSignupError('');
    try {
      await axios.post(`${API_BASE_URL}/signup`, {
        email: data.email,
        password: data.password,
        nickname: data.nickname
      });
      alert('회원가입이 완료되었습니다. 로그인해주세요.');
      navigate('/');
    } catch (error: any) {
      console.error(error);
      setSignupError('회원가입에 실패했습니다. 이미 존재하는 이메일일 수 있습니다.');
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
          <h2 className="text-3xl font-bold text-primary tracking-tight">회원가입</h2>
          <p className="mt-2 text-sm text-muted-foreground">Glance의 회원이 되어 다양한 기능을 누려보세요.</p>
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
                {...register("email", { required: "이메일을 입력해주세요", pattern: { value: /^\S+@\S+$/i, message: "올바른 이메일 형식이 아닙니다" } })}
              />
              {errors.email && <span className="text-red-500 text-xs mt-1">{String(errors.email.message)}</span>}
            </div>

             <div>
              <label htmlFor="nickname" className="block text-sm font-medium text-muted-foreground mb-1">
                닉네임
              </label>
              <input
                id="nickname"
                type="text"
                placeholder="별명"
                className="w-full bg-muted border-none rounded-lg px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none"
                {...register("nickname", { required: "닉네임을 입력해주세요" })}
              />
              {errors.nickname && <span className="text-red-500 text-xs mt-1">{String(errors.nickname.message)}</span>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-muted-foreground mb-1">
                비밀번호
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="비밀번호"
                  className="w-full bg-muted border-none rounded-lg px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none pr-10"
                  {...register("password", { required: "비밀번호를 입력해주세요", minLength: { value: 6, message: "비밀번호는 6자 이상이어야 합니다" } })}
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

             <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-muted-foreground mb-1">
                비밀번호 확인
              </label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="비밀번호 확인"
                className="w-full bg-muted border-none rounded-lg px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none"
                 {...register("confirmPassword", { 
                    required: "비밀번호 확인을 입력해주세요",
                    validate: (_password: string) => {
                        if (watch('password') != _password) {
                            return "비밀번호가 일치하지 않습니다";
                        }
                    }
                 })}
              />
              {errors.confirmPassword && <span className="text-red-500 text-xs mt-1">{String(errors.confirmPassword.message)}</span>}
            </div>
          </div>

          {signupError && (
            <div className="text-red-500 text-sm text-center bg-red-500/10 py-2 rounded-lg">
              {signupError}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? '가입 중...' : '회원가입'}
          </button>

           <div className="text-center text-sm">
            <span className="text-muted-foreground">이미 계정이 있으신가요? </span>
            <Link to="/login" className="font-medium text-primary hover:text-primary/80">
              로그인
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};
