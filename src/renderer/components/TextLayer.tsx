import { useEffect, useRef, useState } from 'react'
import { getTextContent } from '../services/pdfRenderer'
import './TextLayer.css'

interface TextBox {
  x: number
  y: number
  width: number
  height: number
  text: string
}

interface TextLayerProps {
  documentId: string
  pageIndex: number
  width: number
  height: number
  scale: number
  debug?: boolean
}

export default function TextLayer({
  documentId,
  pageIndex,
  width,
  height,
  scale,
  debug = true // Set to true for testing
}: TextLayerProps) {
  const [textBoxes, setTextBoxes] = useState<TextBox[]>([])

  useEffect(() => {
    if (!documentId) return

    let cancelled = false

    getTextContent(documentId, pageIndex, scale)
      .then(({ textContent, viewport }) => {
        if (cancelled) return

        const boxes: TextBox[] = []

        for (const item of textContent.items) {
          if (!('str' in item) || !item.str.trim()) continue

          // PDF.js text items have transform: [scaleX, skewX, skewY, scaleY, x, y]
          const transform = item.transform
          const x = transform[4]
          // PDF coordinates are from bottom-left, convert to top-left
          const y = viewport.height - transform[5]

          // Width comes from the item, height from font size in transform
          const itemWidth = item.width
          const itemHeight = Math.abs(transform[3]) // scaleY represents font size

          boxes.push({
            x,
            y: y - itemHeight, // Adjust y to be top of the box
            width: itemWidth,
            height: itemHeight,
            text: item.str
          })
        }

        setTextBoxes(boxes)
      })
      .catch((err) => {
        if (!cancelled) console.error('TextLayer error:', err)
      })

    return () => {
      cancelled = true
    }
  }, [documentId, pageIndex, scale])

  return (
    <div
      className={`text-layer ${debug ? 'debug' : ''}`}
      style={{ width, height }}
    >
      {textBoxes.map((box, i) => (
        <div
          key={i}
          className="text-box"
          style={{
            left: box.x,
            top: box.y,
            width: box.width,
            height: box.height
          }}
          data-text={box.text}
        />
      ))}
    </div>
  )
}
