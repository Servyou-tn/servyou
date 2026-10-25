# Self-hosted fonts

Loaded with `next/font/local`, so `next build` makes no network request for fonts (two Google
Fonts fetch flakes failed CI before these were committed).

Each file is the exact woff2 that `next/font/google` used to download for this app: same Google
Fonts URL, same request headers, byte-identical (sha256) to the preloaded files of the last Google
build. Only the subsets that build preloaded are kept: latin, plus arabic for Cairo. All four are
variable fonts (one file covers every weight).

| File | Family | Version | Used by |
|---|---|---|---|
| `inter-latin.woff2` | Inter | 4.001 (Google Fonts v20) | `--font-inter`, root layout |
| `cairo-latin.woff2` | Cairo | 3.130 (Google Fonts v31) | `--font-cairo`, root layout (RTL) |
| `cairo-arabic.woff2` | Cairo | 3.130 (Google Fonts v31) | `--font-cairo`, root layout (RTL) |
| `geist-mono-latin.woff2` | Geist Mono | 1.701 (Google Fonts v6) | `--font-geist-mono`, root layout |
| `manrope-latin.woff2` | Manrope | 4.504 (Google Fonts v20) | `--font-display`, landing + auth pages |

## Licenses

All four families are licensed under the SIL Open Font License 1.1
(https://openfontlicense.org). Each file keeps its copyright notice and license URL in its
`name` table, as the OFL requires.

- Inter: Copyright 2016 The Inter Project Authors (https://github.com/rsms/inter)
- Cairo: Copyright 2009 The Cairo Project Authors (https://github.com/Gue3bara/Cairo)
- Geist Mono: Copyright 2024 The Geist Project Authors (https://github.com/vercel/geist-font)
- Manrope: Copyright 2019 The Manrope Project Authors (https://github.com/sharanda/manrope)

## Updating

Do not swap in files from another source (GitHub releases, a different subset): the glyph data
would change and so would rendering. To refresh, download the latin/arabic subset URLs from the
Google Fonts CSS2 API with the same weights as the `localFont()` calls, and replace the files.
