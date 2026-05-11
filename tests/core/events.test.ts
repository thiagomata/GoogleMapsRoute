import { describe, it, expect, beforeEach } from 'vitest'
import { EventBus } from '../../src/core/events'

describe('EventBus', () => {
  let bus: EventBus

  beforeEach(() => {
    bus = new EventBus()
  })

  it('calls handler when event is emitted', () => {
    const handler = vi.fn()
    bus.on('test', handler)
    bus.emit('test', { value: 42 })

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith({
      type: 'test',
      payload: { value: 42 },
      timestamp: expect.any(Number),
    })
  })

  it('calls multiple handlers for the same event', () => {
    const handler1 = vi.fn()
    const handler2 = vi.fn()
    bus.on('test', handler1)
    bus.on('test', handler2)
    bus.emit('test')

    expect(handler1).toHaveBeenCalledTimes(1)
    expect(handler2).toHaveBeenCalledTimes(1)
  })

  it('does not call handler after off()', () => {
    const handler = vi.fn()
    bus.on('test', handler)
    bus.off('test', handler)
    bus.emit('test')

    expect(handler).not.toHaveBeenCalled()
  })

  it('handles different event types independently', () => {
    const handlerA = vi.fn()
    const handlerB = vi.fn()
    bus.on('eventA', handlerA)
    bus.on('eventB', handlerB)

    bus.emit('eventA')
    expect(handlerA).toHaveBeenCalledTimes(1)
    expect(handlerB).not.toHaveBeenCalled()
  })

  it('clears all handlers', () => {
    const handler = vi.fn()
    bus.on('test', handler)
    bus.clear()
    bus.emit('test')

    expect(handler).not.toHaveBeenCalled()
  })

  it('emits with empty payload by default', () => {
    const handler = vi.fn()
    bus.on('test', handler)
    bus.emit('test')

    expect(handler).toHaveBeenCalledWith({
      type: 'test',
      payload: {},
      timestamp: expect.any(Number),
    })
  })
})
