import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/auth';
import { useToast } from '../components/ui-kit/Toast';
import AuthLayout from '../components/AuthLayout';
import { 
  Lock, Eye, EyeOff, Loader2, Check, X, CheckCircle2, AlertOctagon, ArrowRight 
} from 'lucide-react';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { resetPassword, loading } = useAuth();

  const token = searchParams.get('token') || 'demo';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const [status, setStatus] = useState<'form' | 'success' | 'expired'>('form');
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    document.title = "Reset Password | EcoSphere";
    if (token === 'expired') {
      setStatus('expired');
    }
  }, [token]);

  // Handle countdown on success
  useEffect(() => {
    if (status === 'success') {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            navigate('/login');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [status, navigate]);

  // Live strength checklist
  const passCriteria = {
    length: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSymbol: /[^A-Za-z0-9]/.test(password)
  };

  const isPasswordStrong = Object.values(passCriteria).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let isValid = true;

    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (!isPasswordStrong) {
      setPasswordError('Please meet all password strength requirements');
      isValid = false;
    } else {
      setPasswordError('');
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords must match exactly');
      isValid = false;
    } else {
      setConfirmPasswordError('');
    }

    if (!isValid) return;

    try {
      await resetPassword(token, password);
      setStatus('success');
      toast('Password Updated', 'success', 'Your login keys have been successfully re-encrypted.');
    } catch (err) {
      toast('Update Failed', 'error', 'An error occurred resetting your credentials.');
    }
  };

  return (
    <AuthLayout>
      {status === 'form' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-black text-neutral-text-dark tracking-tight">
              Create New Password
            </h1>
            <p className="text-xs text-neutral-text-muted mt-1 leading-relaxed">
              Define a fresh, secure set of keys to guard your organizational ESG data.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-neutral-text-dark uppercase tracking-wider" htmlFor="password-reset">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-neutral-text-muted" />
                <input
                  id="password-reset"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoFocus
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={`w-full pl-9 pr-10 py-2 bg-white border ${
                    passwordError ? 'border-red-400 focus:ring-red-100' : 'border-neutral-border focus:ring-emerald-100'
                  } rounded-xl text-sm focus:outline-none focus:ring-4 transition duration-200`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-neutral-text-muted"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
              {passwordError && <p className="text-[10px] text-red-600 font-semibold">{passwordError}</p>}

              {/* LIVE strength checklist */}
              <div className="p-3 bg-neutral-50 border border-neutral-border rounded-xl space-y-1.5 text-[10px]">
                <span className="font-bold text-neutral-text-dark">Strength Requirements:</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-neutral-text-muted">
                    {passCriteria.length ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500 font-bold shrink-0" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-neutral-300 shrink-0" />
                    )}
                    <span className={passCriteria.length ? 'text-emerald-700' : ''}>8+ Characters</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-semibold text-neutral-text-muted">
                    {passCriteria.hasUpper ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500 font-bold shrink-0" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-neutral-300 shrink-0" />
                    )}
                    <span className={passCriteria.hasUpper ? 'text-emerald-700' : ''}>Uppercase letter</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-semibold text-neutral-text-muted">
                    {passCriteria.hasLower ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500 font-bold shrink-0" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-neutral-300 shrink-0" />
                    )}
                    <span className={passCriteria.hasLower ? 'text-emerald-700' : ''}>Lowercase letter</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-semibold text-neutral-text-muted">
                    {passCriteria.hasNumber ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500 font-bold shrink-0" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-neutral-300 shrink-0" />
                    )}
                    <span className={passCriteria.hasNumber ? 'text-emerald-700' : ''}>Number (0-9)</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-semibold text-neutral-text-muted">
                    {passCriteria.hasSymbol ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500 font-bold shrink-0" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-neutral-300 shrink-0" />
                    )}
                    <span className={passCriteria.hasSymbol ? 'text-emerald-700' : ''}>Symbol (!@#$)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-neutral-text-dark uppercase tracking-wider" htmlFor="confirm-reset">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-neutral-text-muted" />
                <input
                  id="confirm-reset"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className={`w-full pl-9 pr-10 py-2 bg-white border ${
                    confirmPasswordError ? 'border-red-400 focus:ring-red-100' : 'border-neutral-border focus:ring-emerald-100'
                  } rounded-xl text-sm focus:outline-none focus:ring-4 transition duration-200`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 text-neutral-text-muted"
                >
                  {showConfirmPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
              {confirmPasswordError && <p className="text-[10px] text-red-600 font-semibold">{confirmPasswordError}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-2.5 rounded-xl font-bold text-sm shadow-md transition duration-150 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                  Updating...
                </>
              ) : (
                'Save and update'
              )}
            </button>
          </form>
        </div>
      )}

      {status === 'success' && (
        <div className="text-center space-y-6 py-4 animate-scaleUp">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-100 mx-auto">
            <CheckCircle2 className="w-9 h-9 text-emerald-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-neutral-text-dark tracking-tight">Password Updated</h1>
            <p className="text-xs text-neutral-text-muted">
              Security keys synchronized. Forwarding you back to login portal in{' '}
              <span className="font-extrabold text-neutral-text-dark animate-pulse">{countdown}s</span>...
            </p>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="w-full flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl font-bold text-sm transition"
          >
            Go immediately
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {status === 'expired' && (
        <div className="text-center space-y-6 py-4 animate-scaleUp">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center border border-red-100 mx-auto">
            <AlertOctagon className="w-9 h-9 text-red-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-neutral-text-dark tracking-tight">Invalid Link</h1>
            <p className="text-xs text-neutral-text-muted">
              This recovery link is either malformed, expired, or has already been used once.
            </p>
          </div>
          <div className="space-y-3">
            <Link
              to="/forgot-password"
              className="block w-full text-center bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition shadow"
            >
              Request a new link
            </Link>
            <Link
              to="/login"
              className="block text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
            >
              Back to login
            </Link>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
