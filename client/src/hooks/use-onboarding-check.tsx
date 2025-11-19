import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';

interface OnboardingStatus {
  isCompleted: boolean;
  completionPercentage: number;
  missingFields: string[];
  patient?: any;
}

export function useOnboardingCheck() {
  const [, setLocation] = useLocation();
  const [shouldCheck, setShouldCheck] = useState(false);

  // Get user role from localStorage or context
  const userRole = localStorage.getItem('userRole') || '';

  const { data: onboardingStatus, isLoading } = useQuery({
    queryKey: ['onboarding-status', userRole],
    queryFn: async () => {
      if (userRole === 'patient') {
        const res = await apiRequest('GET', '/api/onboarding/patient/status');
        return res.json();
      }
      if (userRole === 'hospital') {
        const res = await apiRequest('GET', '/api/onboarding/hospital/status');
        return res.json();
      }
      // Add other roles as needed
      return { isCompleted: true };
    },
    enabled: shouldCheck && !!userRole,
  });

  useEffect(() => {
    // Check if user is logged in and on dashboard
    const token = localStorage.getItem('auth-token');
    const currentPath = window.location.pathname;
    
    if (token && currentPath.startsWith('/dashboard') && userRole) {
      setShouldCheck(true);
    }
  }, [userRole]);

  useEffect(() => {
    if (onboardingStatus && !isLoading) {
      const currentPath = window.location.pathname;
      
      // Don't redirect if already on onboarding page
      if (currentPath.startsWith('/onboarding/')) {
        return;
      }
      
      // Don't redirect if onboarding was just completed (prevent redirect loop)
      const justCompleted = localStorage.getItem('onboarding-just-completed');
      const completedTimestamp = localStorage.getItem('onboarding-completed-timestamp');
      
      // Check if onboarding was completed recently (within last 10 minutes)
      const wasRecentlyCompleted = completedTimestamp && 
        (Date.now() - parseInt(completedTimestamp)) < 10 * 60 * 1000; // 10 minutes
      
      if (justCompleted === 'true' || wasRecentlyCompleted) {
        console.log('✅ Onboarding just completed or was recently completed, skipping redirect check');
        // Still check the status, but don't redirect
        if (onboardingStatus.isCompleted || onboardingStatus.isComplete) {
          // If status is actually complete, clear the flags
          localStorage.removeItem('onboarding-just-completed');
          localStorage.removeItem('onboarding-completed-timestamp');
        }
        return;
      }
      
      // Check both isCompleted and isComplete for compatibility
      const isCompleted = onboardingStatus.isCompleted === true || onboardingStatus.isComplete === true;
      
      if (!isCompleted) {
        console.log('⚠️ Onboarding not completed, redirecting to onboarding page');
        console.log('⚠️ Status details:', {
          isCompleted: onboardingStatus.isCompleted,
          isComplete: onboardingStatus.isComplete,
          hasProfile: onboardingStatus.hasProfile,
          profile: onboardingStatus.profile,
        });
        // Redirect to appropriate onboarding based on role
        if (userRole === 'patient') {
          setLocation('/onboarding/patient');
        } else if (userRole === 'doctor') {
          setLocation('/onboarding/doctor');
        } else if (userRole === 'hospital') {
          setLocation('/onboarding/hospital');
        }
        // Add other roles as needed
      } else {
        console.log('✅ Onboarding is completed, no redirect needed');
      }
    }
  }, [onboardingStatus, isLoading, userRole, setLocation]);

  return {
    onboardingStatus,
    isLoading,
    isCompleted: onboardingStatus?.isCompleted ?? true,
  };
}
