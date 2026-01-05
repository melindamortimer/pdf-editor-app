import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAnnotations } from './useAnnotations'
import type { HighlightAnnotation, BoxAnnotation, TextAnnotation } from '../types/annotations'

describe('useAnnotations', () => {
  describe('initial state', () => {
    it('starts with empty annotations', () => {
      const { result } = renderHook(() => useAnnotations())
      expect(result.current.annotations).toEqual([])
    })

    it('starts with no selected annotation', () => {
      const { result } = renderHook(() => useAnnotations())
      expect(result.current.selectedAnnotationId).toBeNull()
    })

    it('starts with select tool active', () => {
      const { result } = renderHook(() => useAnnotations())
      expect(result.current.currentTool).toBe('select')
    })

    it('has default tool settings', () => {
      const { result } = renderHook(() => useAnnotations())
      expect(result.current.toolSettings.highlightColor).toBe('yellow')
      expect(result.current.toolSettings.textFont).toBe('Arial')
      expect(result.current.toolSettings.textSize).toBe(12)
      expect(result.current.toolSettings.boxThickness).toBe('medium')
    })
  })

  describe('addAnnotation', () => {
    it('adds annotation to list', () => {
      const { result } = renderHook(() => useAnnotations())

      const annotation: HighlightAnnotation = {
        id: 'ann-1',
        pageId: 'page-1',
        type: 'highlight',
        x: 0.1,
        y: 0.2,
        width: 0.3,
        height: 0.05,
        color: 'yellow'
      }

      act(() => {
        result.current.addAnnotation(annotation)
      })

      expect(result.current.annotations).toHaveLength(1)
      expect(result.current.annotations[0]).toEqual(annotation)
    })

    it('can add multiple annotations', () => {
      const { result } = renderHook(() => useAnnotations())

      act(() => {
        result.current.addAnnotation({
          id: 'ann-1', pageId: 'page-1', type: 'highlight',
          x: 0.1, y: 0.2, width: 0.3, height: 0.05, color: 'yellow'
        })
        result.current.addAnnotation({
          id: 'ann-2', pageId: 'page-1', type: 'highlight',
          x: 0.2, y: 0.3, width: 0.3, height: 0.05, color: 'green'
        })
      })

      expect(result.current.annotations).toHaveLength(2)
    })
  })

  describe('updateAnnotation', () => {
    it('updates annotation properties', () => {
      const { result } = renderHook(() => useAnnotations())

      const annotation: HighlightAnnotation = {
        id: 'ann-1', pageId: 'page-1', type: 'highlight',
        x: 0.1, y: 0.2, width: 0.3, height: 0.05, color: 'yellow'
      }

      act(() => {
        result.current.addAnnotation(annotation)
        result.current.updateAnnotation('ann-1', { x: 0.5, color: 'green' })
      })

      expect(result.current.annotations[0].x).toBe(0.5)
      expect((result.current.annotations[0] as HighlightAnnotation).color).toBe('green')
    })

    it('does nothing if annotation not found', () => {
      const { result } = renderHook(() => useAnnotations())

      act(() => {
        result.current.addAnnotation({
          id: 'ann-1', pageId: 'page-1', type: 'highlight',
          x: 0.1, y: 0.2, width: 0.3, height: 0.05, color: 'yellow'
        })
        result.current.updateAnnotation('non-existent', { x: 0.5 })
      })

      expect(result.current.annotations[0].x).toBe(0.1)
    })
  })

  describe('deleteAnnotation', () => {
    it('removes annotation from list', () => {
      const { result } = renderHook(() => useAnnotations())

      act(() => {
        result.current.addAnnotation({
          id: 'ann-1', pageId: 'page-1', type: 'highlight',
          x: 0.1, y: 0.2, width: 0.3, height: 0.05, color: 'yellow'
        })
        result.current.addAnnotation({
          id: 'ann-2', pageId: 'page-1', type: 'highlight',
          x: 0.2, y: 0.3, width: 0.3, height: 0.05, color: 'green'
        })
      })

      act(() => {
        result.current.deleteAnnotation('ann-1')
      })

      expect(result.current.annotations).toHaveLength(1)
      expect(result.current.annotations[0].id).toBe('ann-2')
    })

    it('clears selection if deleted annotation was selected', () => {
      const { result } = renderHook(() => useAnnotations())

      act(() => {
        result.current.addAnnotation({
          id: 'ann-1', pageId: 'page-1', type: 'highlight',
          x: 0.1, y: 0.2, width: 0.3, height: 0.05, color: 'yellow'
        })
        result.current.selectAnnotation('ann-1')
      })

      expect(result.current.selectedAnnotationId).toBe('ann-1')

      act(() => {
        result.current.deleteAnnotation('ann-1')
      })

      expect(result.current.selectedAnnotationId).toBeNull()
    })

    it('keeps selection if different annotation deleted', () => {
      const { result } = renderHook(() => useAnnotations())

      act(() => {
        result.current.addAnnotation({
          id: 'ann-1', pageId: 'page-1', type: 'highlight',
          x: 0.1, y: 0.2, width: 0.3, height: 0.05, color: 'yellow'
        })
        result.current.addAnnotation({
          id: 'ann-2', pageId: 'page-1', type: 'highlight',
          x: 0.2, y: 0.3, width: 0.3, height: 0.05, color: 'green'
        })
        result.current.selectAnnotation('ann-1')
        result.current.deleteAnnotation('ann-2')
      })

      expect(result.current.selectedAnnotationId).toBe('ann-1')
    })
  })

  describe('selectAnnotation', () => {
    it('sets selected annotation id', () => {
      const { result } = renderHook(() => useAnnotations())

      act(() => {
        result.current.selectAnnotation('ann-1')
      })

      expect(result.current.selectedAnnotationId).toBe('ann-1')
    })

    it('can clear selection with null', () => {
      const { result } = renderHook(() => useAnnotations())

      act(() => {
        result.current.selectAnnotation('ann-1')
        result.current.selectAnnotation(null)
      })

      expect(result.current.selectedAnnotationId).toBeNull()
    })
  })

  describe('setCurrentTool', () => {
    it('changes current tool', () => {
      const { result } = renderHook(() => useAnnotations())

      act(() => {
        result.current.setCurrentTool('highlight')
      })

      expect(result.current.currentTool).toBe('highlight')
    })
  })

  describe('updateToolSettings', () => {
    it('updates specific settings', () => {
      const { result } = renderHook(() => useAnnotations())

      act(() => {
        result.current.updateToolSettings({ highlightColor: 'green' })
      })

      expect(result.current.toolSettings.highlightColor).toBe('green')
      // Other settings unchanged
      expect(result.current.toolSettings.textFont).toBe('Arial')
    })

    it('can update multiple settings at once', () => {
      const { result } = renderHook(() => useAnnotations())

      act(() => {
        result.current.updateToolSettings({
          textFont: 'Georgia',
          textSize: 16,
          textColor: '#0000ff'
        })
      })

      expect(result.current.toolSettings.textFont).toBe('Georgia')
      expect(result.current.toolSettings.textSize).toBe(16)
      expect(result.current.toolSettings.textColor).toBe('#0000ff')
    })
  })

  describe('getAnnotationsForPage', () => {
    it('returns only annotations for specified page', () => {
      const { result } = renderHook(() => useAnnotations())

      act(() => {
        result.current.addAnnotation({
          id: 'ann-1', pageId: 'page-1', type: 'highlight',
          x: 0.1, y: 0.2, width: 0.3, height: 0.05, color: 'yellow'
        })
        result.current.addAnnotation({
          id: 'ann-2', pageId: 'page-2', type: 'highlight',
          x: 0.2, y: 0.3, width: 0.3, height: 0.05, color: 'green'
        })
        result.current.addAnnotation({
          id: 'ann-3', pageId: 'page-1', type: 'highlight',
          x: 0.3, y: 0.4, width: 0.3, height: 0.05, color: 'orange'
        })
      })

      const page1Annotations = result.current.getAnnotationsForPage('page-1')
      expect(page1Annotations).toHaveLength(2)
      expect(page1Annotations.map(a => a.id)).toEqual(['ann-1', 'ann-3'])
    })

    it('returns empty array for page with no annotations', () => {
      const { result } = renderHook(() => useAnnotations())

      const annotations = result.current.getAnnotationsForPage('non-existent')
      expect(annotations).toEqual([])
    })
  })

  describe('undo/redo', () => {
    it('starts with canUndo and canRedo as false', () => {
      const { result } = renderHook(() => useAnnotations())

      expect(result.current.canUndo).toBe(false)
      expect(result.current.canRedo).toBe(false)
    })

    it('can undo adding an annotation', () => {
      const { result } = renderHook(() => useAnnotations())

      act(() => {
        result.current.addAnnotation({
          id: 'ann-1', pageId: 'page-1', type: 'highlight',
          x: 0.1, y: 0.2, width: 0.3, height: 0.05, color: 'yellow'
        })
      })

      expect(result.current.annotations).toHaveLength(1)
      expect(result.current.canUndo).toBe(true)

      act(() => {
        result.current.undo()
      })

      expect(result.current.annotations).toHaveLength(0)
      expect(result.current.canUndo).toBe(false)
      expect(result.current.canRedo).toBe(true)
    })

    it('can redo after undo', () => {
      const { result } = renderHook(() => useAnnotations())

      act(() => {
        result.current.addAnnotation({
          id: 'ann-1', pageId: 'page-1', type: 'highlight',
          x: 0.1, y: 0.2, width: 0.3, height: 0.05, color: 'yellow'
        })
      })

      act(() => {
        result.current.undo()
      })

      expect(result.current.annotations).toHaveLength(0)

      act(() => {
        result.current.redo()
      })

      expect(result.current.annotations).toHaveLength(1)
      expect(result.current.canRedo).toBe(false)
    })

    it('clears redo stack when new action is taken', () => {
      const { result } = renderHook(() => useAnnotations())

      act(() => {
        result.current.addAnnotation({
          id: 'ann-1', pageId: 'page-1', type: 'highlight',
          x: 0.1, y: 0.2, width: 0.3, height: 0.05, color: 'yellow'
        })
      })

      act(() => {
        result.current.undo()
      })

      expect(result.current.canRedo).toBe(true)

      act(() => {
        result.current.addAnnotation({
          id: 'ann-2', pageId: 'page-1', type: 'highlight',
          x: 0.2, y: 0.3, width: 0.3, height: 0.05, color: 'green'
        })
      })

      expect(result.current.canRedo).toBe(false)
    })

    it('can undo deletion', () => {
      const { result } = renderHook(() => useAnnotations())

      act(() => {
        result.current.addAnnotation({
          id: 'ann-1', pageId: 'page-1', type: 'highlight',
          x: 0.1, y: 0.2, width: 0.3, height: 0.05, color: 'yellow'
        })
      })

      act(() => {
        result.current.deleteAnnotation('ann-1')
      })

      expect(result.current.annotations).toHaveLength(0)

      act(() => {
        result.current.undo()
      })

      expect(result.current.annotations).toHaveLength(1)
    })
  })

  describe('discardAllAnnotations', () => {
    it('removes all annotations', () => {
      const { result } = renderHook(() => useAnnotations())

      act(() => {
        result.current.addAnnotation({
          id: 'ann-1', pageId: 'page-1', type: 'highlight',
          x: 0.1, y: 0.2, width: 0.3, height: 0.05, color: 'yellow'
        })
        result.current.addAnnotation({
          id: 'ann-2', pageId: 'page-2', type: 'highlight',
          x: 0.2, y: 0.3, width: 0.3, height: 0.05, color: 'green'
        })
      })

      act(() => {
        result.current.discardAllAnnotations()
      })

      expect(result.current.annotations).toHaveLength(0)
    })

    it('can be undone', () => {
      const { result } = renderHook(() => useAnnotations())

      act(() => {
        result.current.addAnnotation({
          id: 'ann-1', pageId: 'page-1', type: 'highlight',
          x: 0.1, y: 0.2, width: 0.3, height: 0.05, color: 'yellow'
        })
      })

      act(() => {
        result.current.discardAllAnnotations()
      })

      expect(result.current.annotations).toHaveLength(0)

      act(() => {
        result.current.undo()
      })

      expect(result.current.annotations).toHaveLength(1)
    })
  })
})
