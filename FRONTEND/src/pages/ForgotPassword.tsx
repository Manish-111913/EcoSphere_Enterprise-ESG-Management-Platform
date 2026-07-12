import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/auth';
import { useToast } from '../components/ui-kit/Toast';
import AuthLayout from '../components/AuthLayout';
import { Mail, ArrowLeft, Loader2, KeyRound, ArrowRight } from 'lucide-react';

export default function ForgotPassword() {
  const { forgotPassword, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    document.title = "Forgot Password | EcoSphere";
  }, []);

  const validateEmail = (val: string) => {
    if (!val) {
      setEmailError('Email address is required');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val)) {
      setEmailError('Please enter a valid email format');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) return;

    try {
      await forgotPassword(email);
      
      /* 
        SECURITY PRACTICE:
        Always display a generic success confirmation banner regardless of 
        whether the email exists in the database. This prevents email 
        enumeration/probing attacks, protecting corporate privacy.
      */
      setIsSubmitted(true);
      toast('Reset link compiled', 'success', `If an account exists for ${email}, a reset link was compiled.`);
    } catch (err) {
      toast('Reset Failed', 'error', 'An unexpected error occurred. Please try again.');
    }
  };

  if (isSubmitted) {
    return (
      <AuthLayout>
        <div className="space-y-6">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100 mx-auto">
            <KeyRound className="w-8 h-8 text-emerald-600" />
          </div>

          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-black text-neutral-text-dark tracking-tight">
              Reset Link Dispatched
            </h1>
            <p className="text-xs text-neutral-text-muted leading-relaxed">
              If an account is associated with <span className="font-extrabold text-neutral-text-dark">{email}</span> in our registry, a password recovery token is on its way.
            </p>
          </div>

          {/* Sandbox Bypass Simulation */}
          <div className="p-4 bg-slate-50 border border-neutral-border rounded-2xl space-y-3">
            <span className="text-[10px] font-black tracking-widest text-neutral-text-muted uppercase text-center block">
              Quick Sandbox Bypass
            </span>
            <button
              onClick={() => navigate(`/reset-password?token=demo&email=${encodeURIComponent(email)}`)}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-sm transition"
            >
              Simulate email link
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="text-center">
            <Link to="/login" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline">
              Back to sign in
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="space-y-1">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to sign in
          </Link>
          <h1 className="text-2xl font-black text-neutral-text-dark tracking-tight mt-3">
            Recover your password
          </h1>
          <p className="text-xs text-neutral-text-muted leading-relaxed">
            Enter your registered enterprise email below, and we'll transmit instructions to safely reset your security keys.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-neutral-text-dark uppercase tracking-wider" htmlFor="email-forgot">
              Work Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-neutral-text-muted" />
              <input
                id="email-forgot"
                type="email"
                autoFocus
                placeholder="dent@magrathea.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onBlur={() => validateEmail(email)}
                className={`w-full pl-9 pr-3 py-2 bg-white border ${
                  emailError ? 'border-red-400 focus:ring-red-100' : 'border-neutral-border focus:ring-emerald-100'
                } rounded-xl text-sm focus:outline-none focus:ring-4 transition duration-200`}
                disabled={loading}
              />
            </div>
            {emailError && (
              <p className="text-[10px] text-red-600 font-semibold">
                {emailError}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-2.5 rounded-xl font-bold text-sm shadow-md transition duration-150 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending Link...
              </>
            ) : (
              'Send Recovery Link'
            )}
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}
