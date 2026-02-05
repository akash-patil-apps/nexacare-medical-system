/**
 * Role-based messages route.
 * Each dashboard has its own messages URL: /patient/messages, /receptionist/messages, /admin/messages, etc.
 */
export function getMessagesPathForRole(role: string | null | undefined): string {
  const r = (role || '').toUpperCase();
  switch (r) {
    case 'PATIENT':
      return '/patient/messages';
    case 'RECEPTIONIST':
      return '/receptionist/messages';
    case 'HOSPITAL':
    case 'ADMIN':
      return '/admin/messages';
    case 'DOCTOR':
      return '/doctor/messages';
    case 'NURSE':
      return '/nurse/messages';
    case 'PHARMACIST':
      return '/pharmacist/messages';
    case 'LAB':
      return '/lab/messages';
    case 'RADIOLOGY_TECHNICIAN':
      return '/radiology-technician/messages';
    default:
      return '/admin/messages';
  }
}
