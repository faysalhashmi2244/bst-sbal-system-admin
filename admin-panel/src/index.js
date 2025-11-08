import React from 'react';
import ReactDOM from 'react-dom/client';
import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import App from './App';

// Extend the Chakra UI theme for custom styling
const theme = extendTheme({
  colors: {
    brand: {
      50: '#e5f5ff',
      100: '#b8e0ff',
      200: '#8acbff',
      300: '#5cb6ff',
      400: '#2ea1ff',
      500: '#1488e6',
      600: '#0c6ab4',
      700: '#064c82',
      800: '#012e50',
      900: '#001020',
    },
  },
  fonts: {
    heading: '"Inter", sans-serif',
    body: '"Inter", sans-serif',
  },
  styles: {
    global: {
      body: {
        bg: 'gray.50',
      },
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <App />
    </ChakraProvider>
  </React.StrictMode>
);