import { mount } from '@vue/test-utils'
import PumlOverlay from '../../src/ui/components/overlays/PumlOverlay.vue'

describe('PumlOverlay.vue', () => {
  const makeProps = (pumlErr?: string) => ({
    overlayKey: 'puml',
    overlayMode: 'normal' as const,
    getOverlayStyle: (_: string) => ({}),
    setOverlayMode: vi.fn(),
    startDrag: vi.fn(),
    modelValue: '@startuml',
    pumlErr,
  })

  it('emits close on X', async () => {
    const wrapper = mount(PumlOverlay, { props: makeProps() })
    await wrapper.get('button[title="Close"]').trigger('click')
    expect(wrapper.emitted().close).toBeTruthy()
  })

  it('mode buttons call provided setter', async () => {
    const props = makeProps()
    const wrapper = mount(PumlOverlay, { props })
    const btns = wrapper.findAll('.overlay-btn')
    await btns[0].trigger('click')
    await btns[1].trigger('click')
    await btns[2].trigger('click')
    expect(props.setOverlayMode).toHaveBeenCalledWith('puml', 'normal')
    expect(props.setOverlayMode).toHaveBeenCalledWith('puml', 'floating')
    expect(props.setOverlayMode).toHaveBeenCalledWith('puml', 'fullscreen')
  })

  it('v-model emits update on textarea input', async () => {
    const wrapper = mount(PumlOverlay, { props: makeProps() })
    const ta = wrapper.get('textarea')
    await ta.setValue('@enduml')
    const ev = wrapper.emitted()['update:modelValue']
    expect(ev).toBeTruthy()
    expect(ev?.[0]?.[0]).toBe('@enduml')
  })

  it('apply and generate emit events', async () => {
    const wrapper = mount(PumlOverlay, { props: makeProps() })
    const buttons = wrapper.findAll('.btn')
    await buttons[0].trigger('click') // Apply
    await buttons[1].trigger('click') // Generate from current
    expect(wrapper.emitted().apply).toBeTruthy()
    expect(wrapper.emitted().generate).toBeTruthy()
  })

  it('renders pumlErr when provided', () => {
    const wrapper = mount(PumlOverlay, { props: makeProps('PUML error') })
    expect(wrapper.text()).toContain('PUML error')
  })

  it('invokes startDrag on mousedown', async () => {
    const props = makeProps()
    const wrapper = mount(PumlOverlay, { props })
    await wrapper.find('.overlay').trigger('mousedown')
    expect(props.startDrag).toHaveBeenCalled()
  })
})
