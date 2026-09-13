import { beforeEach, expect, it, vi } from 'vitest'
import { officerMemberActionSchema, officerReviewSchema, officerError, officerLoginNext } from '@/lib/leadership/input'
import { officerOpeningEmail } from '@/lib/leadership/emailTemplate'

const id='00000000-0000-4000-8000-000000000020'
it('validates member actions without allowing review or identity spoofing',()=>{
  expect(officerMemberActionSchema.safeParse({action:'apply',positionId:id,statement:'I want to help run events.',experience:''}).success).toBe(true)
  expect(officerMemberActionSchema.safeParse({action:'review',positionId:id,userId:id}).success).toBe(false)
  expect(officerMemberActionSchema.safeParse({action:'apply',positionId:id,statement:'short'}).success).toBe(false)
})
it('validates review decisions and explains closed roles',()=>{
  expect(officerReviewSchema.safeParse({action:'review',positionId:id,userId:id,decision:'ADMIN'}).success).toBe(false)
  expect(officerError(new Error('POSITION_CLOSED'))).toContain('no longer accepting')
})
it('restricts login return paths to the member leadership screen',()=>{
  expect(officerLoginNext(`/member/leadership?position=${id}`)).toBe(`/member/leadership?position=${id}`)
  for(const path of ['https://evil.example','//evil.example','/\\evil.example','/admin','/member/leadership?position=<script>'])expect(officerLoginNext(path)).toBe('/member')
})
it('includes the exact role, term, responsibilities, and application link in the email',()=>{
  const mail=officerOpeningEmail({displayName:'Test',roleTitle:'Secretary',term:'Fall',bio:'Keep meeting records.',closesAt:null,positionId:id})
  expect(mail.subject).toContain('Secretary');expect(mail.text).toContain('Keep meeting records.')
  expect(mail.text).toContain('https://oberlin32engineeringsociety.com/leadership')
  expect(mail.text).not.toContain('reset')
})

const {member,admin,perform}=vi.hoisted(()=>({member:vi.fn(),admin:vi.fn(),perform:vi.fn()}))
vi.mock('@/lib/auth/memberSession',()=>({getCurrentMember:member}))
vi.mock('@/lib/auth/session',()=>({getCurrentAdmin:admin}))
vi.mock('@/lib/leadership/server',()=>({performOfficerAction:perform}))
beforeEach(()=>{vi.clearAllMocks();member.mockResolvedValue(null);admin.mockResolvedValue(null)})
it('rejects signed-out application requests',async()=>{
  const {POST}=await import('@/app/api/member/leadership/route')
  expect((await POST(new Request('https://example.test/api',{method:'POST',body:'{}'}))).status).toBe(401)
  expect(perform).not.toHaveBeenCalled()
})
it('blocks editors from reviewing and masks database errors',async()=>{
  const {POST}=await import('@/app/api/admin/officer-applications/route')
  admin.mockResolvedValue({role:'EDITOR'})
  expect((await POST(new Request('https://example.test/api',{method:'POST',body:'{}'}))).status).toBe(403)
  admin.mockResolvedValue({role:'ADMIN'});perform.mockRejectedValue(new Error('private database detail'))
  const response=await POST(new Request('https://example.test/api',{method:'POST',body:JSON.stringify({action:'review',positionId:id,userId:id,decision:'SHORTLISTED',feedback:''})}))
  expect(response.status).toBe(400);expect(JSON.stringify(await response.json())).not.toContain('private database detail')
})
