export type EventType = string
export type EventPayload = Record<string, unknown>

export interface EventBusEvent {
  type: EventType
  payload: EventPayload
  timestamp: number
}

export type EventHandler = (event: EventBusEvent) => void

export class EventBus {
  private handlers: Map<EventType, Set<EventHandler>> = new Map()

  on(type: EventType, handler: EventHandler): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set())
    }
    this.handlers.get(type)!.add(handler)
  }

  off(type: EventType, handler: EventHandler): void {
    this.handlers.get(type)?.delete(handler)
  }

  emit(type: EventType, payload: EventPayload = {}): void {
    const event: EventBusEvent = { type, payload, timestamp: Date.now() }
    this.handlers.get(type)?.forEach((handler) => handler(event))
  }

  clear(): void {
    this.handlers.clear()
  }
}
