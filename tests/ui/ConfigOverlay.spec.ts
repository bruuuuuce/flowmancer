import { mount } from '@vue/test-utils'
import ConfigOverlay from '../../src/ui/components/overlays/ConfigOverlay.vue'

describe('ConfigOverlay.vue', () => {
  const makeProps = (cfgErr?: string) => ({
    overlayKey: 'config',
    overlayMode: 'normal' as const,
    getOverlayStyle: (_: string) => ({}),
    setOverlayMode: vi.fn(),
    startDrag: vi.fn(),
    modelValue: '{ "a": 1 }',
    cfgErr,
  })

  it('emits close on X', async () => {
    const wrapper = mount(ConfigOverlay, { props: makeProps() })
    await wrapper.get('button[title="Close"]').trigger('click')
    expect(wrapper.emitted().close).toBeTruthy()
  })

  it('mode buttons call provided setter', async () => {
    const props = makeProps()
    const wrapper = mount(ConfigOverlay, { props })
    const btns = wrapper.findAll('.overlay-btn')
    await btns[0].trigger('click')
    await btns[1].trigger('click')
    await btns[2].trigger('click')
    expect(props.setOverlayMode).toHaveBeenCalledWith('config', 'normal')
    expect(props.setOverlayMode).toHaveBeenCalledWith('config', 'floating')
    expect(props.setOverlayMode).toHaveBeenCalledWith('config', 'fullscreen')
  })

  it('v-model emits update on textarea input', async () => {
    const wrapper = mount(ConfigOverlay, { props: makeProps() })
    const ta = wrapper.get('textarea')
    await ta.setValue('{"b":2}')
    const ev = wrapper.emitted()['update:modelValue']
    expect(ev).toBeTruthy()
    expect(ev?.[0]?.[0]).toBe('{"b":2}')
  })

  it('apply and load-baseline emit events', async () => {
    const wrapper = mount(ConfigOverlay, { props: makeProps() })
    const buttons = wrapper.findAll('.btn')
    await buttons[0].trigger('click') // Apply
    await buttons[1].trigger('click') // Load baseline
    expect(wrapper.emitted().apply).toBeTruthy()
    expect(wrapper.emitted()['load-baseline']).toBeTruthy()
  })

  it('renders cfgErr when provided', () => {
    const wrapper = mount(ConfigOverlay, { props: makeProps('Error text') })
    expect(wrapper.text()).toContain('Error text')
  })

  it('invokes startDrag on mousedown', async () => {
    const props = makeProps()
    const wrapper = mount(ConfigOverlay, { props })
    await wrapper.find('.overlay').trigger('mousedown')
    expect(props.startDrag).toHaveBeenCalled()
  })
})
