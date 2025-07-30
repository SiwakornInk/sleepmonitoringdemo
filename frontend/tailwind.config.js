/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Background colors with dark theme
        background: '#0a0e27',
        foreground: '#f0f0f0',
        card: '#161b3d',
        'card-hover': '#1a2045',
        border: 'rgba(255, 255, 255, 0.1)',
        
        // Primary colors with gradient variations
        primary: {
          DEFAULT: '#8B5CF6',
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
        },
        
        secondary: {
          DEFAULT: '#6366F1',
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
        },
        
        // Sleep stage colors with improved visibility
        'wake': {
          DEFAULT: '#FFB84D',
          light: '#FFE4B5',
          dark: '#FF9500',
        },
        'n1': {
          DEFAULT: '#B794F4',
          light: '#E6E6FA',
          dark: '#9F7AEA',
        },
        'n2': {
          DEFAULT: '#63B3ED',
          light: '#B0E0E6',
          dark: '#4299E1',
        },
        'n3': {
          DEFAULT: '#4C6EF5',
          light: '#6B8BF5',
          dark: '#3451E1',
        },
        'rem': {
          DEFAULT: '#F56565',
          light: '#FF6B6B',
          dark: '#E53E3E',
        },
        
        // Apnea severity colors
        'apnea-normal': '#48BB78',
        'apnea-mild': '#F6D55C',
        'apnea-moderate': '#ED8936',
        'apnea-severe': '#E53E3E',
        
        // Status colors
        success: '#48BB78',
        warning: '#F6D55C',
        danger: '#E53E3E',
        info: '#4299E1',
        
        // Neutral colors for dark theme
        gray: {
          50: '#F7FAFC',
          100: '#EDF2F7',
          200: '#E2E8F0',
          300: '#CBD5E0',
          400: '#A0AEC0',
          500: '#718096',
          600: '#4A5568',
          700: '#2D3748',
          800: '#1A202C',
          900: '#171923',
        },
      },
      
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      
      fontSize: {
        '2xs': '0.625rem',
        '3xl': '2rem',
        '4xl': '2.5rem',
        '5xl': '3rem',
        '6xl': '3.5rem',
        '7xl': '4rem',
      },
      
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'gradient': 'gradient 3s ease infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.5s ease-out',
        'spin-slow': 'spin 3s linear infinite',
      },
      
      keyframes: {
        gradient: {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center',
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center',
          },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        glow: {
          '0%': { 'box-shadow': '0 0 20px rgba(139, 92, 246, 0.5)' },
          '100%': { 'box-shadow': '0 0 40px rgba(139, 92, 246, 0.8)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-primary': 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
        'gradient-secondary': 'linear-gradient(135deg, #6366F1 0%, #3B82F6 100%)',
        'gradient-dark': 'linear-gradient(135deg, #1a1c3d 0%, #0f1629 100%)',
      },
      
      backdropBlur: {
        xs: '2px',
      },
      
      boxShadow: {
        'glow': '0 0 40px rgba(139, 92, 246, 0.3)',
        'glow-lg': '0 0 60px rgba(139, 92, 246, 0.4)',
        'inner-glow': 'inset 0 0 20px rgba(139, 92, 246, 0.2)',
      },
      
      screens: {
        'xs': '475px',
        '3xl': '1920px',
      },
    },
  },
  plugins: [],
}