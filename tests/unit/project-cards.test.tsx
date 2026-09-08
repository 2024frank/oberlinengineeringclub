import { render,screen,cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach,describe,it,expect } from 'vitest'
import { ProjectCards } from '@/components/public/ProjectCards'
import { projectCards } from '@/lib/content/projectCards'
afterEach(cleanup)
const projects=[
  {id:'1',slug:'printer',title:'Printer repair',summary:'Install a new controller',status:'open_for_interest',disciplines:['electrical'],image:{url:'/printer.jpg',alt:'Printer'}},
  {id:'2',slug:'recycling',title:'Bottle recycling',summary:'Make filament',status:'proposed',disciplines:['environmental']}
]
describe('Project discovery',()=>{
  it('carries published project difficulty through to its discovery card',()=>{
    render(<ProjectCards projects={projectCards([{...projects[0],difficulty:'Beginner'}])}/> )
    expect(screen.getByRole('link')).toHaveTextContent('Beginner')
  })
  it('combines search and discipline and lets visitors recover from an empty result',async()=>{
    const user=userEvent.setup()
    render(<ProjectCards projects={projects} searchable/>)
    expect(screen.getByRole('img',{name:'Printer'})).toBeInTheDocument()
    await user.type(screen.getByRole('searchbox',{name:'Search projects'}),'controller')
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.getByRole('link')).toHaveAttribute('href','/projects/printer')
    await user.selectOptions(screen.getByRole('combobox'),'environmental')
    expect(screen.getByText('No matching projects')).toBeInTheDocument()
    await user.click(screen.getByRole('button',{name:'Clear search'}))
    expect(screen.getAllByRole('link')).toHaveLength(2)
  })
})
