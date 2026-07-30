import { defineConfig } from 'vite'
import { resolve } from 'node:path'

// The site is now hand-written static HTML: index.html is the Agent Teardown
// homepage, plus two legal pages. No React entry point remains, so the React
// and Tailwind plugins are gone and `vite build` simply processes these three
// documents and copies public/ across. The previous React app is preserved on
// the backup/live-site-v1 branch.
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        privacy: resolve(__dirname, 'privacy.html'),
        terms: resolve(__dirname, 'terms.html'),
        notfound: resolve(__dirname, '404.html'),
        thankyou: resolve(__dirname, 'thank-you.html'),
      },
    },
  },
})
