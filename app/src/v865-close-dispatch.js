/**
 * Dispatch a close action to the button itself without bubbling it into the
 * MapLibre canvas or unrelated delegated click handlers.
 *
 * The unified motion coordinator delays a real close action until the exit
 * animation ends. Replaying with HTMLElement.click() bubbles through the map
 * container and can be interpreted as a second map tap, opening another
 * facility or sheet. A non-bubbling Event still reaches listeners attached
 * directly to the close control (including MapLibre's own popup close handler).
 */
export function dispatchLocalClick(button, win = globalThis.window) {
  if (!button?.isConnected || typeof button.dispatchEvent !== 'function') return false;
  const EventCtor = win?.MouseEvent || win?.Event || globalThis.Event;
  if (typeof EventCtor !== 'function') return false;
  const event = new EventCtor('click', {
    bubbles: false,
    cancelable: true,
    composed: false,
    view: win || undefined,
    button: 0,
    buttons: 0,
    detail: 1
  });
  return button.dispatchEvent(event);
}
