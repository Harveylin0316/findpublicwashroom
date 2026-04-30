// Light tap feedback. Works on Android Chrome; silently no-op on iOS Safari.
export function tap() {
  navigator.vibrate?.(8)
}
