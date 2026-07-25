// tokens:pull — read every local variable + effect style out of the "ServYou — Design System"
// Figma file (via the figma-cli CDP bridge) and emit tokens/tokens.json in DTCG shape.
// Figma is the single source of truth; this file is generated, never hand-edited.
//
// Naming reconciliation (so generated --color-* names match the app's existing utilities):
//   Brand/blue|indigo/*  -> brand-blue-* / brand-indigo-*     Brand/wa/*  -> wa-*
//   Neutral/*            -> surface-* / text-* / border-*      Semantic/*  -> success-*/…/info-*
//   Semantic/rating      -> rating-yellow
import { execFileSync } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const CLI = 'C:/Users/Zolo/Projects/figma-cli/src/index.js'
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

function figmaEval(code) {
  const out = execFileSync('node', [CLI, 'eval', code], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
  const line = out.trim().split('\n').filter(Boolean).pop()
  return JSON.parse(line)
}

// ── Extractors (run in Figma plugin context; return JSON strings) ────────────────
const EX_COLOURS = `(async()=>{const colls=await figma.variables.getLocalVariableCollectionsAsync();const cb={};colls.forEach(c=>cb[c.id]=c.name);const vars=await figma.variables.getLocalVariablesAsync();const byId={};vars.forEach(v=>byId[v.id]=v);const hex=(c)=>{const h=n=>Math.round(n*255).toString(16).padStart(2,"0");let s="#"+h(c.r)+h(c.g)+h(c.b);if(c.a!=null&&c.a<1)s+=h(c.a);return s.toUpperCase();};const out=[];for(const v of vars){const cn=cb[v.variableCollectionId];if(!(cn==="Brand"||cn==="Neutral"||cn==="Semantic"))continue;const m=Object.keys(v.valuesByMode)[0];const raw=v.valuesByMode[m];if(raw&&raw.type==="VARIABLE_ALIAS"){const t=byId[raw.id];out.push({coll:cn,name:v.name,aliasOf:t.name,aliasOfColl:cb[t.variableCollectionId]});}else{out.push({coll:cn,name:v.name,hex:(raw&&raw.r!=null)?hex(raw):null});}}return JSON.stringify(out);})()`
const EX_NONCOLOUR = `(async()=>{const colls=await figma.variables.getLocalVariableCollectionsAsync();const cb={};colls.forEach(c=>cb[c.id]=c.name);const vars=await figma.variables.getLocalVariablesAsync();const o={};for(const v of vars){const c=cb[v.variableCollectionId];if(c==="Brand"||c==="Neutral"||c==="Semantic")continue;const m=Object.keys(v.valuesByMode)[0];(o[c]=o[c]||[]).push({name:v.name,type:v.resolvedType,value:v.valuesByMode[m]});}return JSON.stringify(o);})()`
const EX_SHADOWS = `(async()=>{const eff=await figma.getLocalEffectStylesAsync();const hex=(c)=>{const h=n=>Math.round(n*255).toString(16).padStart(2,"0");return "#"+h(c.r)+h(c.g)+h(c.b);};return JSON.stringify(eff.map(s=>({name:s.name,effects:s.effects.map(e=>({type:e.type,x:e.offset?e.offset.x:0,y:e.offset?e.offset.y:0,blur:e.radius||0,spread:e.spread||0,color:e.color?hex(e.color):"#000000",a:e.color?Number(e.color.a.toFixed(4)):1}))})));})()`

// ── Name reconciliation ──────────────────────────────────────────────────────────
function primitiveName(coll, name) {
  const seg = name.split('/')
  if (coll === 'Brand') {
    if (seg[0] === 'wa') return 'wa-' + seg.slice(1).join('-')      // wa/brand -> wa-brand
    return 'brand-' + seg.join('-')                                 // blue/600 -> brand-blue-600
  }
  if (coll === 'Neutral') return seg.join('-')                      // surface/base -> surface-base
  // Semantic
  if (name === 'rating') return 'rating-yellow'
  return seg.join('-')                                              // success/500 -> success-500
}

// float32 noise cleanup: Figma stores 32-bit floats. Round to a sane precision.
const px = (n) => `${Math.round(n * 1000) / 1000}px`
const round4 = (n) => Math.round(n * 10000) / 10000

// ── Build DTCG tree ────────────────────────────────────────────────────────────
function nest(root, path, node) {
  let o = root
  for (let i = 0; i < path.length - 1; i++) o = (o[path[i]] = o[path[i]] || {})
  o[path[path.length - 1]] = node
}

const colours = figmaEval(EX_COLOURS)
const nonColour = figmaEval(EX_NONCOLOUR)
const shadows = figmaEval(EX_SHADOWS)

const tokens = { color: {}, breakpoint: {}, spacing: {}, radius: {}, shadow: {}, typography: {} }

// colours: FLAT map keyed by the reconciled primitive name (single path segment). SD joins the
// path with '-', so ["color","brand-blue-600"] -> --color-brand-blue-600. Flat avoids the
// leaf/parent collision between prefix names (wa-brand vs wa-brand-hover).
const aliasCount = colours.filter((c) => c.aliasOf).length
for (const c of colours) {
  const pn = primitiveName(c.coll, c.name)
  tokens.color[pn] = c.aliasOf
    ? { $value: `{color.${primitiveName(c.aliasOfColl, c.aliasOf)}}`, $type: 'color' }
    : { $value: c.hex, $type: 'color' }
}

// breakpoints: 0->skip? keep base for completeness. --breakpoint-sm: 640px
for (const v of nonColour.Breakpoints || []) {
  const n = v.name.split('/')[1]
  tokens.breakpoint[n] = { $value: px(v.value), $type: 'dimension' }
}
// spacing: --spacing-4: 16px  (0 stays 0)
for (const v of nonColour.Spacing || []) {
  const n = v.name.split('/')[1]
  tokens.spacing[n] = { $value: v.value === 0 ? '0' : px(v.value), $type: 'dimension' }
}
// radius: --radius-md: 8px  (full -> 9999px)
for (const v of nonColour.Radius || []) {
  const n = v.name.split('/')[1]
  tokens.radius[n] = { $value: v.value === 0 ? '0' : px(v.value), $type: 'dimension' }
}
// shadow: DTCG shadow value string (single or multi layer)
for (const s of shadows) {
  const n = s.name.split('/')[1]
  const layers = s.effects.filter((e) => e.type === 'DROP_SHADOW').map((e) => `${e.x}px ${e.y}px ${e.blur}px ${e.spread}px rgb(0 0 0 / ${e.a})`)
  tokens.shadow[n] = { $value: layers.join(', '), $type: 'shadow' }
}

// typography: FULL Figma ramp — SOURCE OF TRUTH + em-assertion input.
// NOT emitted into the @theme by build.mjs this PR (see docs/frontend-audit.md gap item).
const typ = {}
for (const v of nonColour.Typography || []) {
  const [kind, step] = v.name.split('/')
  typ[kind] = typ[kind] || {}
  if (kind === 'font') typ[kind][step] = { $value: v.value, $type: 'fontFamily' }
  else if (kind === 'weight') typ[kind][step] = { $value: v.value, $type: 'fontWeight' }
  else if (kind === 'tracking') typ[kind][step] = { $value: round4(v.value), $type: 'number', $description: 'px; CSS letter-spacing emits em = tracking/size' }
  else typ[kind][step] = { $value: px(v.value), $type: 'dimension' } // size, leading
}
tokens.typography = typ

mkdirSync(resolve(ROOT, 'tokens'), { recursive: true })
writeFileSync(resolve(ROOT, 'tokens/tokens.json'), JSON.stringify(tokens, null, 2) + '\n')
console.log(`tokens.json written — colours:${colours.length} (aliases:${aliasCount}) breakpoints:${Object.keys(tokens.breakpoint).length} spacing:${Object.keys(tokens.spacing).length} radius:${Object.keys(tokens.radius).length} shadow:${Object.keys(tokens.shadow).length} typography-groups:${Object.keys(typ).length}`)
