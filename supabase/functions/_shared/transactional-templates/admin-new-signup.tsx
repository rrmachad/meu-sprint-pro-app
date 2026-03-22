/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Html, Head, Body, Container, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'

interface AdminNewSignupProps {
  userName?: string
  userEmail?: string
  signupDate?: string
  provider?: string
}

export function AdminNewSignupEmail({
  userName = 'Novo usuário',
  userEmail = '',
  signupDate = new Date().toLocaleDateString('pt-BR'),
  provider = 'email',
}: AdminNewSignupProps) {
  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Text style={h1}>🎉 Novo cadastro no Meu Sprint PRO</Text>
          <Hr style={hr} />
          <Section style={infoBox}>
            <Text style={label}>Nome</Text>
            <Text style={value}>{userName}</Text>
            <Text style={label}>E-mail</Text>
            <Text style={value}>{userEmail}</Text>
            <Text style={label}>Data do cadastro</Text>
            <Text style={value}>{signupDate}</Text>
            <Text style={label}>Método</Text>
            <Text style={value}>{provider === 'google' ? 'Google OAuth' : 'E-mail/Senha'}</Text>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>
            Acesse o painel admin para ver todos os detalhes.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 24px', maxWidth: '480px', margin: '0 auto' }
const h1 = { fontSize: '20px', fontWeight: '700' as const, color: '#0a0a0a', margin: '0 0 16px' }
const hr = { borderColor: '#e5e7eb', margin: '16px 0' }
const infoBox = { backgroundColor: '#f9fafb', borderRadius: '8px', padding: '16px' }
const label = { fontSize: '11px', fontWeight: '600' as const, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.05em', margin: '8px 0 2px' }
const value = { fontSize: '14px', color: '#111827', margin: '0 0 8px' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '16px 0 0' }
