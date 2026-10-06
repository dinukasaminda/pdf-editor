import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { HomePage } from './pages/HomePage'
import { PdfEditorPage } from './pages/PdfEditorPage'
import { PhotoBlurPage } from './pages/PhotoBlurPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="pdf" element={<PdfEditorPage />} />
          <Route path="photo-blur" element={<PhotoBlurPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
