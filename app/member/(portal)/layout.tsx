import { requireActiveMember } from '@/lib/auth/memberSession'
import { getUnreadNotificationCount } from '@/lib/members/dashboard'
import { MemberShell } from '@/components/member/MemberShell'
export default async function MemberPortalLayout({children}:{children:React.ReactNode}){const member=await requireActiveMember();const unread=await getUnreadNotificationCount(member.userId).catch(()=>0);return <MemberShell member={{displayName:member.displayName,email:member.email}} unreadNotifications={unread}>{children}</MemberShell>}
