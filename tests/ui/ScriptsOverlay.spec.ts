import { mount } from '@vue/test-utils'
import ScriptsOverlay from '../../src/ui/components/overlays/ScriptsOverlay.vue'

describe('ScriptsOverlay.vue', () => {
  const makeProps = () => ({
    overlayKey: 'scripts',
    overlayMode: 'normal' as const,
    getOverlayStyle: (_: string) => ({}),
    setOverlayMode: vi.fn(),
    startDrag: vi.fn(),
    modelValue: 'wait 1s',
    runScript: vi.fn(),
  })

  it('emits close on X', async () => {
    const wrapper = mount(ScriptsOverlay, { props: makeProps() })
    await wrapper.get('button[title="Close"]').trigger('click')
    expect(wrapper.emitted().close).toBeTruthy()
  })

  it('mode buttons call provided setter', async () => {
    const props = makeProps()
    const wrapper = mount(ScriptsOverlay, { props })
    const btns = wrapper.findAll('.overlay-btn')
    await btns[0].trigger('click')
    await btns[1].trigger('click')
    await btns[2].trigger('click')
    expect(props.setOverlayMode).toHaveBeenCalledWith('scripts', 'normal')
    expect(props.setOverlayMode).toHaveBeenCalledWith('scripts', 'floating')
    expect(props.setOverlayMode).toHaveBeenCalledWith('scripts', 'fullscreen')
  })

  it('v-model emits update on textarea input', async () => {
    const wrapper = mount(ScriptsOverlay, { props: makeProps() })
    const ta = wrapper.get('textarea')
    await ta.setValue('node off svcA')
    const ev = wrapper.emitted()['update:modelValue']
    expect(ev).toBeTruthy()
    expect(ev?.[0]?.[0]).toBe('node off svcA')
  })

  it('run button calls runScript', async () => {
    const props = makeProps()
    const wrapper = mount(ScriptsOverlay, { props })
    const btn = wrapper.get('.btn')
    await btn.trigger('click')
    expect(props.runScript).toHaveBeenCalled()
  })

  it('invokes startDrag on mousedown', async () => {
    const props = makeProps()
    const wrapper = mount(ScriptsOverlay, { props })
    await wrapper.find('.overlay').trigger('mousedown')
    expect(props.startDrag).toHaveBeenCalled()
  })
})
