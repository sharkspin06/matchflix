'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import AuthShell, { AUTH_BUTTON, AUTH_LINK } from '@/components/AuthShell';
import { api } from '@/lib/api';
import { RESET_DONE_KEY } from '@/lib/password-reset';
import AuthInput from '@/components/AuthInput';
import Wordmark from '@/components/Wordmark';

export default function LoginPage() {
  const router = useRouter();
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState('');

  // Coming back from "Forgot password": fill in the email and confirm the change
  useEffect(() => {
    try {
      const resetEmail = sessionStorage.getItem(RESET_DONE_KEY);
      if (resetEmail) {
        sessionStorage.removeItem(RESET_DONE_KEY);
        setFormData((current) => ({ ...current, email: resetEmail }));
        setNotice('Password updated. Sign in with your new password.');
      }
    } catch {}
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');

    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      const response = await api.login(formData.email, formData.password);
      localStorage.setItem('token', response.token);
      
      setIsTransitioning(true);
      setTimeout(() => {
        router.replace('/discover');
      }, 300);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell fading={isTransitioning}>
      <div className="space-y-6">
        <div className="text-center">
          <Wordmark className="h-12 sm:h-14 mx-auto mb-5" />
          <h2 className="text-2xl sm:text-[28px] font-bold tracking-tight text-white mb-1.5">Welcome Back</h2>
          <p className="text-gray-400 text-sm">Sign in to continue your journey</p>
        </div>

        {notice && !error && (
          <div className="bg-emerald-500/10 border border-emerald-400/40 text-emerald-300 px-4 py-3 rounded-lg text-sm" role="status">
            {notice}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <AuthInput
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Email"
            icon={<Mail />}
            autoComplete="email"
            required
          />

          <AuthInput
            type={showPassword ? "text" : "password"}
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Password"
            icon={<Lock />}
            required
            minLength={6}
            autoComplete="current-password"
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="p-2.5 rounded-full text-[#8b93a1] hover:text-[#f3f4f6] hover:bg-[#ffffff]/10 transition-all duration-200 ease-out"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            }
          />

          <div className="flex items-center justify-between text-sm pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded accent-gray-400" />
              <span className="text-gray-400">Remember me</span>
            </label>
            <Link href="/forgot-password" className="text-gray-300 hover:text-white font-medium hover:underline">
              Forgot password?
            </Link>
          </div>

          <button type="submit" disabled={loading} className={`${AUTH_BUTTON} !mt-6`}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-gray-500">
          <span className="h-px flex-1 bg-white/10" />
          or
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <p className="text-center text-sm text-gray-400">
          Don't have an account?{' '}
          <Link href="/register" className={AUTH_LINK}>
            Create account
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
