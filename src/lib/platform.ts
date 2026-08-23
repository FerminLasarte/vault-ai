// Whether the app is running on macOS.
//
// Only ever used for layout that depends on the window chrome: macOS is
// configured with an overlay title bar, so the traffic lights float over the
// app's own top-left corner, while Windows and Linux keep a real title bar
// above the content and need no room reserved for anything.
//
// Read from the user agent rather than through a plugin: this decides a
// padding, and being wrong costs a few pixels, not correctness.
export function isMacOS(): boolean {
  return /Mac/i.test(navigator.userAgent);
}
