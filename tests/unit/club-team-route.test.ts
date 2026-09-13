// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest'
const { member, perform }=vi.hoisted(()=>({member:vi.fn(),perform:vi.fn()}))
vi.mock('@/lib/auth/memberSession',()=>({getCurrentMember:member}))
vi.mock('@/lib/teams/server',()=>({performTeamAction:perform}))
import { POST } from '@/app/api/member/teams/route'
const request=(body:unknown)=>new Request('https://example.com/api/member/teams',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)})
afterEach(()=>vi.clearAllMocks())
it('requires an active member before mutating teams',async()=>{
  member.mockResolvedValue(null)
  expect((await POST(request({action:'create',name:'Test team'}))).status).toBe(401)
  expect(perform).not.toHaveBeenCalled()
})
it('rejects forged ownership and invalid actions',async()=>{
  member.mockResolvedValue({userId:'member'})
  expect((await POST(request({action:'create',name:'Test team',createdBy:'someone-else'}))).status).toBe(400)
  expect((await POST(request({action:'grant-admin'}))).status).toBe(400)
  expect(perform).not.toHaveBeenCalled()
})
it('passes validated team creation and defaults without overriding session identity',async()=>{
  member.mockResolvedValue({userId:'member'})
  perform.mockResolvedValue({teamId:'new-team'})
  expect((await POST(request({action:'create',name:' Test team '}))).status).toBe(200)
  expect(perform).toHaveBeenCalledWith({action:'create',name:'Test team',description:'',recruiting:true})
})
it('does not expose database errors',async()=>{
  member.mockResolvedValue({userId:'member'})
  perform.mockRejectedValue(new Error('secret database query'))
  const response=await POST(request({action:'create',name:'Test team'}))
  expect(response.status).toBe(400)
  expect(JSON.stringify(await response.json())).not.toContain('secret')
})
