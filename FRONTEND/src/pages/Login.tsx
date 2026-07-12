import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/auth';
import { useToast } from '../components/ui-kit/Toast';
import AuthLayout from '../components/AuthLayout';
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { UserRole } from '../types';

export default function Login() {
  const { isLoggedIn, login, quickDemoLogin, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Failure and lock states
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  // Inline Validation helper text
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [bannerError, setBannerError] = useState('');

  const returnTo = searchParams.get('returnTo') || '/dashboard';

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (isLoggedIn) {
      navigate(returnTo, { replace: true });
    }
  }, [isLoggedIn, navigate, returnTo]);

  // Set page title
  useEffect(() => {
    document.title = "Sign In | EcoSphere";
  }, []);

  const validateEmail = (val: string) => {
    if (!val) {
      setEmailError('Email address is strictly required');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = (val: string) => {
    if (!val) {
      setPasswordError('Password is required');
      return false;
    }
    if (val.length < 4) {
      setPasswordError('Password must be at least 4 characters');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      setBannerError('This account is temporarily locked due to too many failed attempts. Use Quick Demo Access instead.');
      return;
    }

    setBannerError('');
    const emailValid = validateEmail(email);
    const passValid = validatePassword(password);

    if (!emailValid || !passValid) return;

    try {
      await login(email, password);
      toast('Welcome back!', 'success', 'You have successfully signed into your EcoSphere workspace.');
      navigate(returnTo, { replace: true });
    } catch (err) {
      const nextFailures = failedAttempts + 1;
      setFailedAttempts(nextFailures);
      
      if (nextFailures >= 5) {
        setIsLocked(true);
        setBannerError('Account locked. You have exceeded 5 failed attempts. Please contact your IT administrator or use Quick Demo Access.');
        toast('Account Locked', 'error', 'Too many failed login attempts.');
      } else {
        setBannerError(`Invalid corporate credentials. Attempt ${nextFailures} of 5.`);
      }
    }
  };

  const handleDemoLogin = (selectedRole: UserRole) => {
    quickDemoLogin(selectedRole);
    toast('Demo Auto-Sign In', 'success', `Instantly logged in as ${selectedRole}.`);
    navigate(returnTo, { replace: true });
  };

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-neutral-text-dark">
            Welcome back
          </h1>
          <p className="text-xs text-neutral-text-muted mt-1.5 font-medium">
            Enter your enterprise credentials to access your ESG cockpit.
          </p>
        </div>

        {/* Global error / Account-locked banner */}
        {bannerError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-fadeIn" id="login-error-banner">
            <AlertCircle className="w-4.5 h-4.5 shrink-0 text-red-500 mt-0.5" />
            <div>
              <span className="font-bold">Authentication Failed</span>
              <p className="mt-0.5 leading-relaxed">{bannerError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email field */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-neutral-text-dark uppercase tracking-wider" htmlFor="email-input">
              Work Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-neutral-text-muted" />
              <input
                id="email-input"
                type="email"
                autoFocus
                placeholder="you@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onBlur={() => validateEmail(email)}
                className={`w-full pl-9 pr-3 py-2.5 bg-white border ${
                  emailError ? 'border-red-400 focus:ring-red-100' : 'border-neutral-border focus:ring-emerald-100'
                } rounded-xl text-sm focus:outline-none focus:ring-4 transition duration-200`}
                disabled={loading || isLocked}
              />
            </div>
            {emailError && (
              <p className="text-[11px] text-red-600 font-medium" id="email-error-msg">
                {emailError}
              </p>
            )}
          </div>

          {/* Password field */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold text-neutral-text-dark uppercase tracking-wider" htmlFor="password-input">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline transition"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-neutral-text-muted" />
              <input
                id="password-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onBlur={() => validatePassword(password)}
                className={`w-full pl-9 pr-10 py-2.5 bg-white border ${
                  passwordError ? 'border-red-400 focus:ring-red-100' : 'border-neutral-border focus:ring-emerald-100'
                } rounded-xl text-sm focus:outline-none focus:ring-4 transition duration-200`}
                disabled={loading || isLocked}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-neutral-text-muted hover:text-neutral-text-dark transition"
              >
                {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            </div>
            {passwordError && (
              <p className="text-[11px] text-red-600 font-medium" id="password-error-msg">
                {passwordError}
              </p>
            )}
          </div>

          {/* Remember me */}
          <div className="flex items-center">
            <input
              id="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-neutral-border rounded-md transition"
            />
            <label htmlFor="remember-me" className="ml-2 text-xs text-neutral-text-dark font-medium cursor-pointer">
              Remember my session
            </label>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            id="signin-btn"
            disabled={loading || isLocked}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-2.5 rounded-xl font-bold text-sm shadow-md transition duration-200 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-border"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-3 bg-slate-50 md:bg-white text-neutral-text-muted font-semibold uppercase tracking-wider text-[10px]">
              Or Quick Demo Access
            </span>
          </div>
        </div>

        {/* Quick demo role picker strip */}
        <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center gap-1.5 text-emerald-800">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-[10px] font-extrabold uppercase tracking-widest">Enterprise Role Bypasses</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5" id="demo-role-picker-container">
            {(['Admin', 'ESG Manager', 'CSR Manager', 'Compliance Officer', 'Department Head', 'Employee', 'Auditor'] as UserRole[]).map(roleBtn => (
              <button
                key={roleBtn}
                type="button"
                onClick={() => handleDemoLogin(roleBtn)}
                className="text-[10px] font-bold text-slate-700 hover:text-white bg-white hover:bg-emerald-600 border border-slate-200 hover:border-emerald-600 px-2 py-1.5 rounded-lg text-left truncate transition duration-150 flex items-center justify-between"
              >
                <span>{roleBtn}</span>
                <span className="text-[9px] text-neutral-400 font-normal group-hover:text-white">Sign In →</span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-neutral-text-muted">
            New to EcoSphere?{' '}
            <Link to="/signup" className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline transition">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
