import { createClient } from '@supabase/supabase-js'
import { render } from 'npm:@react-email/components@0.0.22'
import { WelcomeEmail } from '../_shared/transactional-templates/welcome.tsx'
import { StudyReportEmail } from '../_shared/transactional-templates/study-report.tsx'
import { RevisionReminderEmail } from '../_shared/transactional-templates/revision-reminder.tsx'
import { SignupConfirmationEmail } from '../_shared/transactional-templates/signup-confirmation.tsx'
import { AdminNewSignupEmail } from '../_shared/transactional-templates/admin-new-signup.tsx'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }

    // Authenticate the caller
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token)
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = claimsData.claims.sub as string
    const userEmail = claimsData.claims.email as string

    const body = await req.json()
    const { template, data = {}, to } = body as {
      template: TemplateName
      data?: Record<string, unknown>
      to?: string
    }

    if (!template) {
      return new Response(JSON.stringify({ error: 'Missing template name' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const recipientEmail = to || userEmail
    const { subject, html } = renderTemplate(template, data)

    // Enqueue via the RPC
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey)
    const messageId = crypto.randomUUID()

    const { error: enqueueError } = await supabaseService.rpc('enqueue_email', {
      queue_name: 'transactional_emails',
      payload: {
        message_id: messageId,
        to: recipientEmail,
        from: `Elite Concurseiro <noreply@${SENDER_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject,
        html,
        purpose: 'transactional',
        label: template,
        queued_at: new Date().toISOString(),
      },
    })

    if (enqueueError) {
      console.error('Failed to enqueue email', enqueueError)
      throw new Error(`Enqueue failed: ${enqueueError.message}`)
    }

    return new Response(
      JSON.stringify({ success: true, message_id: messageId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('send-transactional-email error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
