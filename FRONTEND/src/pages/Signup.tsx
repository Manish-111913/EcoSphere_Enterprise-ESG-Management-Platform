import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/auth';
import { useToast } from '../components/ui-kit/Toast';
import AuthLayout from '../components/AuthLayout';
import { 
  User, Building, Shield, ChevronRight, ChevronLeft, 
  Mail, Lock, Eye, EyeOff, Loader2, Check, X, AlertTriangle, ArrowRight 
} from 'lucide-react';
import { mockDepartments } from '../mocks/db';

const INDUSTRIES = [
  "Technology & Software",
  "Manufacturing & Logistics",
  "Banking & Financial Services",
  "Energy & Utilities",
  "Healthcare & Pharmaceuticals",
  "Retail & Consumer Goods"
];

export default function Signup() {
  const { signup, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [industry, setIndustry] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validation errors
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailWarning, setEmailWarning] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  
  const [orgError, setOrgError] = useState('');
  const [industryError, setIndustryError] = useState('');
  const [deptError, setDeptError] = useState('');

  useEffect(() => {
    document.title = "Register | EcoSphere";
  }, []);

  // Password Strength live checklist
  const passCriteria = {
    length: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSymbol: /[^A-Za-z0-9]/.test(password)
  };

  const isPasswordStrong = Object.values(passCriteria).every(Boolean);

  // Email format + soft-warning for personal emails
  const validateEmail = (val: string) => {
    setEmailWarning('');
    if (!val) {
      setEmailError('Work email is strictly required');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val)) {
      setEmailError('Please enter a valid email format');
      return false;
    }
    setEmailError('');

    // Soft warning check for common personal domains (non-blocking)
    const personalDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'aol.com', 'mail.com'];
    const domain = val.split('@')[1]?.toLowerCase();
    if (domain && personalDomains.includes(domain)) {
      setEmailWarning('Use your work email for proper organizational linking (personal email detected)');
    }
    return true;
  };

  const handleNextStep = () => {
    let isValid = true;

    if (step === 1) {
      if (!firstName.trim()) {
        setFirstNameError('First name is required');
        isValid = false;
      } else {
        setFirstNameError('');
      }

      if (!lastName.trim()) {
        setLastNameError('Last name is required');
        isValid = false;
      } else {
        setLastNameError('');
      }

      const emailValid = validateEmail(email);
      if (!emailValid) isValid = false;

      if (!password) {
        setPasswordError('Password is required');
        isValid = false;
      } else if (!isPasswordStrong) {
        setPasswordError('Please meet all password strength guidelines');
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

      if (isValid) {
        setStep(2);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let isValid = true;

    if (!orgName.trim()) {
      setOrgError('Organization name is required');
      isValid = false;
    } else {
      setOrgError('');
    }

    if (!industry) {
      setIndustryError('Please select your industry');
      isValid = false;
    } else {
      setIndustryError('');
    }

    if (!departmentId) {
      setDeptError('Please select your department');
      isValid = false;
    } else {
      setDeptError('');
    }

    if (!agreeTerms) {
      toast('Required Agreement', 'warning', 'Please accept the Terms of Service and Privacy Policy to register.');
      isValid = false;
    }

    if (!isValid) return;

    try {
      await signup({
        firstName,
        lastName,
        email,
        orgName,
        industry,
        departmentId
      });
      setIsSuccess(true);
      toast('Onboarding Initiated', 'success', `A verification link has been compiled for ${email}.`);
    } catch (err) {
      toast('Registration Failed', 'error', 'Failed to create your organization account.');
    }
  };

  if (isSuccess) {
    return (
      <AuthLayout>
        <div className="space-y-6 text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100 mx-auto animate-bounce">
            <Mail className="w-8 h-8 text-emerald-600" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-neutral-text-dark tracking-tight">
              Verify your email
            </h1>
            <p className="text-xs text-neutral-text-muted leading-relaxed px-2">
              We have dispatched a verification secure link to <span className="font-extrabold text-neutral-text-dark">{email}</span>. Click the link inside the mail to authorize.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-neutral-border rounded-2xl space-y-3">
            <span className="text-[10px] font-black tracking-widest text-neutral-text-muted uppercase block">
              Quick Sandbox Bypass
            </span>
            <button
              onClick={() => navigate(`/verify-email?token=demo&email=${encodeURIComponent(email)}`)}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-sm transition"
            >
              Simulate clicking the email link
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="text-xs">
            <Link to="/login" className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline">
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
        <div>
          <h1 className="text-2xl font-black tracking-tight text-neutral-text-dark">
            Register your workspace
          </h1>
          <p className="text-xs text-neutral-text-muted mt-1 font-medium">
            Join thousands of enterprises driving net-zero targets.
          </p>
        </div>

        {/* Slim Stepper */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              step >= 1 ? 'bg-emerald-600 text-white' : 'bg-neutral-200 text-neutral-500'
            }`}>1</span>
            <span className="text-[11px] font-bold text-neutral-text-dark">Personal Details</span>
          </div>
          <div className="w-8 h-[2px] bg-neutral-200"></div>
          <div className="flex-1 flex items-center gap-2">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              step === 2 ? 'bg-emerald-600 text-white' : 'bg-neutral-200 text-neutral-500'
            }`}>2</span>
            <span className={`text-[11px] font-bold ${
              step === 2 ? 'text-neutral-text-dark' : 'text-neutral-text-muted'
            }`}>Organization</span>
          </div>
        </div>

        {step === 1 ? (
          /* STEP 1 FORM */
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-neutral-text-dark uppercase tracking-wider" htmlFor="first-name">
                  First Name
                </label>
                <input
                  id="first-name"
                  type="text"
                  placeholder="Arthur"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className={`w-full px-3 py-2 bg-white border ${
                    firstNameError ? 'border-red-400 focus:ring-red-100' : 'border-neutral-border focus:ring-emerald-100'
                  } rounded-xl text-sm focus:outline-none focus:ring-4 transition duration-200`}
                />
                {firstNameError && <p className="text-[10px] text-red-600 font-semibold">{firstNameError}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-neutral-text-dark uppercase tracking-wider" htmlFor="last-name">
                  Last Name
                </label>
                <input
                  id="last-name"
                  type="text"
                  placeholder="Dent"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className={`w-full px-3 py-2 bg-white border ${
                    lastNameError ? 'border-red-400 focus:ring-red-100' : 'border-neutral-border focus:ring-emerald-100'
                  } rounded-xl text-sm focus:outline-none focus:ring-4 transition duration-200`}
                />
                {lastNameError && <p className="text-[10px] text-red-600 font-semibold">{lastNameError}</p>}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-neutral-text-dark uppercase tracking-wider" htmlFor="email-signup">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-neutral-text-muted" />
                <input
                  id="email-signup"
                  type="email"
                  placeholder="dent@magrathea.com"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    if (emailError || emailWarning) validateEmail(e.target.value);
                  }}
                  onBlur={() => validateEmail(email)}
                  className={`w-full pl-9 pr-3 py-2 bg-white border ${
                    emailError ? 'border-red-400 focus:ring-red-100' : 'border-neutral-border focus:ring-emerald-100'
                  } rounded-xl text-sm focus:outline-none focus:ring-4 transition duration-200`}
                />
              </div>
              {emailError && <p className="text-[10px] text-red-600 font-semibold">{emailError}</p>}
              {emailWarning && (
                <div className="flex gap-1 bg-amber-50 border border-amber-100 rounded-lg p-2 text-[10px] text-amber-800 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>{emailWarning}</span>
                </div>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-neutral-text-dark uppercase tracking-wider" htmlFor="password-signup">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-neutral-text-muted" />
                <input
                  id="password-signup"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
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
              <label className="text-[11px] font-bold text-neutral-text-dark uppercase tracking-wider" htmlFor="confirm-password">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-neutral-text-muted" />
                <input
                  id="confirm-password"
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
              type="button"
              onClick={handleNextStep}
              className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold text-sm shadow-md transition"
            >
              Continue to Organization
              <ChevronRight className="w-4.5 h-4.5" />
            </button>
          </div>
        ) : (
          /* STEP 2 FORM */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-neutral-text-dark uppercase tracking-wider" htmlFor="org-name">
                Organization Name
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-2.5 w-4 h-4 text-neutral-text-muted" />
                <input
                  id="org-name"
                  type="text"
                  placeholder="Megrathea Industries Ltd"
                  value={orgName}
                  onChange={e => setOrgName(e.target.value)}
                  className={`w-full pl-9 pr-3 py-2 bg-white border ${
                    orgError ? 'border-red-400 focus:ring-red-100' : 'border-neutral-border focus:ring-emerald-100'
                  } rounded-xl text-sm focus:outline-none focus:ring-4 transition duration-200`}
                />
              </div>
              {orgError && <p className="text-[10px] text-red-600 font-semibold">{orgError}</p>}
            </div>

            {/* Industry */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-neutral-text-dark uppercase tracking-wider" htmlFor="industry-select">
                Industry Sector
              </label>
              <select
                id="industry-select"
                value={industry}
                onChange={e => setIndustry(e.target.value)}
                className={`w-full px-3 py-2 bg-white border ${
                  industryError ? 'border-red-400 focus:ring-red-100' : 'border-neutral-border focus:ring-emerald-100'
                } rounded-xl text-sm focus:outline-none focus:ring-4 transition duration-200`}
              >
                <option value="">-- Choose Industry Sector --</option>
                {INDUSTRIES.map(ind => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
              {industryError && <p className="text-[10px] text-red-600 font-semibold">{industryError}</p>}
            </div>

            {/* Department */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-neutral-text-dark uppercase tracking-wider" htmlFor="dept-select">
                Assigned Department
              </label>
              <select
                id="dept-select"
                value={departmentId}
                onChange={e => setDepartmentId(e.target.value)}
                className={`w-full px-3 py-2 bg-white border ${
                  deptError ? 'border-red-400 focus:ring-red-100' : 'border-neutral-border focus:ring-emerald-100'
                } rounded-xl text-sm focus:outline-none focus:ring-4 transition duration-200`}
              >
                <option value="">-- Choose Your Department --</option>
                {mockDepartments.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>
              {deptError && <p className="text-[10px] text-red-600 font-semibold">{deptError}</p>}
            </div>

            {/* Read-only info banner (enterprise-correct) */}
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-2 text-xs text-emerald-800">
              <Shield className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <div>
                <span className="font-bold">Enterprise Role Assignment</span>
                <p className="text-[11px] mt-0.5 leading-relaxed text-emerald-700">
                  You'll join as <span className="font-extrabold text-emerald-900">Employee</span>. An administrator can update your role context later inside the settings dashboard.
                </p>
              </div>
            </div>

            {/* Terms */}
            <div className="flex items-start gap-2.5">
              <input
                id="agree-terms"
                type="checkbox"
                checked={agreeTerms}
                onChange={e => setAgreeTerms(e.target.checked)}
                className="h-4 w-4 mt-0.5 text-emerald-600 focus:ring-emerald-500 border-neutral-border rounded-md transition"
              />
              <label htmlFor="agree-terms" className="text-[11px] text-neutral-text-muted font-medium leading-relaxed cursor-pointer select-none">
                I authorize registration and consent strictly to EcoSphere's <span className="text-emerald-600 hover:underline cursor-pointer">Enterprise Terms of Service</span> and <span className="text-emerald-600 hover:underline cursor-pointer">Data Compliance Policy</span>.
              </label>
            </div>

            {/* Navigation buttons */}
            <div className="grid grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="col-span-2 border border-slate-200 hover:bg-slate-50 text-slate-700 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
              
              <button
                type="submit"
                disabled={loading}
                className="col-span-3 flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-2.5 rounded-xl font-bold text-sm shadow-md transition duration-150 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4.5 h-4.5 animate-spin" />
                    Registering...
                  </>
                ) : (
                  'Complete Setup'
                )}
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <div className="text-center pt-2 border-t border-neutral-border/60">
          <p className="text-xs text-neutral-text-muted">
            Already have an active account?{' '}
            <Link to="/login" className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline transition">
              Sign in instead
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
