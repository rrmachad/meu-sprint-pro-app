import { createClient } from 'npm:@supabase/supabase-js@2'
import { render } from 'npm:@react-email/components@0.0.22'
import { StudyReportEmail } from '../_shared/transactional-templates/study-report.tsx'

const SENDER_DOMAIN = 'notify.meusprint.pro'

function formatHours(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return m > 0 ? `${h}h${m}min` : `${h}h`
}

Deno.serve(async (_req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: 'Missing env vars' }), { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Last 7 days range
  const now = new Date()
  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const startDate = weekAgo.toISOString().split('T')[0]
  const endDate = new Date(now.getTime() - 86400000).toISOString().split('T')[0] // yesterday

  // Get all study records from last week
  const { data: records, error: recError } = await supabase
    .from('study_records')
    .select('user_id, duration_seconds, correct_answers, wrong_answers, blank_answers, pages_read, discipline_id, disciplines(name)')
    .gte('date', startDate)
    .lte('date', endDate)

  if (recError) {
    console.error('Failed to fetch study records', recError)
    return new Response(JSON.stringify({ error: recError.message }), { status: 500 })
  }

  if (!records?.length) {
    return new Response(JSON.stringify({ processed: 0, reason: 'no_records' }))
  }

  // Group by user
  const byUser = new Map<string, typeof records>()
  for (const rec of records) {
    const existing = byUser.get(rec.user_id) || []
    existing.push(rec)
    byUser.set(rec.user_id, existing)
  }

  let enqueued = 0

  for (const [userId, userRecords] of byUser) {
    const { data: userData } = await supabase.auth.admin.getUserById(userId)
    if (!userData?.user?.email) continue

    const { data: settings } = await supabase
      .from('user_settings')
      .select('candidate_name, notifications_enabled, streak')
      .eq('user_id', userId)
      .maybeSingle()

    if (settings && settings.notifications_enabled === false) continue

    const { data: suppressed } = await supabase
      .from('suppressed_emails')
      .select('id')
      .eq('email', userData.user.email)
      .maybeSingle()

    if (suppressed) continue

    // Compute stats
    const totalSeconds = userRecords.reduce((s, r) => s + (r.duration_seconds || 0), 0)
    const totalQuestions = userRecords.reduce((s, r) => s + (r.correct_answers || 0) + (r.wrong_answers || 0) + (r.blank_answers || 0), 0)
    const totalPages = userRecords.reduce((s, r) => s + (r.pages_read || 0), 0)

    // Top disciplines by hours
    const discMap = new Map<string, number>()
    for (const r of userRecords) {
      const name = (r as any).disciplines?.name || 'Sem matéria'
      discMap.set(name, (discMap.get(name) || 0) + (r.duration_seconds || 0))
    }
    const topDisciplines = [...discMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, secs]) => ({ name, hours: formatHours(secs) }))

    const userName = settings?.candidate_name || 'Concurseiro'
    const streak = settings?.streak || 0

    const html = render(StudyReportEmail({
      userName,
      periodLabel: 'esta semana',
      totalHours: formatHours(totalSeconds),
      totalQuestions,
      totalPages,
      topDisciplines,
      streak,
    }))

    const messageId = crypto.randomUUID()

    const { error: enqueueError } = await supabase.rpc('enqueue_email', {
      queue_name: 'transactional_emails',
      payload: {
        message_id: messageId,
        to: userData.user.email,
        from: `Meu Sprint Pro <noreply@${SENDER_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject: `📊 Seu relatório semanal de estudo`,
        html,
        purpose: 'transactional',
        label: 'weekly-study-report',
        queued_at: new Date().toISOString(),
      },
    })

    if (enqueueError) {
      console.error(`Failed to enqueue for user ${userId}`, enqueueError)
    } else {
      enqueued++
    }
  }

  return new Response(
    JSON.stringify({ processed: enqueued, total_users: byUser.size }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
