/**
 * Vitest Setup File
 * Runs before all tests to configure the test environment
 */

import '@testing-library/jest-dom'
import { vi, beforeEach, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { resetIdCounter } from './factories'

// ============================================
// Cleanup
// ============================================

beforeEach(() => {
  resetIdCounter()
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// ============================================
// Mock: Electron API
// ============================================

export const mockElectronAPI = {
  openFileDialog: vi.fn().mockResolvedValue([]),
  readFile: vi.fn().mockResolvedValue(new Uint8Array()),
  saveFile: vi.fn().mockResolvedValue(true),
  saveFileDialog: vi.fn().mockResolvedValue(undefined)
}

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
})

// ============================================
// Mock: Canvas
// ============================================

const mockCanvasContext = {
  drawImage: vi.fn(),
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(),
  putImageData: vi.fn(),
  scale: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  arc: vi.fn(),
  rect: vi.fn(),
  fillText: vi.fn(),
  measureText: vi.fn().mockReturnValue({ width: 0 }),
  setTransform: vi.fn(),
  resetTransform: vi.fn()
}

HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCanvasContext) as any

// ============================================
// Mock: crypto.randomUUID
// ============================================

let uuidCounter = 0

Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: () => `test-uuid-${++uuidCounter}`
  }
})

// ============================================
// Mock: PDF.js TextLayer
// ============================================

// Add DOMMatrix polyfill for PDF.js in test environment
class MockDOMMatrix {
  a = 1; b = 0; c = 0; d = 1; e = 0; f = 0
  constructor() {}
  multiply() { return this }
  inverse() { return this }
  translate() { return this }
  scale() { return this }
  rotate() { return this }
}
global.DOMMatrix = MockDOMMatrix as any

// ============================================
// Mock: ResizeObserver (for some UI components like @dnd-kit)
// ============================================

class MockResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

global.ResizeObserver = MockResizeObserver as any

// ============================================
// Mock: matchMedia (for responsive components)
// ============================================

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
})

// ============================================
// Silence console errors in tests (optional)
// ============================================

// Uncomment to silence expected errors:
// vi.spyOn(console, 'error').mockImplementation(() => {})
