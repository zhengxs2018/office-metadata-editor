import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom"

import { FileProvider } from "./contexts/file-context"
import { MetadataProvider } from "./contexts/metadata-context"
import { ChromeThemeSync } from "./components/chrome/chrome-theme-sync"
import { EditorPage } from "./pages/editor-page"
import { HomePage } from "./pages/home-page"
import { BatchPage } from "./pages/batch-page"
import { TemplatePage } from "./pages/template-page"
import { ServerPage } from "./pages/server-page"

export default function App() {
  return (
    <FileProvider>
      <BrowserRouter>
        <ChromeThemeSync />
        <Routes>
          <Route path="/" element={<MetadataLayout />}>
            <Route index element={<HomePage />} />
            <Route path="editor" element={<EditorPage />} />
            <Route path="/batch" element={<BatchPage />} />
            <Route path="/templates" element={<TemplatePage />} />
            <Route path="/server" element={<ServerPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </FileProvider>
  )
}

const MetadataLayout = () => {
  return (
    <MetadataProvider>
      <Outlet />
    </MetadataProvider>
  )
}
