/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./*.{html,js}",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'brand-dark': '#0f172a', /* Slate 900 */
                'brand-darker': '#020617', /* Slate 950 */
                'brand-primary': '#4f46e5', /* Indigo 600 */
                'brand-secondary': '#06b6d4', /* Cyan 500 */
                'brand-accent': '#8b5cf6', /* Violet 500 */
                'glass-bg': 'rgba(255, 255, 255, 0.05)',
                'glass-border': 'rgba(255, 255, 255, 0.1)',
            },
            fontFamily: {
                'sans': ['"Outfit"', 'sans-serif'],
                'body': ['"Inter"', 'sans-serif'],
            },
            animation: {
                'float': 'float 6s ease-in-out infinite',
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-20px)' },
                }
            }
        },
    },
    plugins: [],
}
