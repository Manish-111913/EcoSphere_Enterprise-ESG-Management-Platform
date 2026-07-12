import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/auth';
import { useToast } from '../components/ui-kit/Toast';
import AuthLayout from '../components/AuthLayout';
import { Lock, User, Loader2, Sparkles, Building, Briefcase } from 'lucide-react';
import { UserRole } from '../types';

export default function Invite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { acceptInvite, loading } = useAuth();

  const token = searchParams.get('token') || 'demo';
  const email = searchParams.get('email') || 'priya@acme.com';
  const role = (searchParams.get('role') || 'ESG Manager') as UserRole;
  const department = searchParams.get('dept') || 'Operations';

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [nameError, setNameError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    document.title = "Accept Invitation | EcoSphere";
  }, []);

  const validateName = (val: string) => {
    if (!val.trim()) {
      setNameError('Full name is required');
      return false;
    }
    setNameError('');
    return true;
  };

  const validatePassword = (val: string) => {
    if (!val) {
      setPasswordError('Please set a password');
      return false;
    }
    if (val.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameValid = validateName(name);
    const passValid = validatePassword(password);

    if (!nameValid || !passValid) return;

    try {
      await acceptInvite(token, name, password, role, department);
      toast('Welcome to EcoSphere!', 'success', `Successfully activated account for ${email} in the ${department} department.`);
      navigate('/dashboard');
    } catch (err) {
      toast('Activation Failed', 'error', 'Failed to authorize and activate invitation.');
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            Invitation Authorized
          </div>
          <h1 className="text-2xl font-black text-neutral-text-dark tracking-tight">
            You've been invited
          </h1>
          <p className="text-xs text-neutral-text-muted leading-relaxed">
            Activate your seat inside <span className="font-extrabold text-neutral-text-dark">EcoSphere</span> and join your organizational ESG squad.
          </p>
        </div>

        {/* Assigned Details Panel */}
        <div className="p-4 bg-slate-50 border border-neutral-border rounded-2xl space-y-3.5">
          {/* Read only email */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-neutral-text-muted uppercase tracking-wider">Prefilled Login Email</span>
            <p className="text-sm font-extrabold text-neutral-text-dark truncate select-all">{email}</p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-neutral-border/60">
            {/* Role Chip */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-neutral-text-muted uppercase tracking-wider flex items-center gap-1">
                <Briefcase className="w-3 h-3 text-neutral-400 shrink-0" />
                Assigned Role
              </span>
              <span className="inline-flex text-[11px] font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-200 rounded-lg px-2.5 py-1">
                {role}
              </span>
            </div>

            {/* Department Chip */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-neutral-text-muted uppercase tracking-wider flex items-center gap-1">
                <Building className="w-3 h-3 text-neutral-400 shrink-0" />
                Department
              </span>
              <span className="inline-flex text-[11px] font-bold text-slate-800 bg-slate-100/70 border border-slate-200 rounded-lg px-2.5 py-1">
                {department}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-neutral-text-dark uppercase tracking-wider" htmlFor="invite-name">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-neutral-text-muted" />
              <input
                id="invite-name"
                type="text"
                autoFocus
                placeholder="Priya Sharma"
                value={name}
                onChange={e => setName(e.target.value)}
                onBlur={() => validateName(name)}
                className={`w-full pl-9 pr-3 py-2 bg-white border ${
                  nameError ? 'border-red-400 focus:ring-red-100' : 'border-neutral-border focus:ring-emerald-100'
                } rounded-xl text-sm focus:outline-none focus:ring-4 transition duration-200`}
                disabled={loading}
              />
            </div>
            {nameError && <p className="text-[10px] text-red-600 font-semibold">{nameError}</p>}
          </div>

          {/* Password selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-neutral-text-dark uppercase tracking-wider" htmlFor="invite-password">
              Configure Secure Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-neutral-text-muted" />
              <input
                id="invite-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onBlur={() => validatePassword(password)}
                className={`w-full pl-9 pr-3 py-2 bg-white border ${
                  passwordError ? 'border-red-400 focus:ring-red-100' : 'border-neutral-border focus:ring-emerald-100'
                } rounded-xl text-sm focus:outline-none focus:ring-4 transition duration-200`}
                disabled={loading}
              />
            </div>
            {passwordError && <p className="text-[10px] text-red-600 font-semibold">{passwordError}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-2.5 rounded-xl font-bold text-sm shadow-md transition duration-150 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4.5 h-4.5 animate-spin" />
                Activating...
              </>
            ) : (
              'Activate Seat'
            )}
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}
