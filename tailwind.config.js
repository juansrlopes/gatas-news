/** @type {import('tailwindcss').Config} */
const tailwindConfig = {
    content: [
        "./src/**/*.{js,ts,jsx,tsx,mdx}",
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
        fontFamily: {
            'great-vibes': ['Great Vibes', 'cursive'],
        },
        },
    },
    plugins: [],
    };

export default tailwindConfig;
  