
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { FinanceProvider } from './contexts/FinanceContext.tsx'

createRoot(document.getElementById("root")!).render(
  <FinanceProvider>
    <App />
  </FinanceProvider>
);
