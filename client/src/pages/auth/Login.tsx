import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { toast } from 'sonner';

import AuthShell from '@/components/auth/AuthShell';
import Input from '@/components/reusable/inputs/Input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  loginSchema,
  REMEMBERED_EMAIL_KEY,
  type LoginFormValues,
} from '@/lib/validations/auth';
import { authApi } from '@/lib/api/auth.api';
import { showApiErrorToast } from '@/lib/api/errors';
import { setAuth } from '@/states/features/auth.slice';
import { useAppDispatch } from '@/states/store/hooks.state';

const rememberedEmail =
  typeof window !== 'undefined'
    ? (localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? '')
    : '';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: rememberedEmail,
      password: '',
      rememberMe: Boolean(rememberedEmail),
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);

    try {
      const response = await authApi.login({
        email: data.email,
        password: data.password,
      });
      dispatch(setAuth(response));
      toast.success(`Welcome back${response.user.firstName ? `, ${response.user.firstName}` : ''}`, {
        description: response.user.fullName
          ? `Signed in as ${response.user.fullName}.`
          : 'You are signed in to Tuza Health Timesheets.',
      });

      if (data.rememberMe) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, data.email);
      } else {
        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }

      navigate('/dashboard', { replace: true });
    } catch (err) {
      showApiErrorToast(err, 'login');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <section className="flex w-full flex-col gap-7">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-foreground">Sign in</h2>
          <p className="text-sm text-muted-foreground">
            Enter your credentials to access the timesheet portal.
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-5"
        >
          <div className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="you@tuzahealth.com"
              error={errors.email?.message}
              {...register('email')}
              required
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter password"
              error={errors.password?.message}
              required
              suffix={
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((current) => !current)}
                  className="flex size-7 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/30"
                >
                  {showPassword ? (
                    <EyeOffIcon className="size-4" />
                  ) : (
                    <EyeIcon className="size-4" />
                  )}
                </button>
              }
              {...register('password')}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <Controller
              name="rememberMe"
              control={control}
              render={({ field }) => (
                <Input
                  type="checkbox"
                  label="Remember me"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />

            <Link
              to="/auth/forgot-password"
              className="text-sm text-primary underline-offset-4 hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            className="h-10 w-full rounded-none"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Spinner data-icon="inline-start" />
                Signing in
              </>
            ) : (
              'Sign in'
            )}
          </Button>
        </form>
      </section>
    </AuthShell>
  );
};

export default Login;
