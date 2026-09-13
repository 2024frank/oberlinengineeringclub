import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
vi.mock('next/navigation',()=>({useRouter:()=>({refresh:vi.fn(),push:vi.fn()})}))
import { TeamCreateForm, TeamInviteControl, ClubInvitations } from '@/components/member/teams/TeamForms'
import { TeamWorkspace } from '@/components/member/teams/TeamWorkspace'
import { TeamBrowser } from '@/components/member/teams/TeamBrowser'
afterEach(()=>vi.unstubAllGlobals())
it('preserves a team name after creation fails',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,json:async()=>({error:'Please try again.'})}))
  render(<TeamCreateForm/> )
  fireEvent.change(screen.getByLabelText('Team name'),{target:{value:'Water sensors'}})
  fireEvent.click(screen.getByRole('button',{name:'Create team'}))
  await screen.findByRole('alert')
  expect(screen.getByLabelText('Team name')).toHaveValue('Water sensors')
})
it('invites a member, rather than granting access immediately',async()=>{
  const fetch=vi.fn().mockResolvedValue({ok:true,json:async()=>({result:{status:'PENDING'}})})
  vi.stubGlobal('fetch',fetch)
  render(<TeamInviteControl userId="person" memberName="Mina" teams={[{id:'team',name:'Water sensors'}]}/>)
  fireEvent.click(screen.getByRole('button',{name:'Invite Mina to team'}))
  fireEvent.change(screen.getByLabelText('Team for Mina'),{target:{value:'team'}})
  fireEvent.click(screen.getByRole('button',{name:'Send invitation'}))
  await waitFor(()=>expect(fetch).toHaveBeenCalledTimes(1))
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({action:'invite',teamId:'team',userId:'person'})
  await screen.findByText('Invitation sent. They can accept it in their account.')
})
it('shows expiry instead of a success message when an invitation has expired',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({result:{status:'EXPIRED'}})}))
  render(<ClubInvitations invitations={[{teamId:'team',teamName:'Water sensors',message:'Join us',status:'PENDING',expiresAt:'2099-01-01T00:00:00Z'}]}/>)
  fireEvent.click(screen.getByRole('button',{name:'Accept invitation'}))
  await screen.findByText('This invitation expired. Ask the team lead for a new one.')
})
it('does not say the user joined when a stale invitation was already declined',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({result:{status:'DECLINED'}})}))
  render(<ClubInvitations invitations={[{teamId:'team',teamName:'Water sensors',message:'Join us',status:'PENDING',expiresAt:'2099-01-01T00:00:00Z'}]}/>)
  fireEvent.click(screen.getByRole('button',{name:'Accept invitation'}))
  await waitFor(()=>expect(screen.queryByRole('button',{name:'Accept invitation'})).not.toBeInTheDocument())
  expect(screen.queryByText('You joined the team.')).not.toBeInTheDocument()
})
it('does not offer a workspace link after project access was removed',()=>{
  render(<TeamWorkspace team={{id:'team',name:'Water sensors',description:'',recruiting:true,myRole:'MEMBER',myRequest:null,roster:[],projects:[{id:'project',title:'Sensors',status:'APPROVED',published:true,canReview:false}],proposals:[],requests:[]}}/>)
  expect(screen.queryByRole('link',{name:'Open project workspace'})).not.toBeInTheDocument()
})
it('uses singular copy for a newly created team with one member',()=>{
  render(<TeamBrowser teams={[{id:'team',name:'Water sensors',description:'',recruiting:true,myRole:'LEAD',myRequest:null,roster:[{userId:'lead',displayName:'Alex',role:'LEAD'}],projects:[],proposals:[],requests:[]}]}/>)
  expect(screen.queryByText(/1 members/)).not.toBeInTheDocument()
  expect(screen.getByText(/1 member/)).toBeInTheDocument()
})
