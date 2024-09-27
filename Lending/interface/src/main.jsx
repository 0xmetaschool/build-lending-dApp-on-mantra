import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { GrazProvider } from "graz";
import { mantraChainConfig } from "./chain.js";
import { ChakraProvider, ColorModeScript } from "@chakra-ui/react";
import theme from './theme.js'; 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <GrazProvider
        grazOptions={{
          chains: [mantraChainConfig],
        }}
      >
        <App />
      </GrazProvider>
    </ChakraProvider>
  </React.StrictMode>,
)