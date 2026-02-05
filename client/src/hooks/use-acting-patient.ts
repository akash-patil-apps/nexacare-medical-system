import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'nexacare_acting_patient_id';

export function useActingPatient() {
  const [actingPatientId, setState] = useState<number | null>(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return v ? parseInt(v, 10) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handler = () => {
      try {
        const v = localStorage.getItem(STORAGE_KEY);
        setState(v ? parseInt(v, 10) : null);
      } catch {
        setState(null);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const setActingPatientId = useCallback((id: number | null) => {
    if (id == null) {
      localStorage.removeItem(STORAGE_KEY);
      setState(null);
    } else {
      localStorage.setItem(STORAGE_KEY, String(id));
      setState(id);
    }
    window.dispatchEvent(new Event('storage'));
  }, []);

  return [actingPatientId, setActingPatientId] as const;
}

export function getActingPatientId(): number | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v ? parseInt(v, 10) : null;
  } catch {
    return null;
  }
}
