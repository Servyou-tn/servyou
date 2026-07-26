import type { StorybookConfig } from '@storybook/nextjs-vite'

// Storybook runs "over the app": the @storybook/nextjs-vite framework reuses the Next.js config
// (postcss/Tailwind v4, next/image, next/font, the @/ tsconfig alias), and preview.ts imports the
// real src/app/globals.css — so stories render with the F1 tokens (src/styles/tokens.css), not a copy.
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: [],
  framework: { name: '@storybook/nextjs-vite', options: {} },
}

export default config
