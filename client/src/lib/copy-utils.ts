import { message } from 'antd';

/**
 * Copy text to clipboard and show success message
 */
export const copyToClipboard = async (text: string, label?: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    message.success(`${label || 'Text'} copied to clipboard`);
    return true;
  } catch (err) {
    // Fallback for older browsers
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) {
        message.success(`${label || 'Text'} copied to clipboard`);
        return true;
      }
    } catch (fallbackErr) {
      console.error('Failed to copy:', fallbackErr);
    }
    message.error('Failed to copy to clipboard');
    return false;
  }
};
