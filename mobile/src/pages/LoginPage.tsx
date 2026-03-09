import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { loginApi } from '@/api/auth';
import { applyZodErrors } from '@/lib/forms';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';

const loginSchema = z.object({
  email: z.string().email('올바른 이메일 형식을 입력해 주세요.'),
  password: z.string().min(1, '비밀번호를 입력해 주세요.'),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);
  const pushToast = useToastStore((state) => state.push);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<LoginValues>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const from = (location.state as { from?: string } | null)?.from || '/';

  const handleSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const parsed = loginSchema.safeParse(values);

    if (!parsed.success) {
      applyZodErrors(form, parsed.error);
      return;
    }

    setLoading(true);

    try {
      const token = await loginApi(parsed.data);
      login(
        {
          email: parsed.data.email,
          nickname: parsed.data.email.split('@')[0] || '사용자',
        },
        token.accessToken,
      );
      pushToast('다시 연결됐어요.', 'success');
      navigate(from, { replace: true });
    } catch (error) {
      console.error(error);
      setFormError('이메일이나 비밀번호를 다시 확인해 주세요.');
    } finally {
      setLoading(false);
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-md rounded-[32px] border border-[color:var(--card-border)] bg-[color:var(--card-bg)] p-6 shadow-card backdrop-blur-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--brand-accent)]">
          Glance
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-[color:var(--text-main)]">
          투자 흐름을 같이 보는 곳
        </h1>
        <p className="mt-3 text-sm leading-6 text-[color:var(--text-sub)]">
          실시간 시세, 포트폴리오 공유, 그룹 인사이트를 한곳에서 이어보세요.
        </p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[color:var(--text-sub)]">이메일</span>
            <input
              type="email"
              {...form.register('email')}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[color:var(--text-main)] outline-none placeholder:text-slate-500 focus:border-blue-400/30"
              placeholder="name@example.com"
            />
            {form.formState.errors.email ? (
              <p className="mt-2 text-xs font-semibold text-rose-300">
                {form.formState.errors.email.message}
              </p>
            ) : null}
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[color:var(--text-sub)]">비밀번호</span>
            <input
              type="password"
              {...form.register('password')}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[color:var(--text-main)] outline-none placeholder:text-slate-500 focus:border-blue-400/30"
              placeholder="비밀번호"
            />
            {form.formState.errors.password ? (
              <p className="mt-2 text-xs font-semibold text-rose-300">
                {form.formState.errors.password.message}
              </p>
            ) : null}
          </label>

          {formError ? (
            <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200">
              {formError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-blue-500 px-4 py-3 font-semibold text-white transition hover:bg-blue-400 disabled:opacity-50"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-[color:var(--text-sub)]">
          아직 계정이 없다면{' '}
          <Link to="/signup" className="font-semibold text-blue-200">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
