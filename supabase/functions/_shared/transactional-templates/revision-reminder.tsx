/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Html, Head, Body, Container, Section, Text, Button, Hr,
} from 'npm:@react-email/components@0.0.22'

interface RevisionReminderProps {
  userName?: string
  siteUrl?: string
  pendingCount?: number
  disciplines?: string[]
}

export function RevisionReminderEmail({
  userName = 'Concurseiro',
  siteUrl = 'https://eliteconcurseiro.lovable.app',
  pendingCount = 0,
  disciplines = [],
}: RevisionReminderProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Text style={logo}>🎯 Elite Concurseiro</Text>
          <Text style={heading}>🔔 Revisões Pendentes</Text>
          <Text style={paragraph}>
            Olá, {userName}! Você tem <strong>{pendingCount}</strong> revisão(ões) pendente(s) para hoje.
          </Text>

          {disciplines.length > 0 && (
            <Section style={listSection}>
              <Text style={{ ...paragraph, fontWeight: '600' as const, color: '#1a1a2e' }}>
                Matérias para revisar:
              </Text>
              {disciplines.map((d, i) => (
                <Text key={i} style={listItem}>📘 {d}</Text>
              ))}
            </Section>
          )}

          <Text style={paragraph}>
            A revisão espaçada é fundamental para fixar o conteúdo a longo prazo. Não deixe para depois!
          </Text>

          <Button style={button} href={`${siteUrl}/revisoes`}>
            Fazer revisões agora
          </Button>
          <Hr style={hr} />
          <Text style={footer}>
            Elite Concurseiro — Revisão é o segredo da aprovação
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
const listSection = { margin: '16px 0' }
const listItem = { fontSize: '14px', color: '#55575d', marginBottom: '6px', paddingLeft: '8px' }
const button = { backgroundColor: '#0fa968', color: '#ffffff', borderRadius: '12px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', textAlign: 'center' as const, display: 'block', padding: '12px 24px', marginTop: '24px' }
const hr = { borderColor: '#e5e7eb', margin: '32px 0 16px' }
const footer = { fontSize: '12px', color: '#9ca3af', textAlign: 'center' as const }
