// Email Service for SocialConnect
// Handles verification emails and OTP codes for password reset

import nodemailer from 'nodemailer';
import { randomBytes } from 'crypto';

export interface EmailConfig {
  service: string;
  user: string;
  password: string;
  from: string;
}

export interface OTPData {
  code: string;
  email: string;
  type: 'verification' | 'password_reset';
  expiresAt: Date;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private otpStore: Map<string, OTPData> = new Map(); // In production, use Redis or database

  constructor() {
    this.initialize();
  }

  private initialize() {
    const emailConfig = {
      service: process.env.EMAIL_SERVICE || 'gmail', // gmail, outlook, etc.
      user: process.env.EMAIL_USER || '', // Your email address
      password: process.env.EMAIL_PASSWORD || '', // Your email app password
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER || ''
    };

    if (!emailConfig.user || !emailConfig.password) {
      console.log('Email service not configured - set EMAIL_USER and EMAIL_PASSWORD environment variables');
      return;
    }

    this.transporter = nodemailer.createTransport({
      service: emailConfig.service,
      auth: {
        user: emailConfig.user,
        pass: emailConfig.password
      }
    });

    console.log('Email service initialized');
  }

  // Generate 6-digit OTP code
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send verification email after signup
  async sendVerificationEmail(email: string, username: string): Promise<boolean> {
    try {
      if (!this.transporter) {
        console.log('Email service not configured');
        return false;
      }

      const otp = this.generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store OTP
      this.otpStore.set(`verification_${email}`, {
        code: otp,
        email,
        type: 'verification',
        expiresAt
      });

      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject: 'Welcome to SocialConnect - Verify Your Email',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Email Verification</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
                  <h1 style="color: #2c3e50; margin-bottom: 30px;">Welcome to SocialConnect!</h1>
                  
                  <p style="font-size: 16px; margin-bottom: 20px;">Hi ${username},</p>
                  <p style="font-size: 16px; margin-bottom: 30px;">Thank you for signing up! Please verify your email address with the code below:</p>
                  
                  <div style="background-color: #3498db; color: white; padding: 20px; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 30px 0;">
                      ${otp}
                  </div>
                  
                  <p style="font-size: 14px; color: #7f8c8d; margin-top: 30px;">This code will expire in 10 minutes.</p>
                  <p style="font-size: 14px; color: #7f8c8d;">If you didn't create this account, please ignore this email.</p>
              </div>
          </body>
          </html>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Verification email sent to ${email} with OTP: ${otp}`);
      return true;
    } catch (error) {
      console.error('Error sending verification email:', error);
      return false;
    }
  }

  // Send 6-digit OTP for password reset
  async sendPasswordResetOTP(email: string): Promise<boolean> {
    try {
      if (!this.transporter) {
        console.log('Email service not configured');
        return false;
      }

      const otp = this.generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store OTP
      this.otpStore.set(`password_reset_${email}`, {
        code: otp,
        email,
        type: 'password_reset',
        expiresAt
      });

      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject: 'SocialConnect - Password Reset Code',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Password Reset</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
                  <h1 style="color: #e74c3c; margin-bottom: 30px;">Password Reset Request</h1>
                  
                  <p style="font-size: 16px; margin-bottom: 30px;">You requested a password reset. Use the code below to reset your password:</p>
                  
                  <div style="background-color: #e74c3c; color: white; padding: 20px; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 30px 0;">
                      ${otp}
                  </div>
                  
                  <p style="font-size: 14px; color: #7f8c8d; margin-top: 30px;">This code will expire in 10 minutes.</p>
                  <p style="font-size: 14px; color: #7f8c8d;">If you didn't request this, please ignore this email and your password will remain unchanged.</p>
              </div>
          </body>
          </html>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Password reset email sent to ${email} with OTP: ${otp}`);
      return true;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return false;
    }
  }

  // Verify OTP code
  async verifyOTP(email: string, code: string, type: 'verification' | 'password_reset'): Promise<boolean> {
    try {
      const key = `${type}_${email}`;
      const otpData = this.otpStore.get(key);

      if (!otpData) {
        console.log(`OTP not found for ${email} (${type})`);
        return false;
      }

      // Check if expired
      if (new Date() > otpData.expiresAt) {
        this.otpStore.delete(key);
        console.log(`OTP expired for ${email} (${type})`);
        return false;
      }

      // Check if code matches
      if (otpData.code !== code.toString()) {
        console.log(`Invalid OTP for ${email} (${type})`);
        return false;
      }

      // OTP is valid, remove from store
      this.otpStore.delete(key);
      console.log(`OTP verified successfully for ${email} (${type})`);
      return true;
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return false;
    }
  }

  // Resend OTP code
  async resendOTP(email: string, type: 'verification' | 'password_reset', username?: string): Promise<boolean> {
    if (type === 'verification' && username) {
      return await this.sendVerificationEmail(email, username);
    } else if (type === 'password_reset') {
      return await this.sendPasswordResetOTP(email);
    }
    return false;
  }

  // Clean up expired OTPs (call this periodically)
  cleanupExpiredOTPs(): void {
    const now = new Date();
    const entriesToDelete: string[] = [];
    this.otpStore.forEach((otpData, key) => {
      if (now > otpData.expiresAt) {
        entriesToDelete.push(key);
      }
    });
    entriesToDelete.forEach(key => this.otpStore.delete(key));
  }

  // Health check
  async testEmailConnection(): Promise<boolean> {
    try {
      if (!this.transporter) {
        return false;
      }
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email service connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
const emailService = new EmailService();

// Clean up expired OTPs every 5 minutes
setInterval(() => {
  emailService.cleanupExpiredOTPs();
}, 5 * 60 * 1000);

export default emailService;