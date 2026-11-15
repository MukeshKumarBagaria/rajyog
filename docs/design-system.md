# Design system

Calm, premium, distraction-free: soft pink, ivory and dusty rose, generous
spacing, rounded cards, very subtle shadows and a faint Rajasthani *jaali*
(lattice) motif. All tokens live in `src/app/globals.css` and are exposed to
Tailwind v4 via `@theme inline`, so components only use semantic utilities
(`bg-surface`, `text-ink`, `border-line`, `bg-primary-strong`…).

## Colour tokens

| Token | Light | Use |
|---|---|---|
| `background` | `#FFF9F6` | page background (ivory) |
| `surface` | `#FFFFFF` | cards |
| `primary` | `#C76D8C` | accents, rings, charts, focus outlines |
| `primary-strong` | `#B05676` | filled buttons and small primary text (WCAG AA on white: 4.7:1) |
| `primary-light` | `#F8E8ED` | highlight backgrounds, selected nav |
| `secondary` | `#E9A9BC` | secondary accents, focus-timer bars |
| `ink` | `#46333B` | primary text (11:1) |
| `ink-secondary` | `#866B75` | supporting small text (AA-tuned from the brief's `#987E88`) |
| `ink-faint` | `#987E88` | the brief's secondary colour — placeholders, large/decorative text |
| `line` | `#F0E2E7` | borders |
| `success` / `warning` / `danger` | `#6E9E83` / `#D6A15D` / `#C96B72` | status (with darker `*-ink` variants for text) |
| `heat-0…4` | — | study-calendar intensity scale |

A full dark palette is defined under `[data-theme='dark']`. The theme
preference (light / dark / system) is stored per user and applied before first
paint (inline script + `ThemeSync`).

## Typography

* **Manrope** (Latin) and **Noto Sans Devanagari** (Hindi/Rajasthani), loaded
  with `next/font` and combined in one font stack, so mixed-script text renders
  correctly everywhere.
* Weights: 400 body · 500 supporting · 600 headings · 700 statistics.
* Numbers use `tabular-nums` (`.tabular`) so timers and stats don't jitter.

## Shape & motion

* Cards 18 px radius · buttons 12 px · inputs 10 px · pills for badges.
* Shadows: `--shadow-soft` (resting), `--shadow-lift` (hover/dialogs).
* Transitions 150–250 ms; `prefers-reduced-motion` disables animation.

## Components (`src/components/ui`)

`Button` / `ButtonLink` (primary, secondary, outline, ghost, danger, subtle) ·
`Card` / `CardHeader` / `CardContent` · `Input`, `Select`, `Textarea`,
`Checkbox`, `Switch`, `Field` · `Badge`, `Alert`, `ProgressBar`,
`ProgressRing`, `Stat`, `EmptyState`, `Skeleton`, `PageHeader` · `Dialog`
(native `<dialog>`, focus-trapped) · `ConfirmButton` · `SubmitButton` ·
`Toaster` · `Avatar` · `Logo` (jharokha arch with a rising sun) · `VideoThumb`.

## Layout

* Desktop: compact left sidebar (Home, Courses, Focus, Analysis; secondary links below).
* Mobile: four-item bottom navigation with safe-area padding.
* Content max width 72 rem; responsive grids always declare a base
  `grid-cols-1` / `minmax(0, …fr)` tracks so long content never overflows on phones.

## Accessibility

Visible focus rings, skip-to-content link, labelled controls, `aria-current`
navigation, `role="progressbar"` with values, charts with text alternatives,
AA contrast for text, keyboard-operable dialogs and menus.
