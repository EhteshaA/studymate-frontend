import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import { ChakraProvider, extendTheme } from '@chakra-ui/react';

// Professional Blue Theme to match the color scheme you showed
const theme = extendTheme({
  colors: {
    brand: {
      50: "#f8f9fa",   // Very light gray background
      100: "#ecf0f1",  // Light gray for cards/sections
      200: "#bdc3c7",  // Medium gray
      300: "#95a5a6",  // Gray text
      400: "#7f8c8d",  // Darker gray
      500: "#34495e",  // Dark blue-gray
      600: "#2c3e50",  // Main dark blue (header/footer)
      700: "#2980b9",  // Hover blue
      800: "#3498db",  // Primary blue (buttons)
      900: "#1a252f",  // Darkest blue
    },
    // Custom button colors
    blue: {
      400: "#3498db",  // Primary button color
      500: "#2980b9",  // Button hover color
      600: "#2471a3",  // Button active color
    },
    red: {
      400: "#e74c3c",  // Stop button color
      500: "#c0392b",  // Stop button hover
      600: "#a93226",  // Stop button active
    }
  },
  shadows: {
    sm: "0px 1px 3px rgba(0, 0, 0, 0.1)",
    md: "0px 4px 6px rgba(0, 0, 0, 0.1)",
    lg: "0px 8px 15px rgba(0, 0, 0, 0.1)",
    xl: "0px 15px 35px rgba(0, 0, 0, 0.1)",
  },
  fonts: {
    heading: "Inter, sans-serif",
    body: "Inter, sans-serif",
    cursive: "'Dancing Script', cursive",
  },
  styles: {
    global: {
      body: {
        bg: "#f8f9fa",
        color: "#2c3e50",
      },
    },
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: "medium",
        borderRadius: "full",
      },
      variants: {
        solid: {
          bg: "blue.400",
          color: "white",
          _hover: {
            bg: "blue.500",
          },
          _active: {
            bg: "blue.600",
          },
        },
      },
    },
    Link: {
      baseStyle: {
        fontWeight: "medium",
        _hover: {
          textDecoration: "none",
        },
      },
    },
  },
});

// React 17 rendering method
ReactDOM.render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <App />
    </ChakraProvider>
  </React.StrictMode>,
  document.getElementById('root')
);