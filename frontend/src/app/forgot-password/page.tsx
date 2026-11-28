'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, KeyRound, Lock, Mail, MailCheck, ShieldCheck } from 'lucide-react';
import AuthShell, { AUTH_BUTTON, AUTH_LINK } from '@/components/AuthShell';
import AuthInput from '@/components/AuthInput';
import OtpInput from '@/components/OtpInput';
import PasswordStrength, { isStrongPassword } from '@/components/PasswordStrength';
import { api } from '@/lib/api';
import { RESET_DONE_KEY } from '@/lib/password-reset';

type Step = 'email' | 'code' | 'password' | 'done';

const CODE_LENGTH = 6;

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

function ErrorMessage({ message }: { message: string }) {
  if (!message) return null;
  return <div className="bg-red-50 border border-red-300 text-red-600 px-4 py-3 rounded-lg text-sm">{message}</div>;
}

function Header({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="text-center">
      <span className="mx-auto mb-5 flex w-16 h-16 items-center justify-center rounded-full bg-[#2a2e35] border border-[#3a3f47] [&>svg]:w-8 [&>svg]:h-8 [&>svg]:text-[#f3f4f6]">
        {icon}
      </span>
      <h2 className="text-2xl sm:text-[28px] font-bold tracking-tight text-white mb-1.5">{title}</h2>
      <p className="text-gray-400 text-sm">{children}</p>
    </div>
  );
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [hidden, setHidden] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordErrors, setShowPasswordErrors] = useState(false);
  const [resetToken, setResetToken] = useState('');

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((left) => left - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const goTo = (next: Step) => {
    setError('');
    setNotice('');
    setHidden(true);
    setTimeout(() => {
      setStep(next);
      setHidden(false);
    }, 300);
  };

  const leaveTo = (path: string) => {
    setLeaving(true);
    setTimeout(() => router.replace(path), 300);
  };

  // Returns true when the code screen should be shown
  const sendCode = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await api.sendPasswordResetCode(email.trim());
      setOtp('');
      setResendIn(result.resendInSeconds);
      return true;
    } catch (err: any) {
      if (err.status === 429 && err.retryAfter) {
        // A code went out less than a minute ago and still works
        setResendIn(err.retryAfter);
        return true;
      }
      setError(err.message || "We couldn't send the code. Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email.trim())) {
      setEmailError('Please enter a valid email address');
      return;
    }
    if (await sendCode()) goTo('code');
  };

  const handleResend = async () => {
    if (resendIn > 0 || busy) return;
    if (await sendCode()) setNotice('A new code is on its way.');
  };

  const verifyCode = async (code: string) => {
    if (busy || code.length !== CODE_LENGTH) return;
    setBusy(true);
    setError('');
    try {
      const result = await api.verifyPasswordResetCode(email.trim(), code);
      setResetToken(result.resetToken);
      goTo('password');
    } catch (err: any) {
      setError(err.message || "That code didn't work. Please try again.");
      setOtp('');
    } finally {
      setBusy(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStrongPassword(password)) {
      setShowPasswordErrors(true);
      setError('Please choose a stronger password that meets all the requirements below.');
      return;
    }
    if (password !== confirm) {
      setError("The passwords don't match.");
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.resetPassword(resetToken, password);
      try {
        sessionStorage.setItem(RESET_DONE_KEY, email.trim());
      } catch {}
      goTo('done');
    } catch (err: any) {
      if (err.code === 'RESET_EXPIRED') {
        // Took longer than 15 minutes: start again from a fresh code
        setResetToken('');
        setPassword('');
        setConfirm('');
        goTo('email');
        setTimeout(() => setError(err.message), 350);
        return;
      }
      setError(err.message || "We couldn't update your password. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleBack = () => {
    if (step === 'code') goTo('email');
    else if (step === 'password') goTo('code');
    else leaveTo('/login');
  };

  const eyeButton = (
    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      aria-label={showPassword ? 'Hide password' : 'Show password'}
      className="p-2.5 rounded-full text-[#8b93a1] hover:text-[#f3f4f6] hover:bg-[#ffffff]/10 transition-all duration-200 ease-out"
    >
      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
    </button>
  );

  return (
    <AuthShell
      fading={leaving}
      cardHidden={hidden}
      // Once the password is changed there's nothing to go back to
      onBack={step === 'done' ? () => leaveTo('/login') : handleBack}
    >
      {step === 'email' && (
        <form onSubmit={handleEmailSubmit} className="space-y-6" noValidate>
          <Header icon={<KeyRound />} title="Forgot password?">
            Enter the email you signed up with and we&apos;ll send you a code to reset your password.
          </Header>

          <ErrorMessage message={error} />

          <AuthInput
            type="email"
            name="email"
            placeholder="Email"
            icon={<Mail />}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailError('');
              setError('');
            }}
            autoComplete="email"
            required
            status={emailError ? 'error' : 'default'}
            helperText={emailError || undefined}
          />

          <button type="submit" disabled={busy} className={AUTH_BUTTON}>
            {busy ? 'Sending code…' : 'Send code'}
          </button>

          <p className="text-center text-sm text-gray-400">
            Remembered it?{' '}
            <Link href="/login" className={AUTH_LINK}>
              Sign in
            </Link>
          </p>
        </form>
      )}

      {step === 'code' && (
        <div className="space-y-6">
          <Header icon={<MailCheck />} title="Check your email">
            If an account exists for
            <br />
            <span className="font-semibold text-[#f3f4f6] break-all">{email.trim()}</span>
            <br />
            we sent it a {CODE_LENGTH}-digit code.
          </Header>

          <div className="space-y-3">
            <OtpInput
              value={otp}
              onChange={(value) => {
                setOtp(value);
                if (error) setError('');
              }}
              onComplete={verifyCode}
              length={CODE_LENGTH}
              disabled={busy}
              invalid={Boolean(error)}
              autoFocus
            />
            <p className="min-h-[20px] text-center text-[13px]" aria-live="polite">
              {error ? (
                <span className="text-red-600">{error}</span>
              ) : notice ? (
                <span className="text-emerald-600">{notice}</span>
              ) : (
                <span className="text-gray-500">The code expires in 10 minutes. Check your spam folder if you don&apos;t see it.</span>
              )}
            </p>
          </div>

          <button onClick={() => verifyCode(otp)} disabled={otp.length !== CODE_LENGTH || busy} className={AUTH_BUTTON}>
            {busy ? 'Checking…' : 'Continue'}
          </button>

          <div className="text-center text-sm text-gray-400 space-y-2">
            <p>
              Didn&apos;t get a code?{' '}
              {resendIn > 0 ? (
                <span className="text-gray-500">Resend in {resendIn}s</span>
              ) : (
                <button type="button" onClick={handleResend} disabled={busy} className={`${AUTH_LINK} disabled:opacity-50`}>
                  Resend code
                </button>
              )}
            </p>
            <p>
              Wrong email?{' '}
              <button type="button" onClick={() => goTo('email')} className={AUTH_LINK}>
                Change it
              </button>
            </p>
          </div>
        </div>
      )}

      {step === 'password' && (
        <form onSubmit={handlePasswordSubmit} className="space-y-6" noValidate>
          <Header icon={<Lock />} title="Create a new password">
            Choose a new password for <span className="font-semibold text-[#f3f4f6] break-all">{email.trim()}</span>
          </Header>

          <ErrorMessage message={error} />

          <div className="space-y-4">
            <div>
              <AuthInput
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="New password"
                icon={<Lock />}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                autoComplete="new-password"
                required
                minLength={8}
                status={password && isStrongPassword(password) ? 'success' : showPasswordErrors ? 'error' : 'default'}
                trailing={eyeButton}
              />
              <PasswordStrength password={password} showErrors={showPasswordErrors} />
            </div>

            <AuthInput
              type={showPassword ? 'text' : 'password'}
              name="confirmPassword"
              placeholder="Confirm new password"
              icon={<Lock />}
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                setError('');
              }}
              autoComplete="new-password"
              required
              status={confirm ? (confirm === password ? 'success' : 'error') : 'default'}
              helperText={confirm && confirm !== password ? "Passwords don't match" : undefined}
            />
          </div>

          <button type="submit" disabled={busy} className={AUTH_BUTTON}>
            {busy ? 'Saving…' : 'Save new password'}
          </button>
        </form>
      )}

      {step === 'done' && (
        <div className="space-y-6">
          <Header icon={<ShieldCheck />} title="Password updated">
            Your password has been changed. Sign in with your new password.
          </Header>
          <button onClick={() => leaveTo('/login')} className={AUTH_BUTTON}>
            Back to sign in
          </button>
        </div>
      )}
    </AuthShell>
  );
}
