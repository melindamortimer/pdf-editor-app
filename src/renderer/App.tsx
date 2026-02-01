import { useState, useCallback, useEffect, useRef } from 'react'
import Toolbar from './components/Toolbar'
import Sidebar from './components/Sidebar'
import MainViewer from './components/MainViewer'
import { loadPdfDocument, clearAllDocuments } from './services/pdfRenderer'
import { loadPdfForManipulation, saveAsNewFile, saveToFile, clearAllPdfCache } from './services/pdfManipulator'
import { useAnnotations } from './hooks/useAnnotations'
import type { PdfDocument, PdfPage } from './types/pdf'
import './index.css'

// Type for unified history entries
type HistoryEntry =
  | { type: 'pages'; pages: PdfPage[]; selectedIndex: number }
  | { type: 'annotations' }

const MAX_PAGE_HISTORY = 50

// Serialize page state for change detection
const serializePageState = (pageList: PdfPage[]) =>
  JSON.stringify(pageList.map(p => ({ documentId: p.documentId, originalPageIndex: p.originalPageIndex })))

export default function App() {
  const [documents, setDocuments] = useState<PdfDocument[]>([])
  const [pages, setPages] = useState<PdfPage[]>([])
  const [selectedPageIndex, setSelectedPageIndex] = useState(0)
  const [selectedPageIndices, setSelectedPageIndices] = useState<Set<number>>(new Set([0]))
  const [copiedPages, setCopiedPages] = useState<PdfPage[]>([])
  const [zoom, setZoom] = useState(1.0)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null)
  const [showSaveWarning, setShowSaveWarning] = useState(false)

  // Unified history for undo/redo (tracks both page and annotation operations)
  const [historyStack, setHistoryStack] = useState<HistoryEntry[]>([])
  const [futureStack, setFutureStack] = useState<HistoryEntry[]>([])

  // Track initial page state to detect changes
  const initialPagesRef = useRef<string>('')

  // Annotation state
  const {
    annotations,
    selectedAnnotationIds,
    currentTool,
    toolSettings,
    canUndo,
    canRedo,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    selectAnnotation,
    clearSelection,
    setCurrentTool,
    updateToolSettings,
    getAnnotationsForPage,
    undo,
    redo,
    discardAllAnnotations,
    bringToFront,
    sendToBack,
    bringForward,
    sendBackward
  } = useAnnotations()

  // Wrapped setCurrentTool that clears selection when switching to drawing tools
  const handleToolChange = useCallback((tool: typeof currentTool) => {
    // Clear selection when switching to tools other than select or box
    if (tool !== 'select' && tool !== 'box') {
      selectAnnotation(null)
    }
    setCurrentTool(tool)
  }, [selectAnnotation, setCurrentTool])

  // Load a single PDF file and return its document/pages data
  const loadPdfFile = useCallback(async (filePath: string): Promise<{ doc: PdfDocument; pages: PdfPage[] }> => {
    const data = await window.electronAPI.readFile(filePath)
    const id = crypto.randomUUID()
    const name = filePath.split('/').pop() || filePath.split('\\').pop() || 'Unknown'

    // Create separate ArrayBuffers for each library
    // (PDF.js may transfer its buffer to a worker, detaching it)
    const viewerBuffer = new Uint8Array(data).buffer
    const manipulatorBuffer = new Uint8Array(data).buffer

    const pdf = await loadPdfDocument(viewerBuffer, id)
    await loadPdfForManipulation(id, manipulatorBuffer)

    const doc: PdfDocument = { id, name, path: filePath, pageCount: pdf.numPages }
    const pages: PdfPage[] = Array.from({ length: pdf.numPages }, (_, i) => ({
      id: crypto.randomUUID(),
      documentId: id,
      pageIndex: i,
      originalPageIndex: i
    }))

    return { doc, pages }
  }, [])

  const handleOpenFiles = useCallback(async () => {
    try {
      const filePaths = await window.electronAPI.openFileDialog()
      if (filePaths.length === 0) return

      for (const filePath of filePaths) {
        const { doc: newDoc, pages: newPages } = await loadPdfFile(filePath)

        setDocuments(prev => [...prev, newDoc])
        setPages(prev => {
          const updated = [...prev, ...newPages]
          initialPagesRef.current = serializePageState(updated)
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

      // Blur any focused button so space key works for panning
      ;(document.activeElement as HTMLElement)?.blur?.()
    } catch (error) {
      console.error('Error opening PDF:', error)
    }
  }, [documents.length, loadPdfFile])

  const handleCloseDocument = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to close?'
      )
      if (!confirmed) return
    }

    // Clear all caches
    clearAllDocuments()
    clearAllPdfCache()

    // Reset all state
    setDocuments([])
    setPages([])
    setSelectedPageIndex(0)
    setSelectedPageIndices(new Set([0]))
    setCopiedPages([])
    setZoom(1.0)
    setHasUnsavedChanges(false)
    setCurrentFilePath(null)
    setShowSaveWarning(false)
    setHistoryStack([])
    setFutureStack([])
    initialPagesRef.current = ''

    // Discard all annotations
    discardAllAnnotations()
  }, [hasUnsavedChanges, discardAllAnnotations])

  // Check for changes whenever pages update
  useEffect(() => {
    if (pages.length === 0) {
      setHasUnsavedChanges(false)
      return
    }

    const currentState = serializePageState(pages)

    if (initialPagesRef.current && currentState !== initialPagesRef.current) {
      setHasUnsavedChanges(true)
    }
  }, [pages])

  // Push current page state to history before making changes
  const pushPageToHistory = useCallback(() => {
    setHistoryStack(prev => {
      const newHistory = [...prev, { type: 'pages' as const, pages, selectedIndex: selectedPageIndex }]
      if (newHistory.length > MAX_PAGE_HISTORY) {
        return newHistory.slice(-MAX_PAGE_HISTORY)
      }
      return newHistory
    })
    setFutureStack([])
  }, [pages, selectedPageIndex])

  const handleReorder = useCallback((oldIndex: number, newIndex: number) => {
    pushPageToHistory()
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
  }, [selectedPageIndex, pushPageToHistory])

  const handleDeletePage = useCallback((index: number) => {
    if (pages.length <= 1) return
    pushPageToHistory()
    setPages(prev => prev.filter((_, i) => i !== index))
    setSelectedPageIndex(prev => {
      if (prev >= index && prev > 0) return prev - 1
      return prev
    })
  }, [pages.length, pushPageToHistory])

  const handleDuplicatePage = useCallback((index: number) => {
    pushPageToHistory()
    setPages(prev => {
      const newPages = [...prev]
      const duplicate = { ...prev[index], id: crypto.randomUUID() }
      newPages.splice(index + 1, 0, duplicate)
      return newPages
    })
  }, [pushPageToHistory])

  // Handle page selection with optional shift for multi-select
  const handlePageSelect = useCallback((index: number, shiftKey: boolean) => {
    if (shiftKey && pages.length > 0) {
      // Range selection from current selected to clicked
      const start = Math.min(selectedPageIndex, index)
      const end = Math.max(selectedPageIndex, index)
      const newSelection = new Set<number>()
      for (let i = start; i <= end; i++) {
        newSelection.add(i)
      }
      setSelectedPageIndices(newSelection)
    } else {
      // Single selection
      setSelectedPageIndices(new Set([index]))
    }
    setSelectedPageIndex(index)
  }, [selectedPageIndex, pages.length])

  // Copy selected pages
  const handleCopyPages = useCallback(() => {
    if (selectedPageIndices.size === 0) return
    const sortedIndices = Array.from(selectedPageIndices).sort((a, b) => a - b)
    const pagesToCopy = sortedIndices.map(i => pages[i]).filter(Boolean)
    setCopiedPages(pagesToCopy)
  }, [selectedPageIndices, pages])

  // Paste copied pages after the current selection
  const handlePastePages = useCallback(() => {
    if (copiedPages.length === 0) return
    pushPageToHistory()

    // Find the last selected index to paste after
    const sortedIndices = Array.from(selectedPageIndices).sort((a, b) => a - b)
    const insertAfter = sortedIndices.length > 0 ? sortedIndices[sortedIndices.length - 1] : selectedPageIndex

    // Create new pages with new IDs
    const newPages = copiedPages.map(p => ({
      ...p,
      id: crypto.randomUUID()
    }))

    setPages(prev => {
      const updated = [...prev]
      updated.splice(insertAfter + 1, 0, ...newPages)
      return updated
    })

    // Select the pasted pages
    const newIndices = new Set<number>()
    for (let i = 0; i < newPages.length; i++) {
      newIndices.add(insertAfter + 1 + i)
    }
    setSelectedPageIndices(newIndices)
    setSelectedPageIndex(insertAfter + 1)
  }, [copiedPages, selectedPageIndices, selectedPageIndex, pushPageToHistory])

  // Reset state and reload a file after saving
  const resetAndReloadFile = useCallback(async (filePath: string): Promise<void> => {
    clearAllPdfCache()
    setDocuments([])
    setPages([])
    discardAllAnnotations()
    setHistoryStack([])
    setFutureStack([])
    setSelectedPageIndex(0)
    setSelectedPageIndices(new Set([0]))
    setCopiedPages([])

    const { doc, pages: newPages } = await loadPdfFile(filePath)
    setDocuments([doc])
    setPages(newPages)
    initialPagesRef.current = serializePageState(newPages)
    setCurrentFilePath(filePath)
    setHasUnsavedChanges(false)

    // Blur any focused button so space key works for panning
    ;(document.activeElement as HTMLElement)?.blur?.()
  }, [loadPdfFile, discardAllAnnotations])

  // Save As - always prompts for new location
  const handleSaveAs = useCallback(async () => {
    if (pages.length === 0) return

    try {
      const savedPath = await saveAsNewFile(pages, annotations)
      if (savedPath) {
        setShowSaveWarning(false)
        await resetAndReloadFile(savedPath)
      }
    } catch (error) {
      console.error('Save As failed:', error)
      alert('Failed to save file. Please try again.')
    }
  }, [pages, annotations, resetAndReloadFile])

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
        'This will overwrite the original file and bake all annotations permanently. Continue?\n\n' +
        '(Use "Save As" to save to a new location)'
      )
      if (!confirmed) return
      setShowSaveWarning(true)
    }

    try {
      const success = await saveToFile(currentFilePath, pages, annotations)
      if (success) {
        await resetAndReloadFile(currentFilePath)
        setShowSaveWarning(true) // Keep the warning state for this file
      }
    } catch (error) {
      console.error('Save failed:', error)
      alert('Failed to save file. Please try again.')
    }
  }, [pages, documents.length, currentFilePath, showSaveWarning, annotations, resetAndReloadFile, handleSaveAs])

  // Page undo - restores previous page state from history stack
  const pageUndo = useCallback((entry: HistoryEntry & { type: 'pages' }) => {
    setFutureStack(prev => [{ type: 'pages', pages, selectedIndex: selectedPageIndex }, ...prev])
    setPages(entry.pages)
    setSelectedPageIndex(entry.selectedIndex)
  }, [pages, selectedPageIndex])

  // Page redo - restores next page state from future stack
  const pageRedo = useCallback((entry: HistoryEntry & { type: 'pages' }) => {
    setHistoryStack(prev => [...prev, { type: 'pages', pages, selectedIndex: selectedPageIndex }])
    setPages(entry.pages)
    setSelectedPageIndex(entry.selectedIndex)
  }, [pages, selectedPageIndex])

  // Wrapped annotation functions that track in unified history
  const wrappedAddAnnotation = useCallback((annotation: Parameters<typeof addAnnotation>[0]) => {
    setHistoryStack(prev => [...prev, { type: 'annotations' }])
    setFutureStack([])
    setHasUnsavedChanges(true)
    addAnnotation(annotation)
  }, [addAnnotation])

  const wrappedUpdateAnnotation = useCallback((id: string, updates: Parameters<typeof updateAnnotation>[1]) => {
    setHistoryStack(prev => [...prev, { type: 'annotations' }])
    setFutureStack([])
    setHasUnsavedChanges(true)
    updateAnnotation(id, updates)
  }, [updateAnnotation])

  const wrappedDeleteAnnotation = useCallback((id: string) => {
    setHistoryStack(prev => [...prev, { type: 'annotations' }])
    setFutureStack([])
    setHasUnsavedChanges(true)
    deleteAnnotation(id)
  }, [deleteAnnotation])

  // Wrapped layer ordering functions
  const wrappedBringToFront = useCallback((id: string) => {
    setHistoryStack(prev => [...prev, { type: 'annotations' }])
    setFutureStack([])
    bringToFront(id)
  }, [bringToFront])

  const wrappedSendToBack = useCallback((id: string) => {
    setHistoryStack(prev => [...prev, { type: 'annotations' }])
    setFutureStack([])
    sendToBack(id)
  }, [sendToBack])

  const wrappedBringForward = useCallback((id: string) => {
    setHistoryStack(prev => [...prev, { type: 'annotations' }])
    setFutureStack([])
    bringForward(id)
  }, [bringForward])

  const wrappedSendBackward = useCallback((id: string) => {
    setHistoryStack(prev => [...prev, { type: 'annotations' }])
    setFutureStack([])
    sendBackward(id)
  }, [sendBackward])

  // Unified undo - checks history stack to determine what to undo
  const unifiedUndo = useCallback(() => {
    if (historyStack.length === 0) return

    const lastEntry = historyStack[historyStack.length - 1]
    setHistoryStack(prev => prev.slice(0, -1))

    if (lastEntry.type === 'pages') {
      pageUndo(lastEntry)
    } else {
      // Annotation undo
      if (canUndo) {
        undo()
        setFutureStack(prev => [lastEntry, ...prev])
      }
    }
  }, [historyStack, pageUndo, canUndo, undo])

  // Unified redo - checks future stack to determine what to redo
  const unifiedRedo = useCallback(() => {
    if (futureStack.length === 0) return

    const nextEntry = futureStack[0]
    setFutureStack(prev => prev.slice(1))

    if (nextEntry.type === 'pages') {
      pageRedo(nextEntry)
    } else {
      // Annotation redo
      if (canRedo) {
        redo()
        setHistoryStack(prev => [...prev, nextEntry])
      }
    }
  }, [futureStack, pageRedo, canRedo, redo])

  // Combined undo/redo availability
  const combinedCanUndo = historyStack.length > 0
  const combinedCanRedo = futureStack.length > 0

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + O: Open files
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault()
        handleOpenFiles()
        return
      }

      // Ctrl/Cmd + W: Close window
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault()
        window.electronAPI.closeWindow()
        return
      }

      // Ctrl/Cmd + Q: Quit app
      if ((e.ctrlKey || e.metaKey) && e.key === 'q') {
        e.preventDefault()
        window.electronAPI.quitApp()
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

      // Ctrl/Cmd + Z: Undo
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault()
        unifiedUndo()
        return
      }

      // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y: Redo
      if ((e.ctrlKey || e.metaKey) && (e.shiftKey && e.key === 'z' || e.key === 'y')) {
        e.preventDefault()
        unifiedRedo()
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
        setSelectedPageIndices(new Set([0]))
        return
      }

      // Ctrl/Cmd + Arrow Down: Last page
      if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowDown' && pages.length > 0) {
        e.preventDefault()
        setSelectedPageIndex(pages.length - 1)
        setSelectedPageIndices(new Set([pages.length - 1]))
        return
      }

      // Arrow Up: Previous page (with shift for extend selection)
      if (e.key === 'ArrowUp' && pages.length > 0) {
        e.preventDefault()
        const newIndex = Math.max(0, selectedPageIndex - 1)
        setSelectedPageIndex(newIndex)
        if (e.shiftKey) {
          setSelectedPageIndices(prev => new Set([...prev, newIndex]))
        } else {
          setSelectedPageIndices(new Set([newIndex]))
        }
        return
      }

      // Arrow Down: Next page (with shift for extend selection)
      if (e.key === 'ArrowDown' && pages.length > 0) {
        e.preventDefault()
        const newIndex = Math.min(pages.length - 1, selectedPageIndex + 1)
        setSelectedPageIndex(newIndex)
        if (e.shiftKey) {
          setSelectedPageIndices(prev => new Set([...prev, newIndex]))
        } else {
          setSelectedPageIndices(new Set([newIndex]))
        }
        return
      }

      // Home: First page
      if (e.key === 'Home' && pages.length > 0) {
        e.preventDefault()
        setSelectedPageIndex(0)
        setSelectedPageIndices(new Set([0]))
        return
      }

      // End: Last page
      if (e.key === 'End' && pages.length > 0) {
        e.preventDefault()
        setSelectedPageIndex(pages.length - 1)
        setSelectedPageIndices(new Set([pages.length - 1]))
        return
      }

      // Delete or Backspace: Delete selected annotations, or page if no annotation selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        // If annotations are selected, delete them all
        if (selectedAnnotationIds.size > 0) {
          selectedAnnotationIds.forEach(id => wrappedDeleteAnnotation(id))
          return
        }
        // Otherwise delete selected page (if more than one page)
        if (pages.length > 1) {
          handleDeletePage(selectedPageIndex)
        }
        return
      }

      // Ctrl/Cmd + D: Duplicate selected page
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && pages.length > 0) {
        e.preventDefault()
        handleDuplicatePage(selectedPageIndex)
        return
      }

      // Ctrl/Cmd + C: Copy selected pages
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && pages.length > 0) {
        e.preventDefault()
        handleCopyPages()
        return
      }

      // Ctrl/Cmd + V: Paste copied pages
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && copiedPages.length > 0) {
        e.preventDefault()
        handlePastePages()
        return
      }

      // Escape: Deselect annotation (stay on current tool)
      if (e.key === 'Escape') {
        e.preventDefault()
        selectAnnotation(null)
        return
      }

      // Tool shortcuts (single keys, no modifiers)
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case 's':
            e.preventDefault()
            handleToolChange('select')
            return
          case 'h':
            e.preventDefault()
            handleToolChange('highlight')
            return
          case 'u':
            e.preventDefault()
            handleToolChange('underline')
            return
          case 'k':
            e.preventDefault()
            handleToolChange('strikethrough')
            return
          case 'b':
            e.preventDefault()
            handleToolChange('box')
            return
          case 'p':
            e.preventDefault()
            handleToolChange('pen')
            return
          case 't':
            e.preventDefault()
            handleToolChange('text')
            return
          case 'e':
            e.preventDefault()
            handleToolChange('eraser')
            return
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleOpenFiles, handleCloseDocument, handleSave, handleSaveAs, handleDeletePage, handleDuplicatePage, handleCopyPages, handlePastePages, pages.length, copiedPages.length, selectedPageIndex, selectedAnnotationIds, wrappedDeleteAnnotation, unifiedUndo, unifiedRedo, selectAnnotation, handleToolChange])

  // Ctrl+Mouse Wheel zoom
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        // deltaY negative = scroll up = zoom in, positive = scroll down = zoom out
        if (e.deltaY < 0) {
          setZoom(z => Math.min(3, z + 0.1))
        } else {
          setZoom(z => Math.max(0.25, z - 0.1))
        }
      }
    }

    // Use passive: false to allow preventDefault
    window.addEventListener('wheel', handleWheel, { passive: false })
    return () => window.removeEventListener('wheel', handleWheel)
  }, [])

  // Update window title when documents change
  useEffect(() => {
    if (documents.length > 0) {
      window.electronAPI.setWindowTitle(documents[0].name)
    } else {
      window.electronAPI.setWindowTitle('Documint')
    }
  }, [documents])

  // Check for initial files to open (when app opened via file association)
  useEffect(() => {
    async function checkInitialFiles(): Promise<void> {
      try {
        const filePaths = await window.electronAPI.getInitialFiles()
        if (!filePaths || filePaths.length === 0) return

        const allDocs: PdfDocument[] = []
        const allPages: PdfPage[] = []

        for (const filePath of filePaths) {
          const { doc, pages: newPages } = await loadPdfFile(filePath)
          allDocs.push(doc)
          allPages.push(...newPages)
        }

        setDocuments(allDocs)
        setPages(allPages)
        initialPagesRef.current = serializePageState(allPages)
        // Single file = can use Save, multiple = must use Save As
        setCurrentFilePath(filePaths.length === 1 ? filePaths[0] : null)
        setHasUnsavedChanges(false)
      } catch (error) {
        console.error('Error loading initial files:', error)
      }
    }

    checkInitialFiles()
  }, [loadPdfFile])

  // Get current page info for viewer
  const currentPage = pages[selectedPageIndex]

  // Can use Save (not Save As) only with single document
  const canSave = documents.length === 1 && currentFilePath !== null

  // Get selected annotations to determine type (for showing tool options)
  // Use first selected annotation to determine which tool options to show
  const selectedAnnotations = annotations.filter(a => selectedAnnotationIds.has(a.id))
  const firstSelectedAnnotation = selectedAnnotations[0] || null
  const selectedAnnotationType: 'box' | 'text' | 'pen' | null =
    firstSelectedAnnotation?.type === 'box' ? 'box' :
    firstSelectedAnnotation?.type === 'text' ? 'text' :
    firstSelectedAnnotation?.type === 'pen' ? 'pen' : null

  // Handler for box color changes - updates all selected boxes
  const handleBoxColorChange = useCallback((color: string) => {
    updateToolSettings({ boxColor: color })
    selectedAnnotations.filter(a => a.type === 'box').forEach(a => {
      wrappedUpdateAnnotation(a.id, { color })
    })
  }, [selectedAnnotations, updateToolSettings, wrappedUpdateAnnotation])

  const handleBoxFillColorChange = useCallback((color: string) => {
    updateToolSettings({ boxFillColor: color })
    selectedAnnotations.filter(a => a.type === 'box').forEach(a => {
      wrappedUpdateAnnotation(a.id, { fillColor: color })
    })
  }, [selectedAnnotations, updateToolSettings, wrappedUpdateAnnotation])

  const handleBoxThicknessChange = useCallback((thickness: typeof toolSettings.boxThickness) => {
    updateToolSettings({ boxThickness: thickness })
    selectedAnnotations.filter(a => a.type === 'box').forEach(a => {
      wrappedUpdateAnnotation(a.id, { thickness })
    })
  }, [selectedAnnotations, updateToolSettings, wrappedUpdateAnnotation])

  // Handler for pen color/width changes - updates all selected pens
  const handlePenColorChange = useCallback((color: string) => {
    updateToolSettings({ penColor: color })
    selectedAnnotations.filter(a => a.type === 'pen').forEach(a => {
      wrappedUpdateAnnotation(a.id, { color })
    })
  }, [selectedAnnotations, updateToolSettings, wrappedUpdateAnnotation])

  const handlePenWidthChange = useCallback((strokeWidth: typeof toolSettings.penWidth) => {
    updateToolSettings({ penWidth: strokeWidth })
    selectedAnnotations.filter(a => a.type === 'pen').forEach(a => {
      wrappedUpdateAnnotation(a.id, { strokeWidth })
    })
  }, [selectedAnnotations, updateToolSettings, wrappedUpdateAnnotation])

  // Handler for text font changes - updates all selected text annotations
  const handleTextFontChange = useCallback((font: typeof toolSettings.textFont) => {
    updateToolSettings({ textFont: font })
    selectedAnnotations.filter(a => a.type === 'text').forEach(a => {
      wrappedUpdateAnnotation(a.id, { font })
    })
  }, [selectedAnnotations, updateToolSettings, wrappedUpdateAnnotation])

  const handleTextSizeChange = useCallback((fontSize: number) => {
    updateToolSettings({ textSize: fontSize })
    selectedAnnotations.filter(a => a.type === 'text').forEach(a => {
      wrappedUpdateAnnotation(a.id, { fontSize })
    })
  }, [selectedAnnotations, updateToolSettings, wrappedUpdateAnnotation])

  const handleTextColorChange = useCallback((color: string) => {
    updateToolSettings({ textColor: color })
    selectedAnnotations.filter(a => a.type === 'text').forEach(a => {
      wrappedUpdateAnnotation(a.id, { color })
    })
  }, [selectedAnnotations, updateToolSettings, wrappedUpdateAnnotation])

  return (
    <div className="app">
      <Toolbar
        hasDocuments={documents.length > 0}
        hasUnsavedChanges={hasUnsavedChanges}
        canSave={canSave}
        zoom={zoom}
        currentTool={currentTool}
        highlightColor={toolSettings.highlightColor}
        lineColor={toolSettings.lineColor}
        boxColor={toolSettings.boxColor}
        boxFillColor={toolSettings.boxFillColor}
        boxThickness={toolSettings.boxThickness}
        penColor={toolSettings.penColor}
        penWidth={toolSettings.penWidth}
        textFont={toolSettings.textFont}
        textSize={toolSettings.textSize}
        textColor={toolSettings.textColor}
        selectedAnnotationType={selectedAnnotationType}
        canUndo={combinedCanUndo}
        canRedo={combinedCanRedo}
        onOpenFiles={handleOpenFiles}
        onCloseDocument={handleCloseDocument}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        onZoomChange={setZoom}
        onToolChange={handleToolChange}
        onHighlightColorChange={(color) => updateToolSettings({ highlightColor: color })}
        onLineColorChange={(color) => updateToolSettings({ lineColor: color })}
        onBoxColorChange={handleBoxColorChange}
        onBoxFillColorChange={handleBoxFillColorChange}
        onBoxThicknessChange={handleBoxThicknessChange}
        onPenColorChange={handlePenColorChange}
        onPenWidthChange={handlePenWidthChange}
        onTextFontChange={handleTextFontChange}
        onTextSizeChange={handleTextSizeChange}
        onTextColorChange={handleTextColorChange}
        onUndo={unifiedUndo}
        onRedo={unifiedRedo}
        onDiscardAnnotations={discardAllAnnotations}
      />
      <div className="main-content">
        <Sidebar
          documents={documents}
          pages={pages}
          selectedPageIndex={selectedPageIndex}
          selectedPageIndices={selectedPageIndices}
          onPageSelect={handlePageSelect}
          onReorder={handleReorder}
          onDeletePage={handleDeletePage}
          onDuplicatePage={handleDuplicatePage}
        />
        <MainViewer
          documentId={currentPage?.documentId || null}
          pageId={currentPage?.id || null}
          pageIndex={currentPage?.originalPageIndex || 0}
          zoom={zoom}
          annotations={currentPage ? getAnnotationsForPage(currentPage.id) : []}
          selectedAnnotationIds={selectedAnnotationIds}
          currentTool={currentTool}
          highlightColor={toolSettings.highlightColor}
          lineColor={toolSettings.lineColor}
          boxColor={toolSettings.boxColor}
          boxFillColor={toolSettings.boxFillColor}
          boxThickness={toolSettings.boxThickness}
          penColor={toolSettings.penColor}
          penWidth={toolSettings.penWidth}
          textColor={toolSettings.textColor}
          textFont={toolSettings.textFont}
          textSize={toolSettings.textSize}
          onAddAnnotation={wrappedAddAnnotation}
          onUpdateAnnotation={wrappedUpdateAnnotation}
          onDeleteAnnotation={wrappedDeleteAnnotation}
          onSelectAnnotation={selectAnnotation}
          onToolChange={handleToolChange}
          onZoomChange={setZoom}
          onBringToFront={wrappedBringToFront}
          onSendToBack={wrappedSendToBack}
          onBringForward={wrappedBringForward}
          onSendBackward={wrappedSendBackward}
        />
      </div>
    </div>
  )
}
