import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom"

import { FileProvider } from "./contexts/file-context"
import { MetadataProvider } from "./contexts/metadata-context"
import { ChromeThemeSync } from "./components/chrome/chrome-theme-sync"
import { ChromePlatformSync } from "./components/chrome/chrome-platform-sync"
import { EditorPage } from "./pages/editor-page"
import { HomePage } from "./pages/home-page"
import { BatchPage } from "./pages/batch-page"
import { ComparePage } from "./pages/compare-page"
import { ROUTES } from "./router/paths"

export default function App() {
  return (
    <FileProvider>
      <BrowserRouter>
        <ChromePlatformSync />
        <ChromeThemeSync />
        <Routes>
          <Route path={ROUTES.home} element={<MetadataLayout />}>
            <Route index element={<HomePage />} />
            <Route path={ROUTES.editor} element={<EditorPage />} />
            <Route path={ROUTES.batch} element={<BatchPage />} />
            <Route path={ROUTES.compare} element={<ComparePage />} />
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
