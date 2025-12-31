import { useState, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import MainViewer from './components/MainViewer'
import { loadPdfDocument } from './services/pdfRenderer'
import type { PdfDocument, PdfPage } from './types/pdf'
import './index.css'

export default function App() {
  const [documents, setDocuments] = useState<PdfDocument[]>([])
  const [pages, setPages] = useState<PdfPage[]>([])
  const [selectedPageIndex, setSelectedPageIndex] = useState(0)
  const [zoom, setZoom] = useState(1.0)

  const handleOpenFiles = useCallback(async () => {
    try {
      const filePaths = await window.electronAPI.openFileDialog()
      if (filePaths.length === 0) return

      for (const filePath of filePaths) {
        const data = await window.electronAPI.readFile(filePath)
        const id = crypto.randomUUID()
        const name = filePath.split('/').pop() || filePath.split('\\').pop() || 'Unknown'

        const arrayBuffer = new Uint8Array(data).buffer
        const pdf = await loadPdfDocument(arrayBuffer, id)
        const pageCount = pdf.numPages

        const newDoc: PdfDocument = { id, name, path: filePath, pageCount }
        const newPages: PdfPage[] = Array.from({ length: pageCount }, (_, i) => ({
          id: crypto.randomUUID(),
          documentId: id,
          pageIndex: i,
          originalPageIndex: i
        }))

        setDocuments(prev => [...prev, newDoc])
        setPages(prev => [...prev, ...newPages])
      }
    } catch (error) {
      console.error('Error opening PDF:', error)
    }
  }, [])

  const handleReorder = useCallback((oldIndex: number, newIndex: number) => {
    setPages(prev => {
      const newPages = [...prev]
      const [moved] = newPages.splice(oldIndex, 1)
      newPages.splice(newIndex, 0, moved)
      return newPages
    })
    // Adjust selection if needed
    if (selectedPageIndex === oldIndex) {
      setSelectedPageIndex(newIndex)
    } else if (oldIndex < selectedPageIndex && newIndex >= selectedPageIndex) {
      setSelectedPageIndex(prev => prev - 1)
    } else if (oldIndex > selectedPageIndex && newIndex <= selectedPageIndex) {
      setSelectedPageIndex(prev => prev + 1)
    }
  }, [selectedPageIndex])

  const handleDeletePage = useCallback((index: number) => {
    setPages(prev => prev.filter((_, i) => i !== index))
    if (selectedPageIndex >= index && selectedPageIndex > 0) {
      setSelectedPageIndex(prev => prev - 1)
    }
  }, [selectedPageIndex])

  const handleDuplicatePage = useCallback((index: number) => {
    setPages(prev => {
      const newPages = [...prev]
      const duplicate = { ...prev[index], id: crypto.randomUUID() }
      newPages.splice(index + 1, 0, duplicate)
      return newPages
    })
  }, [])

  // Get current page info for viewer
  const currentPage = pages[selectedPageIndex]

  return (
    <div className="app">
      <div className="toolbar">
        <button onClick={handleOpenFiles}>Open PDF</button>
        <span className="zoom-controls">
          <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}>−</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(3, z + 0.25))}>+</button>
        </span>
      </div>
      <div className="main-content">
        <Sidebar
          documents={documents}
          pages={pages}
          selectedPageIndex={selectedPageIndex}
          onPageSelect={setSelectedPageIndex}
          onReorder={handleReorder}
          onDeletePage={handleDeletePage}
          onDuplicatePage={handleDuplicatePage}
        />
        <MainViewer
          documentId={currentPage?.documentId || null}
          pageIndex={currentPage?.originalPageIndex || 0}
          zoom={zoom}
        />
      </div>
    </div>
  )
}
