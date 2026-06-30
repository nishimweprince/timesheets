import * as React from 'react';
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface PasswordResetEmailProps {
  resetUrl: string;
}

export function PasswordResetEmail({ resetUrl }: PasswordResetEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your Tuza Health password</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>Tuza Health</Text>
          </Section>

          <Section style={card}>
            <Heading style={heading}>Reset your password</Heading>
            <Text style={paragraph}>
              We received a request to reset the password for your Tuza Health account. Click the
              button below to choose a new password.
            </Text>

            <Section style={buttonWrapper}>
              <Button style={button} href={resetUrl}>
                Reset password
              </Button>
            </Section>

            <Text style={expiry}>This link expires in 15 minutes.</Text>

            <Hr style={divider} />

            <Text style={footer}>
              If you didn't request a password reset, you can safely ignore this email — your
              password will remain unchanged.
            </Text>
          </Section>

          <Text style={meta}>© {new Date().getFullYear()} Tuza Health · All rights reserved</Text>
        </Container>
      </Body>
    </Html>
  );
}

export default PasswordResetEmail;

const body: React.CSSProperties = {
  backgroundColor: '#f4f4f5',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  margin: 0,
  padding: '40px 0',
};

const container: React.CSSProperties = {
  maxWidth: '520px',
  margin: '0 auto',
};

const header: React.CSSProperties = {
  padding: '0 0 20px 0',
};

const brand: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: '600',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: '#3b82f6',
  margin: 0,
};

const card: React.CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #e4e4e7',
  borderRadius: '4px',
  padding: '40px',
};

const heading: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: '600',
  color: '#09090b',
  margin: '0 0 12px 0',
};

const paragraph: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: '1.6',
  color: '#52525b',
  margin: '0 0 28px 0',
};

const buttonWrapper: React.CSSProperties = {
  margin: '0 0 28px 0',
};

const button: React.CSSProperties = {
  backgroundColor: '#3b82f6',
  borderRadius: '2px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '14px',
  fontWeight: '500',
  padding: '10px 24px',
  textDecoration: 'none',
};

const expiry: React.CSSProperties = {
  fontSize: '12px',
  color: '#71717a',
  margin: '0 0 24px 0',
};

const divider: React.CSSProperties = {
  borderColor: '#e4e4e7',
  margin: '0 0 24px 0',
};

const footer: React.CSSProperties = {
  fontSize: '12px',
  lineHeight: '1.6',
  color: '#71717a',
  margin: 0,
};

const meta: React.CSSProperties = {
  fontSize: '11px',
  color: '#a1a1aa',
  textAlign: 'center',
  margin: '20px 0 0 0',
};
