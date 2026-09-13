import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { MemberLoginPanel } from '@/components/member/MemberLoginPanel'
const {replace,signIn}=vi.hoisted(()=>({replace:vi.fn(),signIn:vi.fn().mockResolvedValue({error:null})}))
vi.mock('next/navigation',()=>({useRouter:()=>({replace,refresh:vi.fn()})}))
vi.mock('@/lib/supabase/browser',()=>({createSupabaseBrowserClient:()=>({auth:{signInWithPassword:signIn}})}))
afterEach(()=>{cleanup();vi.clearAllMocks();vi.unstubAllGlobals()})
const next='/member/leadership?position=00000000-0000-4000-8000-000000000020'
it('returns a password sign-in to the selected position',async()=>{
  const user=userEvent.setup();render(<MemberLoginPanel next={next}/>)
  await user.type(screen.getByLabelText('Oberlin email'),'test@oberlin.edu');await user.type(screen.getByLabelText('Password'),'test-password')
  await user.click(within(screen.getByLabelText('Password').closest('form')!).getByRole('button',{name:'Sign in'}))
  expect(replace).toHaveBeenCalledWith(next)
})
it('carries the selected position into the magic-link request',async()=>{
  const send=vi.fn().mockResolvedValue({ok:true,json:async()=>({ok:true})});vi.stubGlobal('fetch',send)
  const user=userEvent.setup();render(<MemberLoginPanel next={next}/>)
  await user.click(screen.getByRole('button',{name:'Sign in with an email link'}));await user.type(screen.getByLabelText('Oberlin email'),'test@oberlin.edu')
  await user.click(screen.getByRole('button',{name:'Send sign-in link'}))
  expect(JSON.parse(send.mock.calls[0][1].body)).toMatchObject({next})
})
