import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';

import { MetadataProvider } from './contexts/metadata-context';
import { FileProvider } from './contexts/file-context';
import { ChromeThemeSync } from './components/chrome/chrome-theme-sync';
import { ChromePlatformSync } from './components/chrome/chrome-platform-sync';
import { Toaster } from './components/ui/sonner';
import { TooltipProvider } from './components/ui/tooltip';
import { EditorPage } from './pages/editor-page';
import { HomePage } from './pages/home-page';
import { BatchPage } from './pages/batch-page';
import { ComparePage } from './pages/compare-page';
import { HiddenPage } from './pages/hidden-page';
import { ROUTES } from './router/paths';

export default function App() {
  return (
    <div className="chrome-window-shell" data-ui-scroll-container>
      <FileProvider>
        <TooltipProvider>
          <BrowserRouter>
            <ChromePlatformSync />
            <ChromeThemeSync />
            <Routes>
              <Route
                path={ROUTES.home}
                element={
                  <MetadataProvider>
                    <Outlet />
                    <Toaster />
                  </MetadataProvider>
                }
              >
                <Route index element={<HomePage />} />
                <Route path={ROUTES.editor} element={<EditorPage />} />
                <Route path={ROUTES.batch} element={<BatchPage />} />
                <Route path={ROUTES.compare} element={<ComparePage />} />
                <Route path={ROUTES.hidden} element={<HiddenPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </FileProvider>
    </div>
  );
}
