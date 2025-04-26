import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Create a root element with error boundary
const container = document.getElementById("root");
if (!container) {
  console.error("Root element not found");
} else {
  const root = createRoot(container);
  
  // Add error boundary
  try {
    root.render(<App />);
  } catch (error) {
    console.error("Error rendering application:", error);
    root.render(
      <div className="error-boundary">
        <h1>Something went wrong</h1>
        <p>The application encountered an error. Please try refreshing the page.</p>
        <pre>{error instanceof Error ? error.message : String(error)}</pre>
      </div>
    );
  }
}
