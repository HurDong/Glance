import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { signupApi } from '@/api/auth';
import { applyZodErrors } from '@/lib/forms';
import { useToastStore } from '@/stores/toastStore';

const signupSchema = z
  .object({
    email: z.string().email('올바른 이메일 형식을 입력해 주세요.'),
    nickname: z.string().min(2, '닉네임은 2자 이상이어야 해요.'),
    password: z.string().min(6, '비밀번호는 6자 이상이어야 해요.'),
    confirmPassword: z.string().min(1, '비밀번호 확인을 입력해 주세요.'),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: '비밀번호가 서로 같아야 해요.',
  });

type SignupValues = z.infer<typeof signupSchema>;

export function SignupPage() {
  const navigate = useNavigate();
  const pushToast = useToastStore((state) => state.push);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<SignupValues>({
    defaultValues: {
      email: '',
      nickname: '',
      password: '',
      confirmPassword: '',
    },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const parsed = signupSchema.safeParse(values);

    if (!parsed.success) {
      applyZodErrors(form, parsed.error);
      return;
    }

    setLoading(true);

    try {
      await signupApi({
        email: parsed.data.email,
        nickname: parsed.data.nickname,
        password: parsed.data.password,
      });
      pushToast('가입이 끝났어요. 이제 로그인해 볼까요?', 'success');
      navigate('/login', { replace: true });
    } catch (error) {
      console.error(error);
      setFormError('회원가입에 실패했어요. 이미 사용 중인 이메일인지 확인해 주세요.');
    } finally {
      setLoading(false);
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-md rounded-[32px] border border-[color:var(--card-border)] bg-[color:var(--card-bg)] p-6 shadow-card backdrop-blur-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--brand-accent)]">
          Join Glance
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-[color:var(--text-main)]">
          내 포트폴리오와 인사이트,
          <br />
          이제 같이 쌓아볼까요?
        </h1>
        <p className="mt-3 text-sm leading-6 text-[color:var(--text-sub)]">
          Glance에서는 시장 흐름을 보고, 포트폴리오를 정리하고, 다른 투자자와 인사이트를 나눌 수 있어요.
          계정만 만들면 바로 시작할 수 있어요.
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
            <span className="mb-2 block text-sm font-medium text-[color:var(--text-sub)]">닉네임</span>
            <input
              type="text"
              {...form.register('nickname')}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[color:var(--text-main)] outline-none placeholder:text-slate-500 focus:border-blue-400/30"
              placeholder="닉네임"
            />
            {form.formState.errors.nickname ? (
              <p className="mt-2 text-xs font-semibold text-rose-300">
                {form.formState.errors.nickname.message}
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

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[color:var(--text-sub)]">비밀번호 확인</span>
            <input
              type="password"
              {...form.register('confirmPassword')}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[color:var(--text-main)] outline-none placeholder:text-slate-500 focus:border-blue-400/30"
              placeholder="비밀번호를 한 번 더 입력해 주세요"
            />
            {form.formState.errors.confirmPassword ? (
              <p className="mt-2 text-xs font-semibold text-rose-300">
                {form.formState.errors.confirmPassword.message}
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
            {loading ? '가입 중...' : '회원가입'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-[color:var(--text-sub)]">
          이미 계정이 있다면{' '}
          <Link to="/login" className="font-semibold text-blue-200">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
