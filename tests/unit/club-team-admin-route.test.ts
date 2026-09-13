// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest'
const { admin, perform }=vi.hoisted(()=>({admin:vi.fn(),perform:vi.fn()}))
vi.mock('@/lib/auth/session',()=>({getCurrentAdmin:admin}))
vi.mock('@/lib/teams/server',()=>({performTeamAction:perform}))
import { POST } from '@/app/api/admin/teams/route'
const teamId='00000000-0000-4000-8000-000000000001'
const projectId='00000000-0000-4000-8000-000000000020'
const request=(body:unknown)=>new Request('https://example.com/api/admin/teams',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)})
afterEach(()=>vi.clearAllMocks())
it.each([null,{role:'EDITOR'}])('blocks unauthorized officer accounts',async account=>{
  admin.mockResolvedValue(account)
  expect((await POST(request({action:'review-project',teamId,projectId,decision:'APPROVE'}))).status).toBe(403)
  expect(perform).not.toHaveBeenCalled()
})
it('accepts an admin project review but rejects unrelated actions',async()=>{
  admin.mockResolvedValue({role:'ADMIN'})
  perform.mockResolvedValue({teamId,status:'APPROVED'})
  expect((await POST(request({action:'review-project',teamId,projectId,decision:'APPROVE'}))).status).toBe(200)
  expect((await POST(request({action:'create',name:'Test team'}))).status).toBe(400)
  expect(perform).toHaveBeenCalledTimes(1)
})
