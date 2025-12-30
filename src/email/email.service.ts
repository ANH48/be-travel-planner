import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EmailService {
  private transporter: Transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor() {
    this.createTransporter();
  }

  private createTransporter() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Verify connection configuration
    this.transporter.verify((error) => {
      if (error) {
        this.logger.error('Email service connection error:', error);
      } else {
        this.logger.log('Email service is ready to send messages ');
      }
    });
  }

  private loadTemplate(templateName: string): string {
    const templatePath = path.join(
      __dirname,
      'templates',
      `${templateName}.html`,
    );

    return fs.readFileSync(templatePath, 'utf-8');
  }

  async sendVerificationEmail(email: string, code: string): Promise<void> {
    try {
      const template = this.loadTemplate('verification');
      const html = template.replace('{{CODE}}', code);

      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'Verify Your Email - Travel Expense Planner',
        html,
      });

      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}:`, error);
      throw new Error('Failed to send verification email');
    }
  }

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    try {
      const template = this.loadTemplate('welcome');
      const html = template.replace('{{NAME}}', name);

      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'Welcome to Travel Expense Planner!',
        html,
      });

      this.logger.log(`Welcome email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${email}:`, error);
      // Don't throw error for welcome email failure
    }
  }

  async sendPasswordResetEmail(email: string, code: string): Promise<void> {
    try {
      const template = this.loadTemplate('password-reset');
      const html = template.replace('{{CODE}}', code);

      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'Reset Your Password - Travel Expense Planner',
        html,
      });

      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}:`, error);
      throw new Error('Failed to send password reset email');
    }
  }
}
