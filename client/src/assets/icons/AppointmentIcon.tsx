import React from 'react';

interface IconProps {
  className?: string;
  style?: React.CSSProperties;
  size?: number;
  color?: string;
}

export const AppointmentIcon: React.FC<IconProps> = ({ className, style, size = 18, color }) => {
  const getFilter = () => {
    if (color === '#1A8FE3' || color === '#2563eb') {
      return 'brightness(0) saturate(100%) invert(48%) sepia(79%) saturate(2476%) hue-rotate(206deg) brightness(118%) contrast(119%)';
    }
    if (color === '#8C8C8C' || color === '#595959') {
      return 'brightness(0) saturate(100%) invert(60%)';
    }
    return 'none';
  };

  return (
    <img
      src="/icons/appointment.png"
      alt="Appointments"
      width={size}
      height={size}
      className={className}
      style={{
        ...style,
        filter: getFilter(),
        objectFit: 'contain',
        display: 'block',
      }}
      onError={(e) => {
        console.warn('Appointment icon not found at /icons/appointment.png');
      }}
    />
  );
};

