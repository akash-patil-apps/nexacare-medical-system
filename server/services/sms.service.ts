// SMS service for NexaCare Medical System
// Supports Twilio integration with fallback to mock mode

export interface SMSData {
  to: string;
  message: string;
  type?: 'otp' | 'appointment' | 'prescription' | 'lab_report' | 'notification' | 'reminder';
}

interface SMSConfig {
  provider: 'twilio' | 'mock';
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioFromNumber?: string;
}

export class SMSService {
  private static instance: SMSService;
  private smsMessages: SMSData[] = [];
  private config: SMSConfig;

  constructor() {
    // Load configuration from environment variables
    this.config = {
      provider: (process.env.SMS_PROVIDER as 'twilio' | 'mock') || 'mock',
      twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
      twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
      twilioFromNumber: process.env.TWILIO_FROM_NUMBER,
    };

    // Validate Twilio config if provider is twilio
    if (this.config.provider === 'twilio') {
      if (!this.config.twilioAccountSid || !this.config.twilioAuthToken || !this.config.twilioFromNumber) {
        console.warn('⚠️  Twilio SMS provider selected but credentials missing. Falling back to mock mode.');
        this.config.provider = 'mock';
      }
    }
  }

  static getInstance(): SMSService {
    if (!SMSService.instance) {
      SMSService.instance = new SMSService();
    }
    return SMSService.instance;
  }

  // Send SMS via Twilio or mock
  async sendSMS(smsData: SMSData): Promise<{ success: boolean; smsId: string; error?: string }> {
    const smsId = `sms_${Date.now()}`;
    
    // Store SMS locally for tracking
    this.smsMessages.push({
      ...smsData,
      type: smsData.type || 'notification'
    });

    // Send via Twilio if configured
    if (this.config.provider === 'twilio') {
      try {
        return await this.sendViaTwilio(smsData, smsId);
      } catch (error: any) {
        console.error('❌ Twilio SMS error:', error);
        // Fallback to mock on error
        return this.sendViaMock(smsData, smsId);
      }
    }

    // Send via mock (console log)
    return this.sendViaMock(smsData, smsId);
  }

  // Send SMS via Twilio
  private async sendViaTwilio(smsData: SMSData, smsId: string): Promise<{ success: boolean; smsId: string; error?: string }> {
    try {
      // Dynamic import to avoid requiring twilio package if not installed
      const twilio = await import('twilio').catch(() => {
        throw new Error('Twilio package not installed. Run: npm install twilio');
      });

      const client = twilio.default(
        this.config.twilioAccountSid!,
        this.config.twilioAuthToken!
      );

      const message = await client.messages.create({
        body: smsData.message,
        from: this.config.twilioFromNumber!,
        to: smsData.to,
      });

      console.log(`\n📱 SMS Sent via Twilio:`);
      console.log(`📞 To: ${smsData.to}`);
      console.log(`💬 Message: ${smsData.message.substring(0, 50)}...`);
      console.log(`🆔 Twilio SID: ${message.sid}`);
      console.log(`🎯 Type: ${smsData.type || 'notification'}`);
      console.log(`⏰ Sent: ${new Date().toLocaleString()}\n`);

      return {
        success: true,
        smsId,
      };
    } catch (error: any) {
      console.error('❌ Twilio SMS error:', error.message);
      throw error;
    }
  }

  // Send SMS via mock (console log)
  private sendViaMock(smsData: SMSData, smsId: string): { success: boolean; smsId: string } {
    console.log(`\n📱 SMS Generated (Mock Mode):`);
    console.log(`📞 To: ${smsData.to}`);
    console.log(`💬 Message: ${smsData.message}`);
    console.log(`🎯 Type: ${smsData.type || 'notification'}`);
    console.log(`⏰ Generated: ${new Date().toLocaleString()}\n`);

    return {
      success: true,
      smsId
    };
  }

  // Send OTP SMS
  async sendOTP(mobileNumber: string, otp: string, purpose: string = 'verification') {
    const smsData: SMSData = {
      to: mobileNumber,
      message: `Your NexaCare ${purpose} OTP is: ${otp}. Valid for 5 minutes. Do not share with anyone.`,
      type: 'otp'
    };

    return this.sendSMS(smsData);
  }

  // Send appointment confirmation SMS
  async sendAppointmentConfirmation(
    mobileNumber: string,
    patientName: string,
    doctorName: string,
    appointmentDate: string,
    appointmentTime: string
  ) {
    const smsData: SMSData = {
      to: mobileNumber,
      message: `Hi ${patientName}, your appointment with Dr. ${doctorName} is confirmed for ${appointmentDate} at ${appointmentTime}. Please arrive 15 mins early. - NexaCare`,
      type: 'appointment'
    };

    return this.sendSMS(smsData);
  }

  // Send prescription notification SMS
  async sendPrescriptionNotification(
    mobileNumber: string,
    patientName: string,
    prescriptionId: string
  ) {
    const smsData: SMSData = {
      to: mobileNumber,
      message: `Hi ${patientName}, your new prescription (ID: ${prescriptionId}) is ready. Please check your NexaCare account. - NexaCare`,
      type: 'prescription'
    };

    return this.sendSMS(smsData);
  }

  // Send lab report notification SMS
  async sendLabReportNotification(
    mobileNumber: string,
    patientName: string,
    reportName: string
  ) {
    const smsData: SMSData = {
      to: mobileNumber,
      message: `Hi ${patientName}, your ${reportName} test results are ready. Please check your NexaCare account. - NexaCare`,
      type: 'lab_report'
    };

    return this.sendSMS(smsData);
  }

  // Send appointment reminder SMS
  async sendAppointmentReminder(
    mobileNumber: string,
    patientName: string,
    doctorName: string,
    appointmentDate: string,
    appointmentTime: string
  ) {
    const smsData: SMSData = {
      to: mobileNumber,
      message: `Reminder: Hi ${patientName}, you have an appointment with Dr. ${doctorName} tomorrow at ${appointmentTime}. Please arrive 15 mins early. - NexaCare`,
      type: 'reminder'
    };

    return this.sendSMS(smsData);
  }

  // Get all sent SMS messages
  getSMSMessages(): SMSData[] {
    return this.smsMessages.sort((a, b) => new Date().getTime() - new Date().getTime());
  }

  // Get SMS messages by type
  getSMSByType(type: string): SMSData[] {
    return this.smsMessages.filter(sms => sms.type === type);
  }

  // Clear all SMS messages
  clearSMSMessages(): void {
    this.smsMessages = [];
  }
}

export const smsService = SMSService.getInstance();

