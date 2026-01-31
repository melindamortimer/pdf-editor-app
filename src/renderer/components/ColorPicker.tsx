import { useRef, useState, useEffect } from 'react'
import './ColorPicker.css'

interface ColorPickerProps {
  color: string
  onChange: (color: string) => void
  label?: string
  showAlpha?: boolean
}

// Convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 255, g: 255, b: 255 }
}

// Parse rgba string to components
function parseRgba(color: string): { r: number; g: number; b: number; a: number } {
  if (color === 'transparent') {
    return { r: 255, g: 255, b: 255, a: 0 }
  }
  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
  if (rgbaMatch) {
    return {
      r: parseInt(rgbaMatch[1]),
      g: parseInt(rgbaMatch[2]),
      b: parseInt(rgbaMatch[3]),
      a: rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1
    }
  }
  // Assume hex
  const rgb = hexToRgb(color)
  return { ...rgb, a: 1 }
}

// Convert RGB to hex
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')
}

export default function ColorPicker({
  color,
  onChange,
  label,
  showAlpha = false
}: ColorPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [alpha, setAlpha] = useState(1)
  const [hexColor, setHexColor] = useState('#ffffff')

  // Parse incoming color
  useEffect(() => {
    const parsed = parseRgba(color)
    setAlpha(parsed.a)
    setHexColor(rgbToHex(parsed.r, parsed.g, parsed.b))
  }, [color])

  const handleSwatchClick = () => {
    inputRef.current?.click()
  }

  const handleColorChange = (newHex: string) => {
    setHexColor(newHex)
    // If alpha is 0 (transparent), picking a color should set opacity to 100%
    if (showAlpha && alpha === 0) {
      setAlpha(1)
      onChange(newHex)
    } else if (showAlpha && alpha < 1) {
      const rgb = hexToRgb(newHex)
      onChange(`rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`)
    } else {
      onChange(newHex)
    }
  }

  const handleAlphaChange = (newAlpha: number) => {
    setAlpha(newAlpha)
    if (newAlpha === 0) {
      onChange('transparent')
    } else if (newAlpha < 1) {
      const rgb = hexToRgb(hexColor)
      onChange(`rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${newAlpha})`)
    } else {
      onChange(hexColor)
    }
  }

  const displayColor = alpha === 0
    ? 'transparent'
    : alpha < 1
      ? `rgba(${hexToRgb(hexColor).r}, ${hexToRgb(hexColor).g}, ${hexToRgb(hexColor).b}, ${alpha})`
      : hexColor

  return (
    <div className="color-picker">
      {label && <span className="color-picker-label">{label}</span>}
      <button
        type="button"
        className="color-swatch"
        onClick={handleSwatchClick}
        style={{
          backgroundColor: displayColor,
          backgroundImage: alpha < 1 ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)' : 'none',
          backgroundSize: '8px 8px',
          backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px'
        }}
        title={label || 'Pick color'}
      >
        {/* Overlay the actual color on top of checkerboard */}
        {alpha > 0 && alpha < 1 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: displayColor,
              borderRadius: '3px'
            }}
          />
        )}
      </button>
      <input
        ref={inputRef}
        type="color"
        value={hexColor}
        onChange={(e) => handleColorChange(e.target.value)}
        className="color-input"
      />
      {showAlpha && (
        <div className="alpha-slider-container" title={`Opacity: ${Math.round(alpha * 100)}%`}>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(alpha * 100)}
            onChange={(e) => handleAlphaChange(parseInt(e.target.value) / 100)}
            className="alpha-slider"
          />
          <span className="alpha-value">{Math.round(alpha * 100)}%</span>
        </div>
      )}
    </div>
  )
}
