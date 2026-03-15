import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@the-syllabus/analysis-renderers/styles'
import { DesignTokenProvider } from '@the-syllabus/analysis-renderers'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DesignTokenProvider schoolKey="">
      <App />
    </DesignTokenProvider>
  </StrictMode>,
)
