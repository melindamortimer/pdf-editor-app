import { useState, useRef, useCallback, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { PdfDocument, PdfPage } from '../types/pdf'
import PageThumbnail from './PageThumbnail'
import './Sidebar.css'

interface SidebarProps {
  documents: PdfDocument[]
  pages: PdfPage[]
  selectedPageIndex: number
  selectedPageIndices: Set<number>
  onPageSelect: (index: number, shiftKey: boolean) => void
  onReorder: (oldIndex: number, newIndex: number) => void
  onDeletePage: (index: number) => void
  onDuplicatePage: (index: number) => void
}

interface SortableItemProps {
  id: string
  page: PdfPage
  pageNumber: number
  showHeader: boolean
  docName: string
  selected: boolean
  onClick: (e: React.MouseEvent) => void
  onContextMenu: (e: React.MouseEvent) => void
  thumbnailWidth: number
}

function SortableItem({
  id,
  page,
  pageNumber,
  showHeader,
  docName,
  selected,
  onClick,
  onContextMenu,
  thumbnailWidth
}: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {showHeader && <div className="document-header">{docName}</div>}
      <div onContextMenu={onContextMenu} onClick={onClick}>
        <PageThumbnail
          documentId={page.documentId}
          pageIndex={page.originalPageIndex}
          pageNumber={pageNumber}
          selected={selected}
          thumbnailWidth={thumbnailWidth}
        />
      </div>
    </div>
  )
}

const MIN_WIDTH = 120
const MAX_WIDTH = 400
const DEFAULT_WIDTH = 180

export default function Sidebar({
  documents,
  pages,
  selectedPageIndex,
  selectedPageIndices,
  onPageSelect,
  onReorder,
  onDeletePage,
  onDuplicatePage
}: SidebarProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8 // Require 8px movement before drag starts, allows clicks
      }
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; index: number } | null>(null)
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const [dragWidth, setDragWidth] = useState<number | null>(null) // Visual width during drag only
  const sidebarRef = useRef<HTMLDivElement>(null)

  const isResizing = dragWidth !== null

  // Calculate thumbnail width (sidebar width minus padding and selection box margin)
  const thumbnailWidth = width - 68

  // Handle resize drag
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setDragWidth(width)
  }, [width])

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!sidebarRef.current) return
      const sidebarRect = sidebarRef.current.getBoundingClientRect()
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX - sidebarRect.left))
      setDragWidth(newWidth)
    }

    const handleMouseUp = () => {
      // Commit the drag width as the actual width (triggers thumbnail re-render)
      if (dragWidth !== null) {
        setWidth(dragWidth)
      }
      setDragWidth(null)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, dragWidth])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = pages.findIndex(p => p.id === active.id)
      const newIndex = pages.findIndex(p => p.id === over.id)
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorder(oldIndex, newIndex)
      }
    }
  }

  const handleContextMenu = (e: React.MouseEvent, index: number) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, index })
  }

  const closeContextMenu = () => setContextMenu(null)

  if (documents.length === 0) {
    return (
      <div className="sidebar-container" ref={sidebarRef} style={{ width: dragWidth ?? width }}>
        <div className="sidebar empty">
          <p>No documents</p>
        </div>
        <div className="resize-handle" onMouseDown={handleResizeStart} />
      </div>
    )
  }

  let currentDocId = ''
  let pageNumber = 0

  return (
    <div
      className={`sidebar-container ${isResizing ? 'resizing' : ''}`}
      ref={sidebarRef}
      style={{ width: dragWidth ?? width }}
    >
      <div className="sidebar" onClick={closeContextMenu}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={pages.map(p => p.id)} strategy={verticalListSortingStrategy}>
            {pages.map((page, index) => {
              const showHeader = page.documentId !== currentDocId
              if (showHeader) {
                currentDocId = page.documentId
                pageNumber = 0
              }
              pageNumber++
              const doc = documents.find(d => d.id === page.documentId)

              return (
                <SortableItem
                  key={page.id}
                  id={page.id}
                  page={page}
                  pageNumber={pageNumber}
                  showHeader={showHeader}
                  docName={doc?.name || ''}
                  selected={selectedPageIndices.has(index)}
                  onClick={(e) => onPageSelect(index, e.shiftKey)}
                  onContextMenu={(e) => handleContextMenu(e, index)}
                  thumbnailWidth={thumbnailWidth}
                />
              )
            })}
          </SortableContext>
        </DndContext>

        {contextMenu && (
          <div
            className="context-menu"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button onClick={() => { onDuplicatePage(contextMenu.index); closeContextMenu() }}>
              Duplicate
            </button>
            <button onClick={() => { onDeletePage(contextMenu.index); closeContextMenu() }}>
              Delete
            </button>
          </div>
        )}
      </div>

      <div className="resize-handle" onMouseDown={handleResizeStart} />
    </div>
  )
}
