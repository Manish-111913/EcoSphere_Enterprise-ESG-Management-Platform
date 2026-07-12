import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function Forbidden() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center font-sans antialiased">
      <div className="w-16 h-16 bg-semantic-danger/10 text-semantic-danger rounded-full flex items-center justify-center mb-6 shadow-sm border border-semantic-danger/20">
        <ShieldAlert className="h-8 w-8" />
      </div>
      <span className="text-[10px] bg-red-100 text-red-800 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider mb-2">
        Error Code: 403
      </span>
      <h1 className="text-2xl font-black text-neutral-text-dark tracking-tight mb-2">
        Access Privilege Denied
      </h1>
      <p className="text-xs text-neutral-text-muted max-w-md mb-6 leading-relaxed">
        Your current session role does not have the administrative privileges required to view this module. Use the Role Switcher in the topbar to test other views.
      </p>
      <button
        onClick={() => navigate('/dashboard')}
        className="inline-flex items-center gap-2 bg-primary-teal hover:bg-primary-teal-hover text-white text-xs font-bold px-4 py-2 rounded-button shadow-sm hover:shadow-md transition-all cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </button>
    </div>
  );
}
