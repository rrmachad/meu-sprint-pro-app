import { supabase } from '@/integrations/supabase/client';

type TemplateName = 'welcome' | 'study-report' | 'revision-reminder' | 'signup-confirmation';

interface StudyReportData {
  userName?: string;
  periodLabel?: string;
  totalHours?: string;
  totalQuestions?: number;
  totalPages?: number;
  topDisciplines?: Array<{ name: string; hours: string }>;
  streak?: number;
}

interface RevisionReminderData {
  userName?: string;
  pendingCount?: number;
  disciplines?: string[];
}

interface WelcomeData {
  userName?: string;
}

interface SignupConfirmationData {
  userName?: string;
}

type TemplateData = StudyReportData | RevisionReminderData | WelcomeData | SignupConfirmationData;

export async function sendTransactionalEmail(
  template: TemplateName,
  data: TemplateData = {},
  to?: string
) {
  const { data: result, error } = await supabase.functions.invoke('send-transactional-email', {
    body: { template, data, to },
  });

  if (error) throw error;
  return result;
}
