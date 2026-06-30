import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import * as React from 'react';
import { PasswordResetEmail } from './templates/PasswordResetEmail';

@Injectable()
export class MailService {
  private readonly resend: Resend;
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {
    this.resend = new Resend(this.config.get<string>('RESEND_API_KEY'));
  }

  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    const html = await render(React.createElement(PasswordResetEmail, { resetUrl }));

    const { error } = await this.resend.emails.send({
      from: this.config.getOrThrow<string>('FROM_EMAIL'),
      to,
      subject: 'Reset your Tuza Health password',
      html,
    });

    if (error) {
      this.logger.error(`Failed to send password reset email to ${to}: ${JSON.stringify(error)}`);
      throw new Error('Failed to send password reset email');
    }
  }
}
