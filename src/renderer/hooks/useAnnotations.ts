import { useState, useCallback } from 'react'
import type {
  Annotation,
  AnnotationTool,
  HighlightColor,
  BoxThickness,
  TextFont
} from '../types/annotations'
import {
  DEFAULT_LINE_COLOR,
  DEFAULT_BOX_COLOR,
  DEFAULT_BOX_FILL_COLOR,
  DEFAULT_HIGHLIGHT_COLOR,
  DEFAULT_BOX_THICKNESS,
  DEFAULT_TEXT_FONT,
  DEFAULT_TEXT_SIZE
} from '../types/annotations'

export interface AnnotationToolSettings {
  highlightColor: HighlightColor
  lineColor: string
  boxColor: string
  boxFillColor: string
  boxThickness: BoxThickness
  textColor: string
  textFont: TextFont
  textSize: number
}

export interface UseAnnotationsReturn {
  annotations: Annotation[]
  selectedAnnotationId: string | null
  currentTool: AnnotationTool
  toolSettings: AnnotationToolSettings
  canUndo: boolean
  canRedo: boolean
  addAnnotation: (annotation: Annotation) => void
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void
  deleteAnnotation: (id: string) => void
  selectAnnotation: (id: string | null) => void
  setCurrentTool: (tool: AnnotationTool) => void
  updateToolSettings: (updates: Partial<AnnotationToolSettings>) => void
  getAnnotationsForPage: (pageId: string) => Annotation[]
  clearAnnotationsForPage: (pageId: string) => void
  undo: () => void
  redo: () => void
  discardAllAnnotations: () => void
}

const MAX_HISTORY = 50 // Limit history to prevent memory issues

export function useAnnotations(): UseAnnotationsReturn {
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [history, setHistory] = useState<Annotation[][]>([])
  const [future, setFuture] = useState<Annotation[][]>([])
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null)
  const [currentTool, setCurrentTool] = useState<AnnotationTool>('select')
  const [toolSettings, setToolSettings] = useState<AnnotationToolSettings>({
    highlightColor: DEFAULT_HIGHLIGHT_COLOR,
    lineColor: DEFAULT_LINE_COLOR,
    boxColor: DEFAULT_BOX_COLOR,
    boxFillColor: DEFAULT_BOX_FILL_COLOR,
    boxThickness: DEFAULT_BOX_THICKNESS,
    textColor: '#000000',
    textFont: DEFAULT_TEXT_FONT,
    textSize: DEFAULT_TEXT_SIZE
  })

  // Push current state to history before making changes
  const pushToHistory = useCallback((currentAnnotations: Annotation[]) => {
    setHistory(prev => {
      const newHistory = [...prev, currentAnnotations]
      // Limit history size
      if (newHistory.length > MAX_HISTORY) {
        return newHistory.slice(-MAX_HISTORY)
      }
      return newHistory
    })
    // Clear future when new action is taken
    setFuture([])
  }, [])

  const addAnnotation = useCallback((annotation: Annotation) => {
    setAnnotations(prev => {
      pushToHistory(prev)
      return [...prev, annotation]
    })
  }, [pushToHistory])

  const updateAnnotation = useCallback((id: string, updates: Partial<Annotation>) => {
    setAnnotations(prev => {
      pushToHistory(prev)
      return prev.map(ann =>
        ann.id === id ? { ...ann, ...updates } as Annotation : ann
      )
    })
  }, [pushToHistory])

  const deleteAnnotation = useCallback((id: string) => {
    setAnnotations(prev => {
      pushToHistory(prev)
      return prev.filter(ann => ann.id !== id)
    })
    setSelectedAnnotationId(prev => (prev === id ? null : prev))
  }, [pushToHistory])

  const selectAnnotation = useCallback((id: string | null) => {
    setSelectedAnnotationId(id)
  }, [])

  const updateToolSettings = useCallback((updates: Partial<AnnotationToolSettings>) => {
    setToolSettings(prev => ({ ...prev, ...updates }))
  }, [])

  const getAnnotationsForPage = useCallback(
    (pageId: string) => annotations.filter(ann => ann.pageId === pageId),
    [annotations]
  )

  const clearAnnotationsForPage = useCallback((pageId: string) => {
    setAnnotations(prev => {
      pushToHistory(prev)
      return prev.filter(ann => ann.pageId !== pageId)
    })
  }, [pushToHistory])

  const undo = useCallback(() => {
    if (history.length === 0) return

    const previousState = history[history.length - 1]
    setHistory(prev => prev.slice(0, -1))
    setFuture(prev => [annotations, ...prev])
    setAnnotations(previousState)
    setSelectedAnnotationId(null)
  }, [history, annotations])

  const redo = useCallback(() => {
    if (future.length === 0) return

    const nextState = future[0]
    setFuture(prev => prev.slice(1))
    setHistory(prev => [...prev, annotations])
    setAnnotations(nextState)
    setSelectedAnnotationId(null)
  }, [future, annotations])

  const discardAllAnnotations = useCallback(() => {
    if (annotations.length === 0) return
    pushToHistory(annotations)
    setAnnotations([])
    setSelectedAnnotationId(null)
  }, [annotations, pushToHistory])

  const canUndo = history.length > 0
  const canRedo = future.length > 0

  return {
    annotations,
    selectedAnnotationId,
    currentTool,
    toolSettings,
    canUndo,
    canRedo,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    selectAnnotation,
    setCurrentTool,
    updateToolSettings,
    getAnnotationsForPage,
    clearAnnotationsForPage,
    undo,
    redo,
    discardAllAnnotations
  }
}
