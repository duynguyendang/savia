/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: '#0F172A',
                accent: '#F59E0B',
                text: '#F1F5F9',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                serif: ['Cinzel', 'Playfair Display', 'serif'],
            },
        },
    },
    plugins: [],
}
