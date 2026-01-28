# Phase 2: External Integrations Setup Guide

This document explains how to configure external service integrations for SMS, Email, Payment Gateway, and File Storage.

---

## 📱 SMS Integration (Twilio)

### Setup Steps

1. **Install Twilio Package** (already in package.json):
   ```bash
   npm install
   ```

2. **Get Twilio Credentials**:
   - Sign up at [Twilio Console](https://console.twilio.com/)
   - Get your Account SID and Auth Token
   - Purchase a phone number or use a trial number

3. **Configure Environment Variables**:
   Add to your `.env` file:
   ```env
   # SMS Configuration
   SMS_PROVIDER=twilio  # or 'mock' for development
   TWILIO_ACCOUNT_SID=your_account_sid_here
   TWILIO_AUTH_TOKEN=your_auth_token_here
   TWILIO_FROM_NUMBER=+1234567890  # Your Twilio phone number
   ```

4. **Test SMS**:
   - The service will automatically use Twilio when credentials are configured
   - Falls back to mock mode if credentials are missing

### Cost
- Twilio SMS: ~₹0.50-1.00 per SMS in India
- Free trial available with $15 credit

---

## 📧 Email Integration (SendGrid or Resend)

### Option 1: SendGrid

1. **Install SendGrid Package** (already in package.json):
   ```bash
   npm install
   ```

2. **Get SendGrid API Key**:
   - Sign up at [SendGrid](https://sendgrid.com/)
   - Create an API key in Settings > API Keys
   - Verify your sender email address

3. **Configure Environment Variables**:
   ```env
   # Email Configuration (SendGrid)
   EMAIL_PROVIDER=sendgrid  # or 'resend' or 'mock'
   SENDGRID_API_KEY=your_api_key_here
   SENDGRID_FROM_EMAIL=noreply@yourdomain.com
   SENDGRID_FROM_NAME=NexaCare Medical System
   ```

### Option 2: Resend

1. **Install Resend Package** (already in package.json):
   ```bash
   npm install
   ```

2. **Get Resend API Key**:
   - Sign up at [Resend](https://resend.com/)
   - Create an API key
   - Verify your domain or use their test domain

3. **Configure Environment Variables**:
   ```env
   # Email Configuration (Resend)
   EMAIL_PROVIDER=resend  # or 'sendgrid' or 'mock'
   RESEND_API_KEY=your_api_key_here
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   RESEND_FROM_NAME=NexaCare Medical System
   ```

### Cost
- **SendGrid**: Free tier (100 emails/day), then $15/month
- **Resend**: Free tier (3,000 emails/month), then $20/month

---

## 💳 Payment Gateway Integration (Razorpay)

### Setup Steps

1. **Get Razorpay Credentials**:
   - Sign up at [Razorpay Dashboard](https://dashboard.razorpay.com/)
   - Get your Key ID and Key Secret from Settings > API Keys
   - Enable test mode for development

2. **Install Razorpay Package**:
   ```bash
   npm install razorpay
   ```

3. **Configure Environment Variables**:
   ```env
   # Payment Gateway Configuration
   PAYMENT_GATEWAY=razorpay  # or 'mock'
   RAZORPAY_KEY_ID=your_key_id_here
   RAZORPAY_KEY_SECRET=your_key_secret_here
   RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
   ```

### Cost
- Razorpay: 2% transaction fee (standard)
- Setup: Free

---

## 📁 File Storage Integration (AWS S3 or Cloudinary)

### Option 1: AWS S3

1. **Install AWS SDK**:
   ```bash
   npm install @aws-sdk/client-s3
   ```

2. **Get AWS Credentials**:
   - Create an AWS account
   - Create an S3 bucket
   - Create an IAM user with S3 access
   - Get Access Key ID and Secret Access Key

3. **Configure Environment Variables**:
   ```env
   # File Storage Configuration (AWS S3)
   STORAGE_PROVIDER=s3  # or 'cloudinary' or 'local'
   AWS_ACCESS_KEY_ID=your_access_key_here
   AWS_SECRET_ACCESS_KEY=your_secret_key_here
   AWS_REGION=ap-south-1
   AWS_S3_BUCKET=your-bucket-name
   ```

### Option 2: Cloudinary

1. **Install Cloudinary Package**:
   ```bash
   npm install cloudinary
   ```

2. **Get Cloudinary Credentials**:
   - Sign up at [Cloudinary](https://cloudinary.com/)
   - Get your Cloud Name, API Key, and API Secret from Dashboard

3. **Configure Environment Variables**:
   ```env
   # File Storage Configuration (Cloudinary)
   STORAGE_PROVIDER=cloudinary  # or 's3' or 'local'
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

### Cost
- **AWS S3**: ~$0.023/GB storage + $0.09/GB transfer
- **Cloudinary**: Free tier (25GB), then $99/month

---

## 🔧 Development Mode

For development and testing, you can use mock mode for all services:

```env
# Use mock mode for all services
SMS_PROVIDER=mock
EMAIL_PROVIDER=mock
PAYMENT_GATEWAY=mock
STORAGE_PROVIDER=local
```

In mock mode:
- SMS: Logs to console instead of sending
- Email: Logs to console instead of sending
- Payment: Simulates payment without actual gateway
- Storage: Stores files locally (base64 in database)

---

## ✅ Verification

After configuration, verify your integrations:

1. **SMS**: Check Twilio dashboard for sent messages
2. **Email**: Check SendGrid/Resend dashboard for sent emails
3. **Payment**: Test with Razorpay test mode
4. **Storage**: Upload a test file and verify it's stored

---

## 📝 Notes

- All services gracefully fall back to mock mode if credentials are missing
- Environment variables are loaded from `.env` file
- Never commit `.env` file to version control
- Use test mode/credentials for development
- Switch to production credentials only in production environment

---

**Last Updated**: January 27, 2026
