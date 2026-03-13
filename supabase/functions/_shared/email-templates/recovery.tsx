/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Hr,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Redefinir sua senha — Meu Sprint Pro</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}>⚡ Meu Sprint Pro</Text>
        <Heading style={h1}>Redefinir sua senha</Heading>
        <Text style={text}>
          Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para escolher uma nova senha.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Redefinir Senha
        </Button>
        <Hr style={hr} />
        <Text style={footer}>
          Se você não solicitou a redefinição, pode ignorar este e-mail. Sua senha não será alterada.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { margin: '0 auto', padding: '40px 20px', maxWidth: '560px' }
const logo = { fontSize: '24px', fontWeight: '700' as const, color: '#0fa968', textAlign: 'center' as const, marginBottom: '24px' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#1a1a2e', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#55575d', lineHeight: '1.6', margin: '0 0 16px' }
const button = { backgroundColor: '#0fa968', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '12px', padding: '12px 24px', textDecoration: 'none', textAlign: 'center' as const, display: 'block' as const, marginTop: '24px' }
const hr = { borderColor: '#e5e7eb', margin: '32px 0 16px' }
const footer = { fontSize: '12px', color: '#9ca3af', textAlign: 'center' as const }
