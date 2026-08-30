/**
 * Shared Tailwind preset for all Musictron hosts.
 * Host apps only provide `content` globs and `darkMode`; theme lives here.
 *
 * The font-size scale is fluid: each step is a clamp() that grows between a
 * 1280px and 1920px viewport. The rem terms also respond to the user's UI
 * scale preference (root font-size set by the theme store).
 */
/** @type {Partial<import('tailwindcss').Config>} */
export default {
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      fontSize: {
        '2xs': [
          'clamp(0.6875rem, 0.5625rem + 0.15625vw, 0.75rem)',
          { lineHeight: '1.35' },
        ], // 11px → 12px
        xs: [
          'clamp(0.75rem, 0.625rem + 0.15625vw, 0.8125rem)',
          { lineHeight: '1.35' },
        ], // 12px → 13px
        sm: [
          'clamp(0.8125rem, 0.625rem + 0.234375vw, 0.90625rem)',
          { lineHeight: '1.4' },
        ], // 13px → 14.5px
        base: [
          'clamp(0.9375rem, 0.75rem + 0.234375vw, 1.03125rem)',
          { lineHeight: '1.45' },
        ], // 15px → 16.5px
        lg: [
          'clamp(1.0625rem, 0.875rem + 0.234375vw, 1.15625rem)',
          { lineHeight: '1.4' },
        ], // 17px → 18.5px
        xl: [
          'clamp(1.25rem, 1rem + 0.3125vw, 1.375rem)',
          { lineHeight: '1.3' },
        ], // 20px → 22px
        '2xl': [
          'clamp(1.375rem, 1.0625rem + 0.390625vw, 1.53125rem)',
          { lineHeight: '1.25' },
        ], // 22px → 24.5px
        '3xl': [
          'clamp(1.75rem, 1.3125rem + 0.546875vw, 1.96875rem)',
          { lineHeight: '1.2' },
        ], // 28px → 31.5px
        '4xl': [
          'clamp(2.25rem, 1.625rem + 0.78125vw, 2.5625rem)',
          { lineHeight: '1.1' },
        ], // 36px → 41px
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: 'calc(var(--radius) + 0.125rem)',
        '2xl': 'calc(var(--radius) + 0.375rem)',
      },
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
      },
    },
  },
}
