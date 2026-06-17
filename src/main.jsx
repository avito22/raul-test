import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Poker from './poker/Poker.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Poker />
  </StrictMode>,
)
