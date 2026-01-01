import { useState, useCallback, useEffect, useRef } from 'react'
import Toolbar from './components/Toolbar'
import Sidebar from './components/Sidebar'
import MainViewer from './components/MainViewer'
import { loadPdfDocument } from './services/pdfRenderer'
import { loadPdfForManipulation, saveAsNewFile, saveToFile } from './services/pdfManipulator'
import type { PdfDocument, PdfPage } from './types/pdf'
import './index.css'

export default function App() {
  const [documents, setDocuments] = useState<PdfDocument[]>([])
  const [pages, setPages] = useState<PdfPage[]>([])
  const [selectedPageIndex, setSelectedPageIndex] = useState(0)
  const [zoom, setZoom] = useState(1.0)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null)
  const [showSaveWarning, setShowSaveWarning] = useState(false)

  // Track initial page state to detect changes
  const initialPagesRef = useRef<string>('')

  const handleOpenFiles = useCallback(async () => {
    try {
      const filePaths = await window.electronAPI.openFileDialog()
      if (filePaths.length === 0) return

      for (const filePath of filePaths) {
        const data = await window.electronAPI.readFile(filePath)
        const id = crypto.randomUUID()
        const name = filePath.split('/').pop() || filePath.split('\\').pop() || 'Unknown'

        // Create separate ArrayBuffers for each library
        // (PDF.js may transfer its buffer to a worker, detaching it)
        const viewerBuffer = new Uint8Array(data).buffer
        const manipulatorBuffer = new Uint8Array(data).buffer

        // Load for viewing (PDF.js)
        const pdf = await loadPdfDocument(viewerBuffer, id)
        const pageCount = pdf.numPages

        // Load for manipulation (pdf-lib)
        await loadPdfForManipulation(id, manipulatorBuffer)

        const newDoc: PdfDocument = { id, name, path: filePath, pageCount }
        const newPages: PdfPage[] = Array.from({ length: pageCount }, (_, i) => ({
          id: crypto.randomUUID(),
          documentId: id,
          pageIndex: i,
          originalPageIndex: i
        }))

        setDocuments(prev => [...prev, newDoc])
        setPages(prev => {
          const updated = [...prev, ...newPages]
          // Update initial state reference
          initialPagesRef.current = JSON.stringify(updated.map(p => ({
            documentId: p.documentId,
            originalPageIndex: p.originalPageIndex
          })))
          return updated
        })

        // Set current file path for single document
        if (filePaths.length === 1 && documents.length === 0) {
          setCurrentFilePath(filePath)
        } else {
          setCurrentFilePath(null) // Multiple docs = must use Save As
        }
      }

      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('Error opening PDF:', error)
    }
  }, [documents.length])

  // Check for changes whenever pages update
  useEffect(() => {
    if (pages.length === 0) {
      setHasUnsavedChanges(false)
      return
    }

    const currentState = JSON.stringify(pages.map(p => ({
      documentId: p.documentId,
      originalPageIndex: p.originalPageIndex
    })))

    if (initialPagesRef.current && currentState !== initialPagesRef.current) {
      setHasUnsavedChanges(true)
    }
  }, [pages])

  const handleReorder = useCallback((oldIndex: number, newIndex: number) => {
    setPages(prev => {
      const newPages = [...prev]
      const [moved] = newPages.splice(oldIndex, 1)
      newPages.splice(newIndex, 0, moved)
      return newPages
    })
    if (selectedPageIndex === oldIndex) {
      setSelectedPageIndex(newIndex)
    } else if (oldIndex < selectedPageIndex && newIndex >= selectedPageIndex) {
      setSelectedPageIndex(prev => prev - 1)
    } else if (oldIndex > selectedPageIndex && newIndex <= selectedPageIndex) {
      setSelectedPageIndex(prev => prev + 1)
    }
  }, [selectedPageIndex])

  const handleDeletePage = useCallback((index: number) => {
    setPages(prev => {
      if (prev.length <= 1) return prev
      return prev.filter((_, i) => i !== index)
    })
    setSelectedPageIndex(prev => {
      if (prev >= index && prev > 0) return prev - 1
      return prev
    })
  }, [])

  const handleDuplicatePage = useCallback((index: number) => {
    setPages(prev => {
      const newPages = [...prev]
      const duplicate = { ...prev[index], id: crypto.randomUUID() }
      newPages.splice(index + 1, 0, duplicate)
      return newPages
    })
  }, [])

  // Save As - always prompts for new location
  const handleSaveAs = useCallback(async () => {
    if (pages.length === 0) return

    try {
      const success = await saveAsNewFile(pages)
      if (success) {
        setHasUnsavedChanges(false)
        // Update initial state to current
        initialPagesRef.current = JSON.stringify(pages.map(p => ({
          documentId: p.documentId,
          originalPageIndex: p.originalPageIndex
        })))
      }
    } catch (error) {
      console.error('Save As failed:', error)
      alert('Failed to save file. Please try again.')
    }
  }, [pages])

  // Save - overwrites current file (with warning on first save)
  const handleSave = useCallback(async () => {
    if (pages.length === 0) return

    // If multiple documents or no current path, use Save As
    if (documents.length > 1 || !currentFilePath) {
      handleSaveAs()
      return
    }

    // Show warning on first save
    if (!showSaveWarning) {
      const confirmed = window.confirm(
        'This will overwrite the original file. Continue?\n\n' +
        '(Use "Save As" to save to a new location)'
      )
      if (!confirmed) return
      setShowSaveWarning(true) // Don't ask again this session
    }

    try {
      const success = await saveToFile(currentFilePath, pages)
      if (success) {
        setHasUnsavedChanges(false)
        initialPagesRef.current = JSON.stringify(pages.map(p => ({
          documentId: p.documentId,
          originalPageIndex: p.originalPageIndex
        })))
      }
    } catch (error) {
      console.error('Save failed:', error)
      alert('Failed to save file. Please try again.')
    }
  }, [pages, documents.length, currentFilePath, showSaveWarning, handleSaveAs])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + O: Open files
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault()
        handleOpenFiles()
        return
      }

      // Ctrl/Cmd + S: Save
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 's') {
        e.preventDefault()
        handleSave()
        return
      }

      // Ctrl/Cmd + Shift + S: Save As
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 's') {
        e.preventDefault()
        handleSaveAs()
        return
      }

      // Ctrl/Cmd + Plus: Zoom in
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        setZoom(z => Math.min(3, z + 0.25))
        return
      }

      // Ctrl/Cmd + Minus: Zoom out
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault()
        setZoom(z => Math.max(0.25, z - 0.25))
        return
      }

      // Ctrl/Cmd + 0: Reset zoom
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault()
        setZoom(1)
        return
      }

      // Page navigation with arrow keys (when not in input)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      // Ctrl/Cmd + Arrow Up: First page
      if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowUp' && pages.length > 0) {
        e.preventDefault()
        setSelectedPageIndex(0)
        return
      }

      // Ctrl/Cmd + Arrow Down: Last page
      if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowDown' && pages.length > 0) {
        e.preventDefault()
        setSelectedPageIndex(pages.length - 1)
        return
      }

      // Arrow Up: Previous page
      if (e.key === 'ArrowUp' && pages.length > 0) {
        e.preventDefault()
        setSelectedPageIndex(prev => Math.max(0, prev - 1))
        return
      }

      // Arrow Down: Next page
      if (e.key === 'ArrowDown' && pages.length > 0) {
        e.preventDefault()
        setSelectedPageIndex(prev => Math.min(pages.length - 1, prev + 1))
        return
      }

      // Home: First page
      if (e.key === 'Home' && pages.length > 0) {
        e.preventDefault()
        setSelectedPageIndex(0)
        return
      }

      // End: Last page
      if (e.key === 'End' && pages.length > 0) {
        e.preventDefault()
        setSelectedPageIndex(pages.length - 1)
        return
      }

      // Delete or Backspace: Delete selected page
      if ((e.key === 'Delete' || e.key === 'Backspace') && pages.length > 1) {
        e.preventDefault()
        handleDeletePage(selectedPageIndex)
        return
      }

      // Ctrl/Cmd + D: Duplicate selected page
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && pages.length > 0) {
        e.preventDefault()
        handleDuplicatePage(selectedPageIndex)
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleOpenFiles, handleSave, handleSaveAs, handleDeletePage, handleDuplicatePage, pages.length, selectedPageIndex])

  // Get current page info for viewer
  const currentPage = pages[selectedPageIndex]

  // Can use Save (not Save As) only with single document
  const canSave = documents.length === 1 && currentFilePath !== null

  return (
    <div className="app">
      <Toolbar
        hasDocuments={documents.length > 0}
        hasUnsavedChanges={hasUnsavedChanges}
        canSave={canSave}
        zoom={zoom}
        onOpenFiles={handleOpenFiles}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        onZoomChange={setZoom}
      />
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
