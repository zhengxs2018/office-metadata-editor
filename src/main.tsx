import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { ThemeProvider } from "@/components/theme-provider.tsx"
import { TooltipProvider } from "@/components/ui/tooltip.tsx"
import { APP_WINDOW_TITLE } from "@/lib/app-config"
import "@/style/base.css"
import "@/style/chrome.css"
import App from "@/App.tsx"

document.title = APP_WINDOW_TITLE

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <TooltipProvider>
        <div className="chrome-window-shell" data-ui-scroll-container>
          <App />
        </div>
      </TooltipProvider>
    </ThemeProvider>
  </StrictMode>,
)
