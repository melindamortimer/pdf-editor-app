import { useState } from 'react'
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
  onPageSelect: (index: number) => void
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
  onClick: () => void
  onContextMenu: (e: React.MouseEvent) => void
}

function SortableItem({
  id,
  page,
  pageNumber,
  showHeader,
  docName,
  selected,
  onClick,
  onContextMenu
}: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {showHeader && <div className="document-header">{docName}</div>}
      <div onContextMenu={onContextMenu}>
        <PageThumbnail
          documentId={page.documentId}
          pageIndex={page.originalPageIndex}
          pageNumber={pageNumber}
          selected={selected}
          onClick={onClick}
        />
      </div>
    </div>
  )
}

export default function Sidebar({
  documents,
  pages,
  selectedPageIndex,
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
    return <div className="sidebar empty"><p>No documents</p></div>
  }

  let currentDocId = ''
  let pageNumber = 0

  return (
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
                selected={index === selectedPageIndex}
                onClick={() => onPageSelect(index)}
                onContextMenu={(e) => handleContextMenu(e, index)}
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
  )
}
