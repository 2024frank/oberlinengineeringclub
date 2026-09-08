import type { PageSection } from '@/lib/page-builder/types'

export const homeIntroduction = 'We bring Oberlin students together to work on engineering projects. Browse the proposals, find people to work with, or suggest an idea of your own.'

// Retire exact starter copy without replacing later edits made in the officer portal.
const replacements: Record<string, string> = {
  'A student engineering club at Oberlin for projects, workshops, technical opportunities, and students exploring the 3-2 pathway.': homeIntroduction,
  'Build things. Learn together.': 'Student engineering projects at Oberlin College.',
  'Build something with us.': 'Projects',
  'Help run the club.': 'Help with the club',
  'These roles are open now. They are how the club actually gets built this year.': 'Interested in organizing events or helping with projects? Choose an option in the form above and tell us what you would like to do.',
  'OEC projects give students a chance to work on engineering problems outside class. That can mean hardware, software, CAD, electronics, robotics, or testing.': 'These projects are open to OEC members. Read a proposal to see what is involved, then express interest through your membership account.',
  'A club for students who build things.': 'About the club',
  'Members come from physics, computer science, chemistry, mathematics, environmental studies, and other departments.': 'We are an Oberlin student club focused on hands-on engineering projects. Membership is open to all majors and experience levels.',
  'Oberlin’s 3-2 program combines three years of liberal arts study at Oberlin with two years at a partner engineering school. Students interested in engineering are also spread across physics, computer science, chemistry, mathematics, environmental studies, and other departments. OEC gives those students a place to meet, build projects, share resources, and learn from each other.': 'Students interested in engineering are spread across departments at Oberlin. We started OEC so they can find one another and work on projects outside class. You can join whether you are considering the 3-2 program or simply want to try a project.',
  'Engineering at Oberlin works differently.': 'Why we started OEC',
  'Engineering disciplines': 'Areas of interest',
  'Engineering brings different fields together.': 'Areas of interest',
  'How the club runs.': 'How we work',
  'The founding group is writing things down so the next set of officers does not start over.': 'We are starting with project proposals from members. At our first interest meeting, we will discuss the ideas and start forming teams.',
  'Build together': 'Project teams',
  'A project needs a lead, tools, a budget, and a safety plan before it starts.': 'Each team agrees on what it wants to build, the equipment it needs, and who will take on each part.',
  'Document the work': 'Project updates',
  'Teams leave behind project updates, decisions, and public demos.': 'Members use their accounts to share progress, ask for help, and keep a record of their work.',
  'Open the doors': 'Who can join',
  'Students from every major and experience level can participate.': 'Any Oberlin student can join. You do not need previous engineering experience or plans to enter the 3-2 program.',
  'Stay accurate': 'Getting started',
  'A proposal is labelled a proposal until the work is confirmed.': 'Set up your member profile and list your skills. Then propose an idea or express interest in a project you would like to join.',
  'Help get the club started.': 'Join the club',
  'Join a project, propose one, volunteer, or help lead a recurring part of the club.': 'Request a membership account to propose projects, find teammates, and share what you are working on.',
  'Meetings, build nights, and talks.': 'Events',
  'Our first events are being planned for Fall 2026. Expect project meetups, technical workshops, alumni conversations, and engineering career events.': 'Come to the first interest meeting to meet other students, discuss project ideas, and find a team. Confirmed events are listed below.',
  'Opportunities worth knowing about': 'Opportunities',
  'Internships, research, and funding.': 'Opportunities',
  'Find engineering internships, research positions, fellowships, campus programs, and other opportunities worth knowing about.': 'Internships, research positions, and funding shared by the club. Check each listing for requirements and deadlines.',
  'We are gathering engineering internships, research positions, fellowships, and funding worth knowing about. Join OEC and we will share them as they land.': 'There are no current listings. We will add opportunities here as members share them.',
}

export function publicCopy(text: string) {
  return replacements[text] ?? text
}

export function refreshSectionCopy(section: PageSection): PageSection {
  const next = { ...section }
  if ('headline' in next) next.headline = publicCopy(next.headline)
  if ('heading' in next) next.heading = publicCopy(next.heading)
  if ('body' in next) next.body = publicCopy(next.body)
  if (next.type === 'features_grid') next.items = next.items.map(item => ({ ...item, title: publicCopy(item.title), body: publicCopy(item.body) }))
  return next
}

export function refreshSeedEvent<T extends Record<string, unknown>>(event: T): T {
  if (event.slug !== 'founding-meetup') return event
  const changes: Record<string, string> = {}
  if (event.title === 'Founding Meetup') changes.title = 'First interest meeting'
  if (event.summary === 'Meet other interested students, review the first-year plan, and choose which projects and events deserve attention first.') {
    changes.summary = 'Meet the club, discuss project ideas, and find people to work with.'
  }
  if (event.description === 'The date, time, and room are being scheduled. Pizza and accessibility details will be confirmed with the final announcement.') {
    changes.description = "We will introduce the club, discuss the proposed projects, and start forming teams. Before the meeting, please set up your membership account and add your skills to your profile. Propose a project or express interest in one you would like to join."
  }
  return { ...event, ...changes }
}
