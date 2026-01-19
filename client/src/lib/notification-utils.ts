// Utility function to inject progress bar into Ant Design notifications
export function injectNotificationProgressBar(
  notificationTitle: string,
  notificationMessage: string,
  notificationType: 'info' | 'success' | 'warning' | 'error',
  duration: number = 10
) {
  // Determine progress bar color based on notification type
  let progressBarColor = '#1890ff'; // Default blue for info
  if (notificationType === 'error') {
    progressBarColor = '#ff4d4f'; // Red
  } else if (notificationType === 'success') {
    progressBarColor = '#52c41a'; // Green
  } else if (notificationType === 'warning') {
    progressBarColor = '#faad14'; // Orange
  }

  // Inject CSS animation and notification wrapper styles if not already present
  const styleId = 'floating-notification-progress-animation';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes progressBarAnimation {
        from {
          width: 100%;
        }
        to {
          width: 0%;
        }
      }
      .ant-notification-notice {
        position: relative !important;
        overflow: hidden !important;
        min-width: 420px !important;
        max-width: 500px !important;
      }
      .ant-notification-notice-wrapper {
        min-width: 420px !important;
        max-width: 500px !important;
      }
      .notification-progress-bar {
        position: absolute !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        width: 100% !important;
        margin: 0 !important;
      }
    `;
    document.head.appendChild(style);
  }

  // After notification is rendered, inject progress bar at the bottom of notification container
  const progressBarClassName = 'notification-progress-bar';
  const injectProgressBar = () => {
    const allWrappers = Array.from(document.querySelectorAll('.ant-notification-notice-wrapper'));
    
    const targetWrapper = allWrappers.find((wrapper) => {
      const notice = wrapper.querySelector('.ant-notification-notice');
      if (!notice) return false;
      const messageEl = notice.querySelector('.ant-notification-notice-message');
      const descriptionEl = notice.querySelector('.ant-notification-notice-description');
      const messageText = messageEl?.textContent || '';
      const descriptionText = descriptionEl?.textContent || '';
      return messageText.includes(notificationTitle || '') || 
             descriptionText.includes(notificationMessage || '');
    });
    
    const noticeElement = targetWrapper?.querySelector('.ant-notification-notice') as HTMLElement;
    
    if (noticeElement && !noticeElement.querySelector(`.${progressBarClassName}`)) {
      const progressBar = document.createElement('div');
      progressBar.className = progressBarClassName;
      Object.assign(progressBar.style, {
        position: 'absolute',
        bottom: '0',
        left: '0',
        width: '100%',
        height: '10px',
        backgroundColor: progressBarColor,
        transformOrigin: 'left',
        animation: `progressBarAnimation ${duration}s linear forwards`,
        borderRadius: '0 0 4px 4px',
        zIndex: '1000',
      });
      noticeElement.appendChild(progressBar);
      return true;
    }
    return false;
  };

  // Try multiple times with increasing delays to ensure notification is rendered
  let attempts = 0;
  const maxAttempts = 5;
  const tryInject = () => {
    attempts++;
    if (!injectProgressBar() && attempts < maxAttempts) {
      setTimeout(tryInject, 50 * attempts);
    }
  };
  setTimeout(tryInject, 50);
}
