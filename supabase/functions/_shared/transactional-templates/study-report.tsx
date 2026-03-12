/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Html, Head, Body, Container, Section, Text, Button, Hr, Row, Column,
} from 'npm:@react-email/components@0.0.22'

interface StudyReportProps {
  userName?: string
  siteUrl?: string
  periodLabel?: string
  totalHours?: string
  totalQuestions?: number
  totalPages?: number
  topDisciplines?: Array<{ name: string; hours: string }>
  streak?: number
}

export function StudyReportEmail({
  userName = 'Concurseiro',
  siteUrl = 'https://eliteconcurseiro.lovable.app',
  periodLabel = 'esta semana',
  totalHours = '0h',
  totalQuestions = 0,
  totalPages = 0,
  topDisciplines = [],
  streak = 0,
}: StudyReportProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Text style={logo}>🎯 Elite Concurseiro</Text>
          <Text style={heading}>Relatório de Estudo</Text>
          <Text style={paragraph}>
            Olá, {userName}! Aqui está seu resumo de {periodLabel}:
          </Text>

          <Section style={statsGrid}>
            <Row>
              <Column style={statBox}>
                <Text style={statValue}>{totalHours}</Text>
                <Text style={statLabel}>Horas estudadas</Text>
              </Column>
              <Column style={statBox}>
                <Text style={statValue}>{totalQuestions}</Text>
                <Text style={statLabel}>Questões</Text>
              </Column>
            </Row>
            <Row>
              <Column style={statBox}>
                <Text style={statValue}>{totalPages}</Text>
                <Text style={statLabel}>Páginas lidas</Text>
              </Column>
              <Column style={statBox}>
                <Text style={statValue}>🔥 {streak}</Text>
                <Text style={statLabel}>Dias seguidos</Text>
              </Column>
            </Row>
          </Section>

          {topDisciplines.length > 0 && (
            <Section>
              <Text style={{ ...paragraph, fontWeight: '600' as const, color: '#1a1a2e' }}>
                Top matérias:
              </Text>
              {topDisciplines.map((d, i) => (
                <Text key={i} style={disciplineItem}>
                  {d.name}: {d.hours}
                </Text>
              ))}
            </Section>
          )}

          <Button style={button} href={`${siteUrl}/indicadores`}>
            Ver indicadores completos
          </Button>
          <Hr style={hr} />
          <Text style={footer}>
            Elite Concurseiro — Continue firme, sua aprovação está próxima!
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
const statsGrid = { margin: '16px 0' }
const statBox = { textAlign: 'center' as const, padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '8px' }
const statValue = { fontSize: '22px', fontWeight: '700' as const, color: '#0fa968', margin: '0' }
const statLabel = { fontSize: '12px', color: '#55575d', margin: '4px 0 0' }
const disciplineItem = { fontSize: '14px', color: '#55575d', marginBottom: '4px', paddingLeft: '8px' }
const button = { backgroundColor: '#0fa968', color: '#ffffff', borderRadius: '12px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', textAlign: 'center' as const, display: 'block', padding: '12px 24px', marginTop: '24px' }
const hr = { borderColor: '#e5e7eb', margin: '32px 0 16px' }
const footer = { fontSize: '12px', color: '#9ca3af', textAlign: 'center' as const }
