import { useState, useCallback, useEffect } from 'react'
import type {
  Annotation,
  AnnotationTool,
  BoxThickness,
  PenWidth,
  TextFont
} from '../types/annotations'
import {
  DEFAULT_LINE_COLOR,
  DEFAULT_BOX_COLOR,
  DEFAULT_BOX_FILL_COLOR,
  DEFAULT_HIGHLIGHT_COLOR,
  DEFAULT_BOX_THICKNESS,
  DEFAULT_PEN_COLOR,
  DEFAULT_PEN_WIDTH,
  DEFAULT_TEXT_FONT,
  DEFAULT_TEXT_SIZE
} from '../types/annotations'

export interface AnnotationToolSettings {
  highlightColor: string
  lineColor: string
  boxColor: string
  boxFillColor: string
  boxThickness: BoxThickness
  penColor: string
  penWidth: PenWidth
  textColor: string
  textFont: TextFont
  textSize: number
}

export interface UseAnnotationsReturn {
  annotations: Annotation[]
  selectedAnnotationIds: Set<string>
  currentTool: AnnotationTool
  toolSettings: AnnotationToolSettings
  canUndo: boolean
  canRedo: boolean
  addAnnotation: (annotation: Annotation) => void
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void
  deleteAnnotation: (id: string) => void
  selectAnnotation: (id: string | null, addToSelection?: boolean) => void
  clearSelection: () => void
  setCurrentTool: (tool: AnnotationTool) => void
  updateToolSettings: (updates: Partial<AnnotationToolSettings>) => void
  getAnnotationsForPage: (pageId: string) => Annotation[]
  undo: () => void
  redo: () => void
  discardAllAnnotations: () => void
  // Layer ordering
  bringToFront: (id: string) => void
  sendToBack: (id: string) => void
  bringForward: (id: string) => void
  sendBackward: (id: string) => void
}

const MAX_HISTORY = 50 // Limit history to prevent memory issues

export function useAnnotations(): UseAnnotationsReturn {
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [history, setHistory] = useState<Annotation[][]>([])
  const [future, setFuture] = useState<Annotation[][]>([])
  const [selectedAnnotationIds, setSelectedAnnotationIds] = useState<Set<string>>(new Set())
  const [currentTool, setCurrentTool] = useState<AnnotationTool>('select')
  const [toolSettings, setToolSettings] = useState<AnnotationToolSettings>({
    highlightColor: DEFAULT_HIGHLIGHT_COLOR,
    lineColor: DEFAULT_LINE_COLOR,
    boxColor: DEFAULT_BOX_COLOR,
    boxFillColor: DEFAULT_BOX_FILL_COLOR,
    boxThickness: DEFAULT_BOX_THICKNESS,
    penColor: DEFAULT_PEN_COLOR,
    penWidth: DEFAULT_PEN_WIDTH,
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
    setSelectedAnnotationIds(prev => {
      if (prev.has(id)) {
        const next = new Set(prev)
        next.delete(id)
        return next
      }
      return prev
    })
  }, [pushToHistory])

  const selectAnnotation = useCallback((id: string | null, addToSelection = false) => {
    if (id === null) {
      setSelectedAnnotationIds(new Set())
    } else if (addToSelection) {
      setSelectedAnnotationIds(prev => {
        const next = new Set(prev)
        if (next.has(id)) {
          next.delete(id) // Toggle off if already selected
        } else {
          next.add(id)
        }
        return next
      })
    } else {
      setSelectedAnnotationIds(new Set([id]))
    }
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedAnnotationIds(new Set())
  }, [])

  const updateToolSettings = useCallback((updates: Partial<AnnotationToolSettings>) => {
    setToolSettings(prev => ({ ...prev, ...updates }))
  }, [])

  const getAnnotationsForPage = useCallback(
    (pageId: string) => annotations.filter(ann => ann.pageId === pageId),
    [annotations]
  )

  const undo = useCallback(() => {
    if (history.length === 0) return

    const previousState = history[history.length - 1]
    setHistory(prev => prev.slice(0, -1))
    setFuture(prev => [annotations, ...prev])
    setAnnotations(previousState)
    setSelectedAnnotationIds(new Set())
  }, [history, annotations])

  const redo = useCallback(() => {
    if (future.length === 0) return

    const nextState = future[0]
    setFuture(prev => prev.slice(1))
    setHistory(prev => [...prev, annotations])
    setAnnotations(nextState)
    setSelectedAnnotationIds(new Set())
  }, [future, annotations])

  const discardAllAnnotations = useCallback(() => {
    if (annotations.length === 0) return
    pushToHistory(annotations)
    setAnnotations([])
    setSelectedAnnotationIds(new Set())
  }, [annotations, pushToHistory])

  // Layer ordering functions
  const bringToFront = useCallback((id: string) => {
    setAnnotations(prev => {
      const index = prev.findIndex(ann => ann.id === id)
      if (index === -1 || index === prev.length - 1) return prev
      pushToHistory(prev)
      const annotation = prev[index]
      const newAnnotations = [...prev]
      newAnnotations.splice(index, 1)
      newAnnotations.push(annotation)
      return newAnnotations
    })
  }, [pushToHistory])

  const sendToBack = useCallback((id: string) => {
    setAnnotations(prev => {
      const index = prev.findIndex(ann => ann.id === id)
      if (index === -1 || index === 0) return prev
      pushToHistory(prev)
      const annotation = prev[index]
      const newAnnotations = [...prev]
      newAnnotations.splice(index, 1)
      newAnnotations.unshift(annotation)
      return newAnnotations
    })
  }, [pushToHistory])

  const bringForward = useCallback((id: string) => {
    setAnnotations(prev => {
      const index = prev.findIndex(ann => ann.id === id)
      if (index === -1 || index === prev.length - 1) return prev
      pushToHistory(prev)
      const newAnnotations = [...prev]
      // Swap with next annotation
      const temp = newAnnotations[index]
      newAnnotations[index] = newAnnotations[index + 1]
      newAnnotations[index + 1] = temp
      return newAnnotations
    })
  }, [pushToHistory])

  const sendBackward = useCallback((id: string) => {
    setAnnotations(prev => {
      const index = prev.findIndex(ann => ann.id === id)
      if (index === -1 || index === 0) return prev
      pushToHistory(prev)
      const newAnnotations = [...prev]
      // Swap with previous annotation
      const temp = newAnnotations[index]
      newAnnotations[index] = newAnnotations[index - 1]
      newAnnotations[index - 1] = temp
      return newAnnotations
    })
  }, [pushToHistory])

  const canUndo = history.length > 0
  const canRedo = future.length > 0

  // When a box is selected, update tool settings to match its colors
  useEffect(() => {
    if (selectedAnnotationIds.size === 1) {
      const selectedId = [...selectedAnnotationIds][0]
      const selectedAnnotation = annotations.find(ann => ann.id === selectedId)
      if (selectedAnnotation && selectedAnnotation.type === 'box') {
        setToolSettings(prev => ({
          ...prev,
          boxColor: selectedAnnotation.color,
          boxFillColor: selectedAnnotation.fillColor,
          boxThickness: selectedAnnotation.thickness
        }))
      }
    }
  }, [selectedAnnotationIds, annotations])

  return {
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
  }
}
