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
        return apiRequest('GET', '/api/onboarding/patient/status');
      }
      // Add other roles as needed
      return { isCompleted: true };
    },
    enabled: shouldCheck && !!userRole,
  });

  useEffect(() => {
    // Check if user is logged in and on dashboard
    const token = localStorage.getItem('authToken');
    const currentPath = window.location.pathname;
    
    if (token && currentPath === '/dashboard' && userRole) {
      setShouldCheck(true);
    }
  }, [userRole]);

  useEffect(() => {
    if (onboardingStatus && !isLoading) {
      if (!onboardingStatus.isCompleted) {
        // Redirect to appropriate onboarding based on role
        if (userRole === 'patient') {
          setLocation('/onboarding/patient');
        } else if (userRole === 'doctor') {
          setLocation('/onboarding/doctor');
        } else if (userRole === 'hospital') {
          setLocation('/onboarding/hospital');
        }
        // Add other roles as needed
      }
    }
  }, [onboardingStatus, isLoading, userRole, setLocation]);

  return {
    onboardingStatus,
    isLoading,
    isCompleted: onboardingStatus?.isCompleted ?? true,
  };
}
