import { useRef } from 'react'
import './ColorPicker.css'

interface ColorPickerProps {
  color: string
  onChange: (color: string) => void
  label?: string
  showTransparent?: boolean
  isTransparent?: boolean
  onTransparentChange?: (isTransparent: boolean) => void
}

export default function ColorPicker({
  color,
  onChange,
  label,
  showTransparent = false,
  isTransparent = false,
  onTransparentChange
}: ColorPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSwatchClick = () => {
    inputRef.current?.click()
  }

  return (
    <div className="color-picker">
      {label && <span className="color-picker-label">{label}</span>}
      <button
        type="button"
        className="color-swatch"
        onClick={handleSwatchClick}
        style={{
          backgroundColor: isTransparent ? 'transparent' : color,
          backgroundImage: isTransparent ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)' : 'none',
          backgroundSize: '8px 8px',
          backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px'
        }}
        title={label || 'Pick color'}
      />
      <input
        ref={inputRef}
        type="color"
        value={color}
        onChange={(e) => {
          if (isTransparent && onTransparentChange) {
            onTransparentChange(false)
          }
          onChange(e.target.value)
        }}
        className="color-input"
      />
      {showTransparent && onTransparentChange && (
        <button
          type="button"
          className={`transparent-toggle ${isTransparent ? 'active' : ''}`}
          onClick={() => onTransparentChange(!isTransparent)}
          title="Transparent"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2"/>
          </svg>
        </button>
      )}
    </div>
  )
}
