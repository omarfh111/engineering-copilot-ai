export default {
    darkMode: 'class',
    content: ['./index.html', './src/**/*.{ts,tsx}'],
    theme: {
        extend: {
            colors: {
                brand: {
                    50: '#e6f2f7',
                    100: '#cce5f0',
                    200: '#99cbe0',
                    300: '#66b0d0',
                    400: '#3395c0',
                    500: '#0070AD',
                    600: '#005a8f',
                    700: '#004472',
                    800: '#002e55',
                    900: '#002A54'
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
