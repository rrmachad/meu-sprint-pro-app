import { createClient } from 'npm:@supabase/supabase-js@2'
import { render } from 'npm:@react-email/components@0.0.22'
import { RevisionReminderEmail } from '../_shared/transactional-templates/revision-reminder.tsx'

const SENDER_DOMAIN = 'notify.meusprint.pro'

Deno.serve(async (_req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: 'Missing env vars' }), { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const now = new Date()
  const currentHourUTC = now.getUTCHours()
  const today = now.toISOString().split('T')[0]

  // Get all pending revisions for today grouped by user
  const { data: pendingRevisions, error: revError } = await supabase
    .from('revisions')
    .select('user_id, discipline_id, disciplines(name)')
    .eq('due_date', today)
    .eq('completed', false)

  if (revError) {
    console.error('Failed to fetch pending revisions', revError)
    return new Response(JSON.stringify({ error: revError.message }), { status: 500 })
  }

  if (!pendingRevisions?.length) {
    return new Response(JSON.stringify({ processed: 0, reason: 'no_pending_revisions' }))
  }

  // Group by user_id
  const byUser = new Map<string, { disciplines: string[] }>()
  for (const rev of pendingRevisions) {
    const existing = byUser.get(rev.user_id) || { disciplines: [] }
    const discName = (rev as any).disciplines?.name
    if (discName && !existing.disciplines.includes(discName)) {
      existing.disciplines.push(discName)
    }
    byUser.set(rev.user_id, existing)
  }

  let enqueued = 0

  for (const [userId, info] of byUser) {
    // Get user email and settings
    const { data: userData } = await supabase.auth.admin.getUserById(userId)
    if (!userData?.user?.email) continue

    const { data: settings } = await supabase
      .from('user_settings')
      .select('candidate_name, notifications_enabled')
      .eq('user_id', userId)
      .maybeSingle()

    // Skip users who disabled notifications
    if (settings && settings.notifications_enabled === false) continue

    // Check suppression list
    const { data: suppressed } = await supabase
      .from('suppressed_emails')
      .select('id')
      .eq('email', userData.user.email)
      .maybeSingle()

    if (suppressed) continue

    const pendingCount = pendingRevisions.filter(r => r.user_id === userId).length
    const userName = settings?.candidate_name || 'Concurseiro'

    const html = render(RevisionReminderEmail({
      userName,
      pendingCount,
      disciplines: info.disciplines,
    }))

    const messageId = crypto.randomUUID()

    const { error: enqueueError } = await supabase.rpc('enqueue_email', {
      queue_name: 'transactional_emails',
      payload: {
        message_id: messageId,
        to: userData.user.email,
        from: `Meu Sprint Pro <noreply@${SENDER_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject: `🔔 Você tem ${pendingCount} revisão(ões) pendente(s) para hoje`,
        html,
        purpose: 'transactional',
        label: 'revision-reminder',
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
