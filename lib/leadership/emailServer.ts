import 'server-only'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { deliverOfficerEmails } from './emailDelivery'
export async function sendQueuedOfficerEmails() {
  const s = createSupabaseAdminClient()
  return deliverOfficerEmails({ rpc: (name, params) => s.rpc(name, params) })
}
