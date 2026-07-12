import React, { useEffect, useRef } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/auth';
import { useToast } from './ui-kit/Toast';

export default function AuthGuard() {
  const { isLoggedIn } = useAuth();
  const location = useLocation();
  const { toast } = useToast();
  const toastShownRef = useRef(false);

  useEffect(() => {
    if (!isLoggedIn && !toastShownRef.current) {
      toastShownRef.current = true;
      toast('Please sign in', 'warning', 'You need to be authenticated to access this page.');
    }
  }, [isLoggedIn, toast]);

  if (!isLoggedIn) {
    const returnTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />;
  }

  return <Outlet />;
}
