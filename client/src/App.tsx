import React, { useEffect } from 'react';
import { Router, Route, Switch, Redirect, useLocation } from 'wouter';
import { enableNotificationSoundsOnFirstInteraction } from './lib/notification-sounds';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './hooks/use-auth';
import { MedicalThemeProvider } from './antd.config.tsx';
import { App as AntApp } from 'antd';

// Import pages
import Login from './pages/auth/login';
import Register from './pages/auth/register';
import RegisterWithRole from './pages/auth/register-with-role';
import OtpVerification from './pages/auth/otp-verification';
import ForgotPassword from './pages/auth/forgot-password';
import PatientDashboard from './pages/dashboards/patient-dashboard';
import PatientAppointments from './pages/dashboards/patient-appointments';
import PatientPrescriptions from './pages/dashboards/patient-prescriptions';
import PatientLabReports from './pages/dashboards/patient-lab-reports';
import PatientDocuments from './pages/dashboards/patient-documents';
import PatientHistory from './pages/dashboards/patient-history';
import BookAppointment from './pages/book-appointment';
import DoctorDashboard from './pages/dashboards/doctor-dashboard';
import DoctorAppointments from './pages/dashboards/doctor-appointments';
import HospitalDashboard from './pages/dashboards/hospital-dashboard';
import StaffManagement from './pages/dashboards/staff-management';
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
import PaymentCheckout from './pages/payment/checkout';
import PaymentSuccess from './pages/payment/success';
import PaymentFailure from './pages/payment/failure';
import ContactDirectory from './pages/contact-directory';
import MessagesPage from './pages/messages';
import ProfilePage from './pages/profile';
import ReceptionistAppointmentsPage from './pages/receptionist-appointments';
import { getMessagesPathForRole } from './lib/messages-route';
import NotFound from './pages/not-found';

function RedirectToRoleMessages() {
  const { user } = useAuth();
  const path = getMessagesPathForRole(user?.role);
  return <Redirect to={path} />;
}

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

// Wrapper component that conditionally applies medical-container class
function AppWrapper({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  // Resume AudioContext on first user interaction so notification sounds can play (browser autoplay policy)
  useEffect(() => {
    enableNotificationSoundsOnFirstInteraction();
  }, []);

  // Routes that should NOT have medical-container wrapper
  const noContainerRoutes = [
    '/',
    '/login',
    '/register',
    '/register/with-role',
    '/otp-verification',
    '/onboarding/patient',
    '/onboarding/hospital',
    '/onboarding/nurse',
    '/onboarding/pharmacist',
    '/onboarding/radiology-technician',
    '/onboarding/doctor',
    '/onboarding/receptionist',
    '/onboarding/lab',
    '/payment/checkout',
    '/payment/success',
    '/payment/failure',
    '/messages',
    '/admin',
    '/patient',
    '/receptionist',
    '/doctor',
    '/nurse',
    '/pharmacist',
    '/lab',
    '/radiology-technician',
  ];
  
  // Check if current location matches any no-container route (exact match or starts with)
  const isNoContainerRoute = noContainerRoutes.some(route => {
    if (route === '/') {
      return location === '/' || location === '';
    }
    return location === route || location.startsWith(route + '/');
  });
  
  if (!isNoContainerRoute) {
    return <div className="medical-container">{children}</div>;
  }
  
  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MedicalThemeProvider>
        <AntApp>
          <AuthProvider>
            <Router>
              <AppWrapper>
                <Switch>
                  {/* Auth Routes */}
                  <Route path="/" component={Login} />
                  <Route path="/login" component={Login} />
                  <Route path="/register" component={Register} />
                  <Route path="/register/with-role" component={RegisterWithRole} />
                  <Route path="/otp-verification" component={OtpVerification} />
                  <Route path="/forgot-password" component={ForgotPassword} />
                  
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
                  <Route path="/dashboard/patient/reports" component={PatientLabReports} />
                  <Route path="/dashboard/patient/documents" component={PatientDocuments} />
                  <Route path="/dashboard/patient/history" component={PatientHistory} />
                  <Route path="/dashboard/doctor" component={DoctorDashboard} />
                  <Route path="/dashboard/doctor/appointments" component={DoctorAppointments} />
                  <Route path="/dashboard/hospital" component={HospitalDashboard} />
                  <Route path="/dashboard/hospital/revenue" component={RevenueDetails} />
                  <Route path="/dashboard/hospital/staff" component={StaffManagement} />
                  <Route path="/dashboard/lab" component={LabDashboard} />
                  <Route path="/dashboard/receptionist" component={ReceptionistDashboard} />
                  <Route path="/dashboard/nurse" component={NurseDashboard} />
                  <Route path="/dashboard/pharmacist" component={PharmacistDashboard} />
                  <Route path="/dashboard/radiology-technician" component={RadiologyTechnicianDashboard} />
                  <Route path="/dashboard/receptionist" component={ReceptionistDashboard} />
                  <Route path="/dashboard/receptionist/contact-directory" component={ContactDirectory} />
                  <Route path="/receptionist/appointments" component={ReceptionistAppointmentsPage} />
                  {/* Role-based messages routes */}
                  <Route path="/patient/messages" component={MessagesPage} />
                  <Route path="/receptionist/messages" component={MessagesPage} />
                  <Route path="/admin/messages" component={MessagesPage} />
                  <Route path="/doctor/messages" component={MessagesPage} />
                  <Route path="/nurse/messages" component={MessagesPage} />
                  <Route path="/pharmacist/messages" component={MessagesPage} />
                  <Route path="/lab/messages" component={MessagesPage} />
                  <Route path="/radiology-technician/messages" component={MessagesPage} />
                  <Route path="/messages" component={RedirectToRoleMessages} />
                  <Route path="/dashboard/profile" component={ProfilePage} />
                  
                  {/* Appointment Booking */}
                  <Route path="/book-appointment" component={BookAppointment} />
                  <Route path="/appointments" component={PatientAppointments} />
                  
                  {/* Payment Routes */}
                  <Route path="/payment/checkout" component={PaymentCheckout} />
                  <Route path="/payment/success" component={PaymentSuccess} />
                  <Route path="/payment/failure" component={PaymentFailure} />
                  
                  {/* Catch all route */}
                  <Route component={NotFound} />
                </Switch>
              </AppWrapper>
            </Router>
          </AuthProvider>
        </AntApp>
      </MedicalThemeProvider>
    </QueryClientProvider>
  );
}

export default App;