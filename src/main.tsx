import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

void import('./firebase').then(({ analyticsPromise }) => analyticsPromise)

createRoot(document.getElementById('root')!).render(<App />)
