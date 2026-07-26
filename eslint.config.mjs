import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import boundary from "./eslint-rules/boundary.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // F2 tooling artifacts — never lint the static Storybook bundle (minified vendor JS) or the
    // headless-Chrome VRT profiles (a force-installed browser extension ships its own minified JS).
    "storybook-static/**",
    "**/.vrt-*-profile/**",
    "scripts/vrt/__baselines__/**",
    "scripts/vrt/__current__/**",
  ]),
  // Honour the _-prefix convention for intentionally-unused args/vars/caught errors.
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
    },
  },
  // ── shared/ui boundary (F2): primitives stay token-only, role-agnostic, feature-independent. Errors. ──
  {
    files: ["src/components/ui/**/*.{ts,tsx}"],
    ignores: ["src/components/ui/**/*.stories.tsx", "src/components/ui/**/*.test.*"],
    plugins: { "shared-ui": boundary },
    rules: {
      "shared-ui/no-raw-color": "error",
      "shared-ui/no-seller-type": "error",
      "shared-ui/no-caller-and-self-css": "error",
      "no-restricted-imports": ["error", {
        patterns: [
          {
            group: [
              "@/components/marche/*", "@/components/dashboard/*", "@/components/landing/*",
              "@/components/home/*", "@/components/auth/*", "@/components/devenir/*",
              "@/components/parametres/*", "@/components/recherche/*", "@/components/categories/*",
              "@/components/legal/*", "@/components/marketing/*", "@/components/shell/*",
            ],
            message: "shared/ui must not import from a feature/domain folder — depend only on ui/, shared/, lib/utils, and external packages.",
          },
          {
            group: [
              "@/lib/marche/*", "@/lib/dashboard/*", "@/lib/search/*", "@/lib/freelance/*",
              "@/lib/categories/*", "@/lib/contact/*", "@/lib/faq/*", "@/lib/legal/*", "@/lib/taxonomy/*",
            ],
            message: "shared/ui must not import from a feature/domain lib.",
          },
        ],
      }],
    },
  },
]);

export default eslintConfig;
