import type { PdfDocument, PdfPage } from '../types/pdf'
import PageThumbnail from './PageThumbnail'
import './Sidebar.css'

interface SidebarProps {
  documents: PdfDocument[]
  pages: PdfPage[]
  selectedPageIndex: number
  onPageSelect: (index: number) => void
}

export default function Sidebar({
  documents,
  pages,
  selectedPageIndex,
  onPageSelect
}: SidebarProps) {
  if (documents.length === 0) {
    return (
      <div className="sidebar empty">
        <p>No documents</p>
      </div>
    )
  }

  // Group pages by document for display
  let currentDocId = ''
  let pageNumber = 0

  return (
    <div className="sidebar">
      {pages.map((page, index) => {
        const showHeader = page.documentId !== currentDocId
        if (showHeader) {
          currentDocId = page.documentId
          pageNumber = 0
        }
        pageNumber++

        const doc = documents.find(d => d.id === page.documentId)

        return (
          <div key={`${page.documentId}-${page.originalPageIndex}-${index}`}>
            {showHeader && (
              <div className="document-header">{doc?.name}</div>
            )}
            <PageThumbnail
              documentId={page.documentId}
              pageIndex={page.originalPageIndex}
              pageNumber={pageNumber}
              selected={index === selectedPageIndex}
              onClick={() => onPageSelect(index)}
            />
          </div>
        )
      })}
    </div>
  )
}
