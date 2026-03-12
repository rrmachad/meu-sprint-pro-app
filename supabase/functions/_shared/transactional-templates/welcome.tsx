/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Html, Head, Body, Container, Section, Text, Button, Hr, Img,
} from 'npm:@react-email/components@0.0.22'

interface WelcomeEmailProps {
  userName?: string
  siteUrl?: string
}

export function WelcomeEmail({ userName = 'Concurseiro', siteUrl = 'https://eliteconcurseiro.lovable.app' }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Text style={logo}>🎯 Elite Concurseiro</Text>
          <Text style={heading}>Bem-vindo(a), {userName}!</Text>
          <Text style={paragraph}>
            Estamos felizes em ter você conosco! Sua jornada rumo à aprovação começa agora.
          </Text>
          <Text style={paragraph}>
            Com o Elite Concurseiro você pode:
          </Text>
          <Section style={featureList}>
            <Text style={featureItem}>📚 Organizar seus ciclos de estudo</Text>
            <Text style={featureItem}>⏱️ Cronometrar suas sessões</Text>
            <Text style={featureItem}>📊 Acompanhar seu desempenho</Text>
            <Text style={featureItem}>🔄 Gerenciar suas revisões</Text>
          </Section>
          <Button style={button} href={siteUrl}>
            Começar a estudar
          </Button>
          <Hr style={hr} />
          <Text style={footer}>
            Elite Concurseiro — Sua plataforma de estudos para concursos
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Inter', Arial, sans-serif",
}
const container = {
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '560px',
}
const logo = {
  fontSize: '24px',
  fontWeight: '700' as const,
  color: '#0fa968',
  textAlign: 'center' as const,
  marginBottom: '24px',
}
const heading = {
  fontSize: '22px',
  fontWeight: '600' as const,
  color: '#1a1a2e',
  marginBottom: '16px',
}
const paragraph = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#55575d',
  marginBottom: '12px',
}
const featureList = {
  padding: '12px 0',
}
const featureItem = {
  fontSize: '14px',
  color: '#55575d',
  marginBottom: '8px',
}
const button = {
  backgroundColor: '#0fa968',
  color: '#ffffff',
  borderRadius: '12px',
  fontSize: '15px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 24px',
  marginTop: '24px',
}
const hr = {
  borderColor: '#e5e7eb',
  margin: '32px 0 16px',
}
const footer = {
  fontSize: '12px',
  color: '#9ca3af',
  textAlign: 'center' as const,
}
