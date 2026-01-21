import React from 'react';
import { Router, Route, Switch, Redirect } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './hooks/use-auth';
import { MedicalThemeProvider } from './antd.config.tsx';
import { ThemeProvider } from './contexts/ThemeContext';
import { App as AntApp } from 'antd';

// Import pages
import Login from './pages/auth/login';
import Register from './pages/auth/register';
import RegisterWithRole from './pages/auth/register-with-role';
import OtpVerification from './pages/auth/otp-verification';
import PatientDashboard from './pages/dashboards/patient-dashboard';
import PatientAppointments from './pages/dashboards/patient-appointments';
import PatientPrescriptions from './pages/dashboards/patient-prescriptions';
import BookAppointment from './pages/book-appointment';
import DoctorDashboard from './pages/dashboards/doctor-dashboard';
import DoctorAppointments from './pages/dashboards/doctor-appointments';
import HospitalDashboard from './pages/dashboards/hospital-dashboard';
import LabDashboard from './pages/dashboards/lab-dashboard';
import ReceptionistDashboard from './pages/dashboards/receptionist-dashboard';
import NurseDashboard from './pages/dashboards/nurse-dashboard';
import PharmacistDashboard from './pages/dashboards/pharmacist-dashboard';
import RadiologyTechnicianDashboard from './pages/dashboards/radiology-technician-dashboard';
import PatientOnboarding from './pages/onboarding/patient-onboarding';
import HospitalOnboarding from './pages/onboarding/hospital-onboarding';
import NurseOnboarding from './pages/onboarding/nurse-onboarding';
import PharmacistOnboarding from './pages/onboarding/pharmacist-onboarding';
import RadiologyTechnicianOnboarding from './pages/onboarding/radiology-technician-onboarding';
import DoctorOnboarding from './pages/onboarding/doctor-onboarding';
import ReceptionistOnboarding from './pages/onboarding/receptionist-onboarding';
import LabOnboarding from './pages/onboarding/lab-onboarding';
import RevenueDetails from './pages/revenue/revenue-details';
import NotFound from './pages/not-found';

// Create a client
const queryClient = new QueryClient();

// Dashboard redirect component
function DashboardRedirect() {
  const { user, isLoading } = useAuth();
  
  // Show loading while checking authentication
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (!user) {
    return <Redirect to="/login" />;
  }
  
  // Redirect based on user role
  switch (user.role) {
    case 'PATIENT':
      return <Redirect to="/dashboard/patient" />;
    case 'DOCTOR':
      return <Redirect to="/dashboard/doctor" />;
    case 'HOSPITAL':
      return <Redirect to="/dashboard/hospital" />;
    case 'LAB':
      return <Redirect to="/dashboard/lab" />;
    case 'RECEPTIONIST':
      return <Redirect to="/dashboard/receptionist" />;
    case 'NURSE':
      return <Redirect to="/dashboard/nurse" />;
    case 'PHARMACIST':
      return <Redirect to="/dashboard/pharmacist" />;
    case 'RADIOLOGY_TECHNICIAN':
      return <Redirect to="/dashboard/radiology-technician" />;
    case 'ADMIN':
      return <Redirect to="/dashboard/hospital" />; // Admin can access hospital dashboard
    default:
      return <Redirect to="/dashboard/patient" />;
  }
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <MedicalThemeProvider>
          <AntApp>
            <AuthProvider>
            <Router>
              <div className="medical-container">
                <Switch>
                  {/* Auth Routes */}
                  <Route path="/" component={Login} />
                  <Route path="/login" component={Login} />
                  <Route path="/register" component={Register} />
                  <Route path="/register/with-role" component={RegisterWithRole} />
                  <Route path="/otp-verification" component={OtpVerification} />
                  
                  {/* Onboarding Routes */}
                  <Route path="/onboarding/patient" component={PatientOnboarding} />
                  <Route path="/onboarding/hospital" component={HospitalOnboarding} />
                  <Route path="/onboarding/nurse" component={NurseOnboarding} />
                  <Route path="/onboarding/pharmacist" component={PharmacistOnboarding} />
                  <Route path="/onboarding/radiology-technician" component={RadiologyTechnicianOnboarding} />
                  <Route path="/onboarding/doctor" component={DoctorOnboarding} />
                  <Route path="/onboarding/receptionist" component={ReceptionistOnboarding} />
                  <Route path="/onboarding/lab" component={LabOnboarding} />
                  
                  {/* Dashboard Routes */}
                  <Route path="/dashboard" component={DashboardRedirect} />
                  <Route path="/dashboard/patient" component={PatientDashboard} />
                  <Route path="/dashboard/patient/appointments" component={PatientAppointments} />
                  <Route path="/dashboard/patient/prescriptions" component={PatientPrescriptions} />
                  <Route path="/dashboard/doctor" component={DoctorDashboard} />
                  <Route path="/dashboard/doctor/appointments" component={DoctorAppointments} />
                  <Route path="/dashboard/hospital" component={HospitalDashboard} />
                  <Route path="/dashboard/hospital/revenue" component={RevenueDetails} />
                  <Route path="/dashboard/lab" component={LabDashboard} />
                  <Route path="/dashboard/receptionist" component={ReceptionistDashboard} />
                  <Route path="/dashboard/nurse" component={NurseDashboard} />
                  <Route path="/dashboard/pharmacist" component={PharmacistDashboard} />
                  <Route path="/dashboard/radiology-technician" component={RadiologyTechnicianDashboard} />
                  
                  {/* Appointment Booking */}
                  <Route path="/book-appointment" component={BookAppointment} />
                  <Route path="/appointments" component={PatientAppointments} />
                  
                  {/* Catch all route */}
                  <Route component={NotFound} />
                </Switch>
              </div>
            </Router>
          </AuthProvider>
        </AntApp>
      </MedicalThemeProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;