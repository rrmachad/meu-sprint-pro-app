/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Html, Head, Body, Container, Text, Button, Hr,
} from 'npm:@react-email/components@0.0.22'

interface SignupConfirmationProps {
  userName?: string
  siteUrl?: string
}

export function SignupConfirmationEmail({
  userName = 'Concurseiro',
  siteUrl = 'https://eliteconcurseiro.lovable.app',
}: SignupConfirmationProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Text style={logo}>🎯 Elite Concurseiro</Text>
          <Text style={heading}>Cadastro Confirmado! ✅</Text>
          <Text style={paragraph}>
            Olá, {userName}! Seu cadastro no Elite Concurseiro foi realizado com sucesso.
          </Text>
          <Text style={paragraph}>
            Agora você tem acesso completo a todas as funcionalidades da plataforma:
          </Text>
          <Text style={featureItem}>✅ Ciclos de estudo personalizados</Text>
          <Text style={featureItem}>✅ Cronômetro de sessões</Text>
          <Text style={featureItem}>✅ Revisão espaçada inteligente</Text>
          <Text style={featureItem}>✅ Simulados com análise detalhada</Text>
          <Text style={featureItem}>✅ Indicadores de desempenho</Text>

          <Text style={{ ...paragraph, marginTop: '16px' }}>
            Comece configurando suas matérias e metas de estudo para aproveitar ao máximo a plataforma.
          </Text>

          <Button style={button} href={siteUrl}>
            Acessar minha conta
          </Button>
          <Hr style={hr} />
          <Text style={footer}>
            Elite Concurseiro — Rumo à sua aprovação
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { margin: '0 auto', padding: '40px 20px', maxWidth: '560px' }
const logo = { fontSize: '24px', fontWeight: '700' as const, color: '#0fa968', textAlign: 'center' as const, marginBottom: '24px' }
const heading = { fontSize: '22px', fontWeight: '600' as const, color: '#1a1a2e', marginBottom: '16px' }
const paragraph = { fontSize: '15px', lineHeight: '1.6', color: '#55575d', marginBottom: '12px' }
const featureItem = { fontSize: '14px', color: '#55575d', marginBottom: '6px' }
const button = { backgroundColor: '#0fa968', color: '#ffffff', borderRadius: '12px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', textAlign: 'center' as const, display: 'block', padding: '12px 24px', marginTop: '24px' }
const hr = { borderColor: '#e5e7eb', margin: '32px 0 16px' }
const footer = { fontSize: '12px', color: '#9ca3af', textAlign: 'center' as const }
