import { supabase } from '../lib/supabase'

export type FeedbackCategory =
  | 'bug'
  | 'feature'
  | 'enhancement'
  | 'account'
  | 'other'

const CATEGORIES = new Set<FeedbackCategory>([
  'bug',
  'feature',
  'enhancement',
  'account',
  'other',
])

export type FeedbackReportInput = {
  category: string
  email: string
  subject: string
  details: string
  appVersion: string
  screen?: string | null
  gameCode?: string | null
  userId?: string | null
  userAgent?: string | null
}

/**
 * Submit an issue / feedback report (works for anon and authenticated users).
 */
export async function submitReport({
  category,
  email,
  subject,
  details,
  appVersion,
  screen = null,
  gameCode = null,
  userId = null,
  userAgent = null,
}: FeedbackReportInput): Promise<void> {
  const trimmed = {
    category: typeof category === 'string' ? category.trim() : '',
    email: typeof email === 'string' ? email.trim() : '',
    subject: typeof subject === 'string' ? subject.trim() : '',
    details: typeof details === 'string' ? details.trim() : '',
    appVersion: typeof appVersion === 'string' ? appVersion.trim() : '',
  }

  if (!CATEGORIES.has(trimmed.category as FeedbackCategory)) {
    throw new Error('Please choose a valid category.')
  }
  if (!trimmed.email || !trimmed.email.includes('@')) {
    throw new Error('Please enter a valid email so we can follow up.')
  }
  if (!trimmed.subject) {
    throw new Error('Please enter a subject.')
  }
  if (!trimmed.details) {
    throw new Error('Please describe the issue or improvement.')
  }
  if (!trimmed.appVersion) {
    throw new Error('App version is missing. Please refresh and try again.')
  }

  const row = {
    category: trimmed.category,
    email: trimmed.email,
    subject: trimmed.subject,
    details: trimmed.details,
    app_version: trimmed.appVersion,
    screen: screen || null,
    game_code: gameCode || null,
    user_id: userId || null,
    user_agent:
      userAgent ||
      (typeof navigator !== 'undefined' ? navigator.userAgent : null),
  }

  const { error } = await supabase.from('feedback_reports').insert(row)
  if (error) {
    console.error('Feedback submit error:', error)
    throw new Error(error.message || 'Could not submit your report. Please try again.')
  }
}

export const FEEDBACK_CATEGORIES: Array<{ value: FeedbackCategory; label: string }> =
  [
    { value: 'bug', label: 'Bug / Issue' },
    { value: 'feature', label: 'Feature request' },
    { value: 'enhancement', label: 'Enhancement' },
    { value: 'account', label: 'Account / login' },
    { value: 'other', label: 'Other' },
  ]
