/**
 * The palette, as literals.
 *
 * This exists for one reason: `app/opengraph-image.tsx` renders through Satori,
 * which resolves no stylesheets, no CSS custom properties and no `currentColor`.
 * It can only be handed real values. Before this file there were two independent
 * copies of the palette and nothing said they were related.
 *
 * TWIN FILE: `app/globals.css`. The `:root` block there carries the same
 * literals and points back here. CSS cannot import TypeScript, so the two are
 * kept in step by hand; a codegen step for eight values is not worth it. If you
 * change a value, change it in both.
 *
 * Values are Yukon's own chrome tokens, read from their production stylesheet.
 */
export const BRAND = Object.freeze({
  /** page background */
  bg: "#ffffff",
  /** raised surface: cards, code blocks, the top bar */
  surface: "#f8f8fa",
  /** primary text */
  ink: "#111111",
  /** secondary text */
  inkDim: "#4e4b58",
  /** tertiary text: micro-labels, sublabels */
  inkFaint: "#7c7a88",
  /** borders */
  line: "#dcdce3",
  /** hairlines between rows */
  lineFaint: "#ededf1",
  /** the accent */
  accent: "#4137ff",
  /** accent wash: hovers, panel fills */
  accentSoft: "#efebfe",
  /** failure. Yukon publishes this one. */
  bad: "#c13c36",
  /** success. Yukon has no green; this one is ours. */
  good: "#2f7d4f",
} as const);

export type Brand = typeof BRAND;
