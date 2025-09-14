import { afterEach, vi } from 'vitest'

// Ensure a clean DOM between tests (VTU v2 has no global cleanup)
afterEach(() => {
  document.body.innerHTML = ''
})

// Basic raf polyfill for jsdom
if (!globalThis.requestAnimationFrame) {
  // @ts-ignore
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 16) as any
}

// Mock scrollTo to avoid jsdom errors
// @ts-ignore
if (!window.scrollTo) window.scrollTo = () => {}

// A minimal Worker mock (if any code references it indirectly)
class MockWorker {
  onmessage: ((this: Worker, ev: MessageEvent<any>) => any) | null = null
  onerror: ((this: AbstractWorker, ev: ErrorEvent) => any) | null = null
  postMessage(_: any) {}
  terminate() {}
  addEventListener() {}
  removeEventListener() {}
}
// @ts-ignore
if (!(globalThis as any).Worker) (globalThis as any).Worker = MockWorker as any
