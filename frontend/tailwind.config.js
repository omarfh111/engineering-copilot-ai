export default {
    darkMode: 'class',
    content: ['./index.html', './src/**/*.{ts,tsx}'],
    theme: {
        extend: {
            colors: {
                brand: {
                    50: '#eef4ff',
                    100: '#d9e7ff',
                    200: '#bdd5ff',
                    300: '#91b7ff',
                    400: '#5d90ff',
                    500: '#3467ff',
                    600: '#2048f0',
                    700: '#1b38d0',
                    800: '#1d33a8',
                    900: '#1e327f'
                }
            },
            boxShadow: {
                panel: '0 18px 50px -18px rgba(15, 23, 42, 0.28)'
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' }
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(12px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' }
                }
            },
            animation: {
                fadeIn: 'fadeIn 0.25s ease-out',
                slideUp: 'slideUp 0.3s ease-out'
            }
        }
    },
    plugins: []
};
