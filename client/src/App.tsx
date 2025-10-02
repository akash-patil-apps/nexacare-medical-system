import React from 'react';
import { Router, Route, Switch, Redirect } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './hooks/use-auth';
import { MedicalThemeProvider } from './antd.config.tsx';
import { App as AntApp } from 'antd';

// Import pages
import Login from './pages/auth/login';
import Register from './pages/auth/register';
import OtpVerification from './pages/auth/otp-verification';
import PatientDashboard from './pages/dashboards/patient-dashboard';
import PatientAppointments from './pages/dashboards/patient-appointments';
import BookAppointment from './pages/book-appointment';
import DoctorDashboard from './pages/dashboards/doctor-dashboard';
import DoctorAppointments from './pages/dashboards/doctor-appointments';
import HospitalDashboard from './pages/dashboards/hospital-dashboard';
import LabDashboard from './pages/dashboards/lab-dashboard';
import ReceptionistDashboard from './pages/dashboards/receptionist-dashboard';
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
    case 'ADMIN':
      return <Redirect to="/dashboard/hospital" />; // Admin can access hospital dashboard
    default:
      return <Redirect to="/dashboard/patient" />;
  }
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
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
                  <Route path="/otp-verification" component={OtpVerification} />
                  
                  {/* Dashboard Routes */}
                  <Route path="/dashboard" component={DashboardRedirect} />
                  <Route path="/dashboard/patient" component={PatientDashboard} />
                  <Route path="/dashboard/patient/appointments" component={PatientAppointments} />
                  <Route path="/dashboard/doctor" component={DoctorDashboard} />
                  <Route path="/dashboard/doctor/appointments" component={DoctorAppointments} />
                  <Route path="/dashboard/hospital" component={HospitalDashboard} />
                  <Route path="/dashboard/lab" component={LabDashboard} />
                  <Route path="/dashboard/receptionist" component={ReceptionistDashboard} />
                  
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
    </QueryClientProvider>
  );
}

export default App;