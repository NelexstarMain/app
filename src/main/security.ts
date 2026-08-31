import { app, shell, WebContents } from 'electron'
import { URL } from 'url'

export function setupSecurity(contents: WebContents): void {
  // 1. Intercept will-navigate to prevent arbitrary page navigation inside the Electron frame
  contents.on('will-navigate', (event, navigationUrl) => {
    try {
      const parsedUrl = new URL(navigationUrl)
      if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
        event.preventDefault()
        shell.openExternal(navigationUrl)
      } else {
        event.preventDefault()
      }
    } catch {
      event.preventDefault()
    }
  })

  // 2. Intercept window.open / target="_blank"
  contents.setWindowOpenHandler(({ url }) => {
    try {
      const parsedUrl = new URL(url)
      if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
        shell.openExternal(url)
      }
    } catch {
      // Ignore invalid URLs
    }
    return { action: 'deny' }
  })
}

export const CSP_HEADER = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: file: https: blob:",
  "font-src 'self' data:",
  "connect-src 'self' data: blob:",
  "media-src 'self' data: file: blob:"
].join('; ')
