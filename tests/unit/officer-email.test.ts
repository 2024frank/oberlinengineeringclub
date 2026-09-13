// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest'
import { deliverOfficerEmails } from '@/lib/leadership/emailDelivery'
const job={id:'mail-1',claimToken:'claim-1',recipient:'test@oberlin.edu',displayName:'Test',positionId:'role-1',roleTitle:'Secretary',term:'Fall',bio:'Keep meeting records.',closesAt:null}
afterEach(()=>{vi.unstubAllEnvs()})
function fixture(status=200) {
  vi.stubEnv('RESEND_API_KEY','test');vi.stubEnv('RESEND_FROM_EMAIL','OEC <test@example.com>')
  let claimed=false
  const rpc=vi.fn(async(name:string)=>name==='claim_officer_email'?{data:claimed?[]:(claimed=true,[job]),error:null}:{data:true,error:null})
  const send=vi.fn<typeof fetch>(async()=>new Response('{}',{status}))
  return {rpc,send,wait:vi.fn(async()=>{})}
}
it('uses a stable provider key and records only successful acceptance as sent',async()=>{
  const deps=fixture();expect(await deliverOfficerEmails(deps)).toEqual({processed:1,configured:true})
  expect(deps.send.mock.calls[0]?.[1]).toMatchObject({headers:expect.objectContaining({'Idempotency-Key':'officer-opening/mail-1'})})
  expect(deps.rpc).toHaveBeenCalledWith('finish_officer_email',expect.objectContaining({p_id:'mail-1',p_claim_token:'claim-1',p_status:'SENT'}))
})
it.each([[429,'FAILED'],[500,'UNCERTAIN'],[409,'UNCERTAIN']])('handles HTTP %s without claiming inbox delivery',async(status,outcome)=>{
  const deps=fixture(Number(status));await deliverOfficerEmails(deps)
  expect(deps.rpc).toHaveBeenCalledWith('finish_officer_email',expect.objectContaining({p_status:outcome}))
})
it('leaves timeouts uncertain so they cannot later cause an unsafe resend',async()=>{
  const deps=fixture();deps.send.mockRejectedValue(new Error('timeout'));await deliverOfficerEmails(deps)
  expect(deps.rpc).toHaveBeenCalledWith('finish_officer_email',expect.objectContaining({p_status:'UNCERTAIN'}))
})
it('does not claim mail when configuration is missing',async()=>{
  const deps=fixture();vi.stubEnv('RESEND_API_KEY','');expect(await deliverOfficerEmails(deps)).toEqual({processed:0,configured:false})
  expect(deps.rpc).not.toHaveBeenCalled();expect(deps.send).not.toHaveBeenCalled()
})
it('stops on failed outcome tracking instead of continuing to send',async()=>{
  const deps=fixture();deps.rpc.mockImplementation(async name=>name==='claim_officer_email'?{data:[job],error:null}:{data:null,error:{message:'database unavailable'}} as never)
  await expect(deliverOfficerEmails(deps)).rejects.toThrow('EMAIL_TRACKING_FAILED')
  expect(deps.send).toHaveBeenCalledTimes(1)
})
