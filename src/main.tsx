import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// App provides its own context providers (see App.tsx), so main only mounts it.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
