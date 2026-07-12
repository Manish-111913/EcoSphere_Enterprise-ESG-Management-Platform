import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/auth';
import { useToast } from '../components/ui-kit/Toast';
import AuthLayout from '../components/AuthLayout';
import { Loader2, CheckCircle2, AlertOctagon, Mail, ArrowRight } from 'lucide-react';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { verifyEmail } = useAuth();

  const token = searchParams.get('token') || 'demo';
  const emailParam = searchParams.get('email') || 'your account';

  const [status, setStatus] = useState<'verifying' | 'success' | 'expired'>('verifying');

  useEffect(() => {
    document.title = "Verify Email | EcoSphere";

    // Simulate 1s verifying spinner delay
    const timer = setTimeout(async () => {
      if (token === 'expired') {
        setStatus('expired');
      } else {
        try {
          await verifyEmail(token);
          setStatus('success');
        } catch (err) {
          setStatus('expired');
        }
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [token, verifyEmail]);

  const handleResend = () => {
    toast('Verification Resent', 'success', `A fresh compliance verification link has been dispatched to ${emailParam}.`);
  };

  return (
    <AuthLayout>
      <div className="text-center">
        {status === 'verifying' && (
          <div className="space-y-6 py-8">
            <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto" />
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-neutral-text-dark">Verifying alignment</h1>
              <p className="text-xs text-neutral-text-muted">Checking authentication token & signature keys...</p>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-6 py-4 animate-scaleUp">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-100 mx-auto">
              <CheckCircle2 className="w-9 h-9 text-emerald-600" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-neutral-text-dark tracking-tight">Email Verified</h1>
              <p className="text-xs text-neutral-text-muted">
                Your secure workspace login is now fully authorized for use.
              </p>
            </div>
            
            <button
              onClick={() => navigate('/login')}
              className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-2.5 rounded-xl font-bold text-sm shadow-md transition"
            >
              Continue to sign in
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {status === 'expired' && (
          <div className="space-y-6 py-4 animate-scaleUp">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center border border-red-100 mx-auto">
              <AlertOctagon className="w-9 h-9 text-red-600" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-neutral-text-dark tracking-tight">Link Expired</h1>
              <p className="text-xs text-neutral-text-muted">
                This verification signature token is stale or has already been consumed.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleResend}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition shadow"
              >
                Resend verification link
              </button>

              <Link
                to="/login"
                className="block text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
