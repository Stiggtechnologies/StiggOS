import preset from '../../packages/brand/src/tailwind-preset.js';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [preset],
  // Scan our shared packages so utility classes used by @stigg/ui +
  // @stigg/help (Tour, HelpCenter, PropertyProfile, OpenInMaps) survive
  // the Tailwind purge. Without these the Tour modal renders unstyled.
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
    '../../packages/help/src/**/*.{ts,tsx}',
    '../../packages/brand/src/**/*.{ts,tsx}',
  ],
};
