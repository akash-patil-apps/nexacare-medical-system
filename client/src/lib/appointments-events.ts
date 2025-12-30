export type AppointmentEvent = {
  type: "appointment.changed";
  action: string;
  appointmentId: number;
  status: string | null;
  hospitalId: number | null;
  doctorId: number | null;
  patientId: number | null;
  doctorUserId: number | null;
  patientUserId: number | null;
  occurredAt: string;
};

type Handlers = {
  onEvent: (evt: AppointmentEvent) => void;
  onError?: (err: unknown) => void;
};

/**
 * Subscribe to server-sent appointment change events (SSE).
 * Uses query-param token because EventSource cannot set Authorization headers.
 */
export function subscribeToAppointmentEvents(handlers: Handlers) {
  const token = localStorage.getItem("auth-token");
  if (!token) return () => {};

  let closed = false;
  let es: EventSource | null = null;
  let retryTimer: number | null = null;
  let retryCount = 0;
  const MAX_RETRIES = 5;
  const MAX_RETRY_DELAY = 30000; // 30 seconds max delay

  const connect = () => {
    if (closed) return;
    
    // Stop retrying after max attempts to avoid spam
    if (retryCount >= MAX_RETRIES) {
      console.warn('⚠️ SSE: Max retry attempts reached. Stopping connection attempts.');
      return;
    }

    const url = `/api/events/appointments?token=${encodeURIComponent(token)}`;
    
    try {
      es = new EventSource(url);

      es.onopen = () => {
        // Reset retry count on successful connection
        retryCount = 0;
        console.log('✅ SSE: Connected to appointment events');
      };

      es.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data || "{}");
          if (data?.type === "appointment.changed") {
            handlers.onEvent(data as AppointmentEvent);
          } else if (data?.type === "connected") {
            console.log('✅ SSE: Server confirmed connection');
          }
        } catch (e) {
          // ignore bad messages
        }
      };

      es.onerror = (e) => {
        // Only log errors if we haven't exceeded max retries
        if (retryCount < MAX_RETRIES) {
          console.warn(`⚠️ SSE: Connection error (attempt ${retryCount + 1}/${MAX_RETRIES}). Will retry...`);
        }
        
        handlers.onError?.(e);
        
        try {
          es?.close();
        } catch {}
        es = null;
        
        if (closed) return;
        
        // Exponential backoff with max delay
        retryCount++;
        const delay = Math.min(1500 * Math.pow(2, retryCount - 1), MAX_RETRY_DELAY);
        
        retryTimer = window.setTimeout(() => {
          connect();
        }, delay);
      };
    } catch (error) {
      console.error('❌ SSE: Failed to create EventSource:', error);
      if (!closed && retryCount < MAX_RETRIES) {
        retryCount++;
        const delay = Math.min(1500 * Math.pow(2, retryCount - 1), MAX_RETRY_DELAY);
        retryTimer = window.setTimeout(() => {
          connect();
        }, delay);
      }
    }
  };

  connect();

  return () => {
    closed = true;
    if (retryTimer) window.clearTimeout(retryTimer);
    try {
      es?.close();
    } catch {}
  };
}


