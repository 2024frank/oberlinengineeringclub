import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { ConceptPanel } from '@/components/concepts/ConceptPanel'

afterEach(cleanup)
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
})

it('puts page controls inside the machine console and closes with Escape', async () => {
  const surface = document.createElement('div')
  document.body.appendChild(surface)
  const close = vi.fn()
  const result = render(<ConceptPanel view="projects" direction="machine" surface={surface} onClose={close}><button>Open project</button></ConceptPanel>)
  expect(screen.getByRole('region', { name: 'Projects console' })).toContainElement(screen.getByRole('button', { name: 'Open project' }))
  expect(surface).toContainElement(screen.getByRole('region'))
  await userEvent.setup().keyboard('{Escape}')
  expect(close).toHaveBeenCalledOnce()
  result.rerender(<ConceptPanel view="home" direction="machine" surface={surface} onClose={close}><button>Open project</button></ConceptPanel>)
  expect(screen.queryByRole('region')).not.toBeInTheDocument()
  surface.remove()
})

it('keeps entered details when a slow 3D scene becomes ready or unavailable', async () => {
  function Form() {
    const [name, setName] = useState('')
    return <label>Name<input value={name} onChange={event => setName(event.target.value)}/></label>
  }
  const surface = document.createElement('div')
  document.body.appendChild(surface)
  const close = vi.fn()
  const result = render(<ConceptPanel view="join" direction="machine" surface={null} onClose={close}><Form/></ConceptPanel>)
  await userEvent.setup().type(screen.getByRole('textbox', { name: 'Name' }), 'Test Student')
  result.rerender(<ConceptPanel view="join" direction="machine" surface={surface} onClose={close}><Form/></ConceptPanel>)
  expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Test Student')
  result.rerender(<ConceptPanel view="join" direction="machine" surface={null} onClose={close}><Form/></ConceptPanel>)
  expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Test Student')
  result.unmount()
  expect(surface).toBeEmptyDOMElement()
  surface.remove()
})
