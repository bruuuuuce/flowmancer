import { mount } from '@vue/test-utils'
import ConsoleOverlay from '../../src/ui/components/overlays/ConsoleOverlay.vue'

describe('ConsoleOverlay.vue', () => {
  const makeProps = () => ({
    overlayKey: 'console',
    overlayMode: 'normal' as const,
    getOverlayStyle: (_: string) => ({}),
    setOverlayMode: vi.fn(),
    startDrag: vi.fn(),
    modelValue: 'node set svcA capacity=120',
    log: ['hello', 'world'],
    execCmd: vi.fn(),
  })

  it('emits close on X', async () => {
    const wrapper = mount(ConsoleOverlay, { props: makeProps() })
    await wrapper.get('button[title="Close"]').trigger('click')
    expect(wrapper.emitted().close).toBeTruthy()
  })

  it('mode buttons call provided setter', async () => {
    const props = makeProps()
    const wrapper = mount(ConsoleOverlay, { props })
    const btns = wrapper.findAll('.overlay-btn')
    await btns[0].trigger('click')
    await btns[1].trigger('click')
    await btns[2].trigger('click')
    expect(props.setOverlayMode).toHaveBeenCalledWith('console', 'normal')
    expect(props.setOverlayMode).toHaveBeenCalledWith('console', 'floating')
    expect(props.setOverlayMode).toHaveBeenCalledWith('console', 'fullscreen')
  })

  it('v-model emits update on input', async () => {
    const wrapper = mount(ConsoleOverlay, { props: makeProps() })
    const input = wrapper.get('input')
    await input.setValue('node off svcA')
    const ev = wrapper.emitted()['update:modelValue']
    expect(ev).toBeTruthy()
    expect(ev?.[0]?.[0]).toBe('node off svcA')
  })

  it('pressing Enter triggers execCmd', async () => {
    const props = makeProps()
    const wrapper = mount(ConsoleOverlay, { props })
    const input = wrapper.get('input')
    await input.trigger('keyup.enter')
    expect(props.execCmd).toHaveBeenCalled()
  })

  it('invokes startDrag on mousedown', async () => {
    const props = makeProps()
    const wrapper = mount(ConsoleOverlay, { props })
    await wrapper.find('.overlay').trigger('mousedown')
    expect(props.startDrag).toHaveBeenCalled()
  })
})
