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
        // Custom colors for sleep stages
        'wake': '#FFE4B5',
        'n1': '#E6E6FA',
        'n2': '#B0E0E6',
        'n3': '#4682B4',
        'rem': '#FF6347',
        
        // UI colors
        'primary': '#6366F1',
        'secondary': '#8B5CF6',
        'success': '#10B981',
        'warning': '#F59E0B',
        'danger': '#EF4444',
        
        // Apnea severity colors
        'apnea-normal': '#4CAF50',
        'apnea-mild': '#FFC107',
        'apnea-moderate': '#FF9800',
        'apnea-severe': '#F44336',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}