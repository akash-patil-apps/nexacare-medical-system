import React from 'react';

interface IconProps {
  className?: string;
  style?: React.CSSProperties;
  size?: number;
  color?: string;
}

export const DashboardIcon: React.FC<IconProps> = ({ className, style, size = 18, color }) => {
  // Get filter based on color
  const getFilter = () => {
    if (color === '#1A8FE3' || color === '#2563eb') {
      // Blue color filter
      return 'brightness(0) saturate(100%) invert(48%) sepia(79%) saturate(2476%) hue-rotate(206deg) brightness(118%) contrast(119%)';
    }
    if (color === '#8C8C8C' || color === '#595959') {
      // Gray color filter
      return 'brightness(0) saturate(100%) invert(60%)';
    }
    return 'none';
  };

  return (
    <img
      src="/icons/dashboard.png"
      alt="Dashboard"
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
        console.warn('Dashboard icon not found at /icons/dashboard.png');
      }}
    />
  );
};

