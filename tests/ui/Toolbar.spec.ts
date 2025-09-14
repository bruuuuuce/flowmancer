import { mount } from '@vue/test-utils'
import { beforeEach, describe, it, expect, vi } from 'vitest'
import Toolbar from '../../src/ui/components/Toolbar.vue'

describe('Toolbar.vue', () => {
  beforeEach(() => {
    // Mock matchMedia for useTheme
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      })),
      writable: true,
      configurable: true
    })
    
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn().mockReturnValue('light'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn()
    }
    
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true
    })
  })
  it('renders play/pause text based on running prop', () => {
    const w1 = mount(Toolbar, { props: { running: true } })
    expect(w1.text()).toContain('Pause')
    const w2 = mount(Toolbar, { props: { running: false } })
    expect(w2.text()).toContain('Play')
  })

  it('emits events when buttons are clicked', async () => {
    const wrapper = mount(Toolbar, { props: { running: true } })
    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBeGreaterThanOrEqual(6)

    await buttons[0].trigger('click') // toggle-running
    await buttons[1].trigger('click') // toggle-stats
    await buttons[2].trigger('click') // toggle-config
    await buttons[3].trigger('click') // toggle-console
    await buttons[4].trigger('click') // toggle-scripts
    await buttons[5].trigger('click') // toggle-puml

    expect(wrapper.emitted()['toggle-running']).toBeTruthy()
    expect(wrapper.emitted()['toggle-stats']).toBeTruthy()
    expect(wrapper.emitted()['toggle-config']).toBeTruthy()
    expect(wrapper.emitted()['toggle-console']).toBeTruthy()
    expect(wrapper.emitted()['toggle-scripts']).toBeTruthy()
    expect(wrapper.emitted()['toggle-puml']).toBeTruthy()
  })
})
