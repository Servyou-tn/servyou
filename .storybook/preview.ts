import type { Preview } from '@storybook/nextjs-vite'
// The real design-token chain: globals.css imports src/styles/tokens.css (F1, generated from Figma).
// Importing it here — not a copy — is what makes every story render with the same tokens as the app.
import '../src/app/globals.css'

const preview: Preview = {
  parameters: {
    layout: 'centered',
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
}

export default preview
