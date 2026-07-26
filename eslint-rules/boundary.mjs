// Local ESLint flat-config plugin — the shared/ui boundary rules (F2). Applied (as errors, failing
// the build) to src/components/ui/** by eslint.config.mjs. Rule 3c (no feature imports) is done with
// the built-in no-restricted-imports in the config; the three below need AST rules.

// ── 3a — no raw hex / rgb-family color / Tailwind arbitrary *value* bracket. Tokens only. ──
const HEX = /#[0-9a-fA-F]{3,8}\b/
const COLORFN = /\b(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|hwb)\s*\(/i
// Arbitrary value utilities like bg-[#fff], w-[10px], text-[14px]. Exclude Tailwind VARIANT brackets
// (data-[…], group-[…], aria-[…], supports-[…], has-[…], peer-[…], not-[…], in-[…], min-[…], max-[…])
// which are selectors, not values.
// A bracket is a VARIANT selector (data-[state=open], group-data-[size=lg], group-has-[…], min-[…])
// when the utility's LAST hyphen-segment is one of these — those are selectors, not values, so allowed.
const VARIANT = /^(data|has|aria|supports|not|in|min|max|group|peer|nth)$/
const BRACKET = /(^|[\s:])([a-z][a-z-]*)-\[[^\]]+\]/g

function checkString(context, node, raw) {
  if (typeof raw !== 'string' || !raw) return
  if (HEX.test(raw)) { context.report({ node, message: 'shared/ui: raw hex color is forbidden — use a design token (--color-* / a token utility).' }); return }
  const m = raw.match(COLORFN)
  if (m) { context.report({ node, message: `shared/ui: raw ${m[1]}() color is forbidden — use a design token.` }); return }
  let bm
  BRACKET.lastIndex = 0
  while ((bm = BRACKET.exec(raw))) {
    if (!VARIANT.test(bm[2].split('-').pop())) { context.report({ node, message: `shared/ui: Tailwind arbitrary value "${bm[2]}-[…]" is forbidden — use a token utility.` }); break }
  }
}

const noRawColor = {
  meta: { type: 'problem', docs: { description: 'no raw hex/rgb/bracket values in shared/ui' } },
  create(context) {
    return {
      Literal(node) { if (typeof node.value === 'string') checkString(context, node, node.value) },
      TemplateElement(node) { checkString(context, node, node.value.raw) },
    }
  },
}

// ── 3b — no seller_type read + no role-resolver import. Role enters a primitive via props only. ──
const noSellerType = {
  meta: { type: 'problem', docs: { description: 'no seller_type / role resolver in shared/ui' } },
  create(context) {
    const isSeller = (k) => k && (k.name === 'seller_type' || k.name === 'sellerType' || k.value === 'seller_type')
    return {
      MemberExpression(node) { if (isSeller(node.property)) context.report({ node, message: 'shared/ui: must not read seller_type — role awareness enters via props only.' }) },
      Property(node) { if (!node.computed && isSeller(node.key)) context.report({ node, message: 'shared/ui: must not reference seller_type.' }) },
      ImportDeclaration(node) {
        for (const s of node.specifiers) {
          const n = (s.imported && s.imported.name) || (s.local && s.local.name) || ''
          if (/^(sellerType|roleFromSellerType|resolveRole|SellerType|ShellRole)$/.test(n)) context.report({ node: s, message: `shared/ui: must not import the role resolver (${n}) — role enters via props.` })
        }
      },
    }
  },
}

// ── 3d (enforceable subset) — a component that accepts a `style` prop AND also hardcodes an inline
// style={{ key: … }} is setting a CSS property it also accepts from the caller. We flag those keys.
// LIMITS (honest, not overclaimed): this does NOT catch (i) hardcoded className utilities that conflict
// with an accepted `className` (would need tailwind-merge/utility→property semantics), (ii) a variant
// prop that maps to a property under a non-CSS name, or (iii) dynamically-computed style keys.
const noCallerAndSelfCss = {
  meta: { type: 'problem', docs: { description: 'no CSS property both set internally and accepted from the caller (subset: inline style + `style` prop)' } },
  create(context) {
    const stack = []
    const acceptsStyle = (node) => (node.params || []).some((p) =>
      (p.type === 'ObjectPattern' && p.properties.some((pr) => pr.key && pr.key.name === 'style')) ||
      (p.typeAnnotation && context.sourceCode.getText(p.typeAnnotation).includes('style'))
    )
    return {
      ':function'(node) { stack.push(acceptsStyle(node)) },
      ':function:exit'() { stack.pop() },
      JSXAttribute(node) {
        if (node.name.name !== 'style' || !stack[stack.length - 1]) return
        const val = node.value
        if (val && val.type === 'JSXExpressionContainer' && val.expression.type === 'ObjectExpression') {
          for (const prop of val.expression.properties) {
            if (prop.type === 'Property' && !prop.computed && prop.key) {
              const key = prop.key.name || prop.key.value
              context.report({ node: prop, message: `shared/ui: component accepts a \`style\` prop but also hardcodes style.${key} — a caller-controllable property must not be set internally.` })
            }
          }
        }
      },
    }
  },
}

export default { rules: { 'no-raw-color': noRawColor, 'no-seller-type': noSellerType, 'no-caller-and-self-css': noCallerAndSelfCss } }
