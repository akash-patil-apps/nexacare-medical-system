/**
 * Figma-style booking flow: opens as a modal (no navigation).
 * Uses the same full flow as the book-appointment page: For Whom → Hospital → Doctor → Date & Time → Confirm & Pay → Success.
 */
import React, { useEffect } from 'react';
import { Modal } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import BookAppointment from '../../pages/book-appointment';
import { useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';

export interface BookAppointmentModalProps {
  open: boolean;
  onCancel: () => void;
  /** Called after successful booking (modal will close). Omit to use default: close + invalidate + success message. */
  onSuccess?: () => void;
}

export default function BookAppointmentModal({ open, onCancel, onSuccess }: BookAppointmentModalProps) {
  const queryClient = useQueryClient();

  // Prevent background from scrolling when modal is open (stops "scroll outside" from moving modal content)
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  const handleSuccess = () => {
    if (onSuccess) {
      onSuccess();
    } else {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments/my'] });
      queryClient.invalidateQueries({ queryKey: ['patient-appointments'] });
      message.success('Appointment booked successfully!');
    }
    onCancel();
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarOutlined style={{ fontSize: 22, color: '#1A8FE3' }} />
          <span>Book New Appointment</span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      footer={null}
      width={920}
      destroyOnClose
      getContainer={document.body}
      maskClosable={false}
      centered
      styles={{
        wrapper: { overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' },
        body: { maxHeight: '85vh', overflowY: 'auto', paddingTop: 8 },
      }}
    >
      <BookAppointment
        embeddedInModal
        onSuccess={handleSuccess}
        onCancel={onCancel}
      />
    </Modal>
  );
}
