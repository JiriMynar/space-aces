import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/krona-one/400.css'
import './index.css'
import './theme-mars.css'
import './tournaments.css'
import './i18n'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
