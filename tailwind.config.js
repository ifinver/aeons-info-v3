/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/client/**/*.{html,js}",
    "./src/**/*.{js,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#007bff',
        'primary-dark': '#0056b3',
        'primary-light': '#cce7ff',
        'accent': '#28a745',
        'text': '#212529',
        'text-muted': '#6c757d',
        'text-secondary': '#495057',
        'bg-panel': '#f8f9fa',
        'bg-panel-2': '#e9ecef',
        'border': '#dee2e6',
      },
      fontFamily: {
        'sans': ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Noto Sans', 'Ubuntu', 'Cantarell', 'Helvetica Neue', 'Arial', 'Apple Color Emoji', 'Segoe UI Emoji'],
      },
      boxShadow: {
        'panel': '0 4px 20px rgba(0,0,0,.1), inset 0 1px 0 rgba(255,255,255,.8)',
        'hover': '0 8px 30px rgba(0,0,0,0.15)',
      },
      spacing: {
        '18': '4.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
