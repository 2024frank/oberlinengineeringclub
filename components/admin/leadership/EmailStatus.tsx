'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Mail } from 'lucide-react'
import type { OfficerEmailStatus } from '@/lib/leadership/types'
export function OfficerEmailDelivery({ rows }: { rows: OfficerEmailStatus[] }) {
  const router=useRouter()
  const [busy,setBusy]=useState(''),[message,setMessage]=useState('')
  async function retry(positionId:string) {
    setBusy(positionId);setMessage('')
    try {
      const response=await fetch('/api/admin/officer-email',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({positionId})})
      if(!response.ok)throw new Error('Could not retry emails. Please try again.')
      setMessage('Delivery queued. Refresh shortly to check the outcome.');router.refresh()
    }catch{setMessage('Could not retry emails. Please try again.')}finally{setBusy('')}
  }
  return <section className="portal-section"><div className="admin-page-heading"><h2>Position announcement emails</h2><button type="button" onClick={()=>router.refresh()}><RefreshCw size={16}/>Refresh status</button></div>
    {message&&<p role="status">{message}</p>}
    {!rows.length&&<p>No position announcements yet.</p>}
    {rows.map(row=><article className="team-list-row" key={row.positionId}><div><h3>{row.roleTitle}</h3>{row.baseline?<p>Existing opening. No announcement sent.</p>:<p>{row.sent} accepted by email provider · {row.pending+row.sending} queued or sending · {row.failed} failed · {row.skipped} skipped</p>}{row.unknown>0&&<p role="status">{row.unknown} delivery {row.unknown===1?'outcome needs':'outcomes need'} checking in Resend before another email is sent.</p>}</div>{(row.failed>0||row.pending>0)&&<button type="button" disabled={Boolean(busy)} onClick={()=>void retry(row.positionId)}><Mail size={16}/>{busy===row.positionId?'Queuing...':row.failed?'Retry failed emails':'Send queued emails'}</button>}</article>)}
  </section>
}
