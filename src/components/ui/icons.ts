export const PANEL_MARK =
  '<g transform="scale(0.375)">'
  + '<defs><linearGradient id="orvanes-r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2402b"/><stop offset="1" stop-color="#ffd2c4"/></linearGradient></defs>'
  + '<path d="M32 9a20 20 0 0 0 0 40" fill="none" stroke="url(#orvanes-r)" stroke-width="10"/>'
  + '<path d="M32 15a20 20 0 0 1 0 40" fill="none" stroke="#8a1d10" stroke-width="10"/>'
  + '<circle cx="32" cy="32" r="4" fill="#e2402b"/>'
  + '</g>';

export const FAVICONS: Record<string, string> = {
  panel: PANEL_MARK,
};
