// Email service for NexaCare Medical System
// Supports SendGrid/Resend integration with fallback to mock mode

export interface EmailData {
  to: string;
  subject: string;
  body: string;
  html?: string; // Optional HTML body
  type?: 'appointment' | 'prescription' | 'lab_report' | 'notification' | 'reminder';
}

interface EmailConfig {
  provider: 'sendgrid' | 'resend' | 'mock';
  sendgridApiKey?: string;
  sendgridFromEmail?: string;
  sendgridFromName?: string;
  resendApiKey?: string;
  resendFromEmail?: string;
  resendFromName?: string;
}

export class EmailService {
  private static instance: EmailService;
  private emails: EmailData[] = [];
  private config: EmailConfig;

  constructor() {
    // Load configuration from environment variables
    this.config = {
      provider: (process.env.EMAIL_PROVIDER as 'sendgrid' | 'resend' | 'mock') || 'mock',
      sendgridApiKey: process.env.SENDGRID_API_KEY,
      sendgridFromEmail: process.env.SENDGRID_FROM_EMAIL || process.env.EMAIL_FROM || 'noreply@nexacare.com',
      sendgridFromName: process.env.SENDGRID_FROM_NAME || 'NexaCare Medical System',
      resendApiKey: process.env.RESEND_API_KEY,
      resendFromEmail: process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || 'noreply@nexacare.com',
      resendFromName: process.env.RESEND_FROM_NAME || 'NexaCare Medical System',
    };

    // Validate provider config
    if (this.config.provider === 'sendgrid' && !this.config.sendgridApiKey) {
      console.warn('⚠️  SendGrid provider selected but API key missing. Falling back to mock mode.');
      this.config.provider = 'mock';
    }
    if (this.config.provider === 'resend' && !this.config.resendApiKey) {
      console.warn('⚠️  Resend provider selected but API key missing. Falling back to mock mode.');
      this.config.provider = 'mock';
    }
  }

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  // Send email via SendGrid, Resend, or mock
  async sendEmail(emailData: EmailData): Promise<{ success: boolean; emailId: string; error?: string }> {
    const emailId = `email_${Date.now()}`;
    
    // Store email locally for tracking
    this.emails.push({
      ...emailData,
      type: emailData.type || 'notification'
    });

    // Send via configured provider
    if (this.config.provider === 'sendgrid') {
      try {
        return await this.sendViaSendGrid(emailData, emailId);
      } catch (error: any) {
        console.error('❌ SendGrid email error:', error);
        // Fallback to mock on error
        return this.sendViaMock(emailData, emailId);
      }
    }

    if (this.config.provider === 'resend') {
      try {
        return await this.sendViaResend(emailData, emailId);
      } catch (error: any) {
        console.error('❌ Resend email error:', error);
        // Fallback to mock on error
        return this.sendViaMock(emailData, emailId);
      }
    }

    // Send via mock (console log)
    return this.sendViaMock(emailData, emailId);
  }

  // Send email via SendGrid
  private async sendViaSendGrid(emailData: EmailData, emailId: string): Promise<{ success: boolean; emailId: string; error?: string }> {
    try {
      // Dynamic import to avoid requiring @sendgrid/mail package if not installed
      const sgMail = await import('@sendgrid/mail').catch(() => {
        throw new Error('SendGrid package not installed. Run: npm install @sendgrid/mail');
      });

      sgMail.default.setApiKey(this.config.sendgridApiKey!);

      const msg = {
        to: emailData.to,
        from: {
          email: this.config.sendgridFromEmail!,
          name: this.config.sendgridFromName!,
        },
        subject: emailData.subject,
        text: emailData.body,
        html: emailData.html || emailData.body.replace(/\n/g, '<br>'),
      };

      await sgMail.default.send(msg);

      console.log(`\n📧 Email Sent via SendGrid:`);
      console.log(`📬 To: ${emailData.to}`);
      console.log(`📋 Subject: ${emailData.subject}`);
      console.log(`🎯 Type: ${emailData.type || 'notification'}`);
      console.log(`⏰ Sent: ${new Date().toLocaleString()}\n`);

      return {
        success: true,
        emailId,
      };
    } catch (error: any) {
      console.error('❌ SendGrid email error:', error.message);
      throw error;
    }
  }

  // Send email via Resend
  private async sendViaResend(emailData: EmailData, emailId: string): Promise<{ success: boolean; emailId: string; error?: string }> {
    try {
      // Dynamic import to avoid requiring resend package if not installed
      const { Resend } = await import('resend').catch(() => {
        throw new Error('Resend package not installed. Run: npm install resend');
      });

      const resend = new Resend(this.config.resendApiKey!);

      const { data, error } = await resend.emails.send({
        from: `${this.config.resendFromName!} <${this.config.resendFromEmail!}>`,
        to: emailData.to,
        subject: emailData.subject,
        text: emailData.body,
        html: emailData.html || emailData.body.replace(/\n/g, '<br>'),
      });

      if (error) {
        throw new Error(error.message || 'Resend API error');
      }

      console.log(`\n📧 Email Sent via Resend:`);
      console.log(`📬 To: ${emailData.to}`);
      console.log(`📋 Subject: ${emailData.subject}`);
      console.log(`🆔 Resend ID: ${data?.id}`);
      console.log(`🎯 Type: ${emailData.type || 'notification'}`);
      console.log(`⏰ Sent: ${new Date().toLocaleString()}\n`);

      return {
        success: true,
        emailId,
      };
    } catch (error: any) {
      console.error('❌ Resend email error:', error.message);
      throw error;
    }
  }

  // Send email via mock (console log)
  private sendViaMock(emailData: EmailData, emailId: string): { success: boolean; emailId: string } {
    console.log(`\n📧 Email Generated (Mock Mode):`);
    console.log(`📬 To: ${emailData.to}`);
    console.log(`📋 Subject: ${emailData.subject}`);
    console.log(`📄 Body: ${emailData.body}`);
    console.log(`🎯 Type: ${emailData.type || 'notification'}`);
    console.log(`⏰ Generated: ${new Date().toLocaleString()}\n`);

    return {
      success: true,
      emailId
    };
  }

  // Send appointment confirmation email
  async sendAppointmentConfirmation(
    patientEmail: string, 
    patientName: string, 
    doctorName: string, 
    appointmentDate: string,
    appointmentTime: string
  ) {
    const emailData: EmailData = {
      to: patientEmail,
      subject: 'Appointment Confirmed - NexaCare',
      body: `Dear ${patientName},\n\nYour appointment with Dr. ${doctorName} has been confirmed.\n\nAppointment Details:\n- Date: ${appointmentDate}\n- Time: ${appointmentTime}\n\nPlease arrive 15 minutes early for your appointment.\n\nBest regards,\nNexaCare Medical System`,
      type: 'appointment'
    };

    return this.sendEmail(emailData);
  }

  // Send prescription notification email
  async sendPrescriptionNotification(
    patientEmail: string,
    patientName: string,
    doctorName: string,
    prescriptionId: string
  ) {
    const emailData: EmailData = {
      to: patientEmail,
      subject: 'New Prescription Available - NexaCare',
      body: `Dear ${patientName},\n\nDr. ${doctorName} has created a new prescription for you.\n\nPrescription ID: ${prescriptionId}\n\nPlease log in to your NexaCare account to view and download your prescription.\n\nBest regards,\nNexaCare Medical System`,
      type: 'prescription'
    };

    return this.sendEmail(emailData);
  }

  // Send lab report notification email
  async sendLabReportNotification(
    patientEmail: string,
    patientName: string,
    reportName: string,
    reportId: string
  ) {
    const emailData: EmailData = {
      to: patientEmail,
      subject: 'Lab Report Ready - NexaCare',
      body: `Dear ${patientName},\n\nYour lab test results are now available.\n\nReport Details:\n- Test: ${reportName}\n- Report ID: ${reportId}\n\nPlease log in to your NexaCare account to view your results.\n\nBest regards,\nNexaCare Medical System`,
      type: 'lab_report'
    };

    return this.sendEmail(emailData);
  }

  // Send appointment reminder email
  async sendAppointmentReminder(
    patientEmail: string,
    patientName: string,
    doctorName: string,
    appointmentDate: string,
    appointmentTime: string
  ) {
    const emailData: EmailData = {
      to: patientEmail,
      subject: 'Appointment Reminder - NexaCare',
      body: `Dear ${patientName},\n\nThis is a reminder for your upcoming appointment.\n\nAppointment Details:\n- Doctor: Dr. ${doctorName}\n- Date: ${appointmentDate}\n- Time: ${appointmentTime}\n\nPlease arrive 15 minutes early.\n\nBest regards,\nNexaCare Medical System`,
      type: 'reminder'
    };

    return this.sendEmail(emailData);
  }

  // Get all sent emails
  getEmails(): EmailData[] {
    return this.emails.sort((a, b) => new Date().getTime() - new Date().getTime());
  }

  // Get emails by type
  getEmailsByType(type: string): EmailData[] {
    return this.emails.filter(email => email.type === type);
  }

  // Clear all emails
  clearEmails(): void {
    this.emails = [];
  }
}

export const emailService = EmailService.getInstance();

