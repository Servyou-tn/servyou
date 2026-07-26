import type { Meta, StoryObj } from '@storybook/nextjs-vite'

// Smoke test: proves Storybook renders with the REAL F1 tokens (preview.ts imports src/app/globals.css
// → src/styles/tokens.css). The swatch must compute to #1F5FE0 — brand-blue-600, identical to the app.
function TokenSmoke() {
  return (
    <div className="flex flex-col gap-2 p-4">
      <div className="flex items-center gap-3">
        <div className="size-16 rounded-lg bg-brand-blue-600" data-testid="brand-blue-600" />
        <span className="text-body-sm text-text-primary">bg-brand-blue-600 → #1F5FE0</span>
      </div>
    </div>
  )
}

const meta = { title: 'Tokens/Smoke', component: TokenSmoke } satisfies Meta<typeof TokenSmoke>
export default meta
export const BrandBlue600: StoryObj<typeof TokenSmoke> = {}
