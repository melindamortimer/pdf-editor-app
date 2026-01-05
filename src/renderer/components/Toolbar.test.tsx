import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen } from '@test/render'
import Toolbar from './Toolbar'

const defaultProps = {
  hasDocuments: false,
  hasUnsavedChanges: false,
  canSave: false,
  zoom: 1,
  currentTool: 'select' as const,
  highlightColor: 'yellow' as const,
  lineColor: '#000000',
  boxColor: '#ff0000',
  boxFillColor: 'transparent',
  textFont: 'Arial' as const,
  textSize: 12,
  textColor: '#000000',
  selectedAnnotationType: null as 'box' | 'text' | null,
  canUndo: false,
  canRedo: false,
  onOpenFiles: vi.fn(),
  onCloseDocument: vi.fn(),
  onSave: vi.fn(),
  onSaveAs: vi.fn(),
  onZoomChange: vi.fn(),
  onToolChange: vi.fn(),
  onHighlightColorChange: vi.fn(),
  onLineColorChange: vi.fn(),
  onBoxColorChange: vi.fn(),
  onBoxFillColorChange: vi.fn(),
  onTextFontChange: vi.fn(),
  onTextSizeChange: vi.fn(),
  onTextColorChange: vi.fn(),
  onUndo: vi.fn(),
  onRedo: vi.fn(),
  onDiscardAnnotations: vi.fn()
}

describe('Toolbar', () => {
  describe('File Operations', () => {
    it('renders Open button', () => {
      renderWithProviders(<Toolbar {...defaultProps} />)
      expect(screen.getByText('Open')).toBeInTheDocument()
    })

    it('calls onOpenFiles when Open clicked', async () => {
      const onOpenFiles = vi.fn()
      const { user } = renderWithProviders(
        <Toolbar {...defaultProps} onOpenFiles={onOpenFiles} />
      )

      await user.click(screen.getByText('Open'))
      expect(onOpenFiles).toHaveBeenCalled()
    })

    it('renders Close button', () => {
      renderWithProviders(<Toolbar {...defaultProps} />)
      expect(screen.getByText('Close')).toBeInTheDocument()
    })

    it('disables Close button when no documents', () => {
      renderWithProviders(<Toolbar {...defaultProps} hasDocuments={false} />)
      expect(screen.getByText('Close')).toBeDisabled()
    })

    it('enables Close button when documents exist', () => {
      renderWithProviders(<Toolbar {...defaultProps} hasDocuments={true} />)
      expect(screen.getByText('Close')).not.toBeDisabled()
    })

    it('calls onCloseDocument when Close clicked', async () => {
      const onCloseDocument = vi.fn()
      const { user } = renderWithProviders(
        <Toolbar {...defaultProps} hasDocuments={true} onCloseDocument={onCloseDocument} />
      )

      await user.click(screen.getByText('Close'))
      expect(onCloseDocument).toHaveBeenCalled()
    })

    it('disables Save buttons when no documents', () => {
      renderWithProviders(<Toolbar {...defaultProps} hasDocuments={false} />)

      expect(screen.getByText('Save')).toBeDisabled()
      expect(screen.getByText('Save As')).toBeDisabled()
    })

    it('enables Save buttons when documents exist', () => {
      renderWithProviders(<Toolbar {...defaultProps} hasDocuments={true} />)

      expect(screen.getByText('Save')).not.toBeDisabled()
      expect(screen.getByText('Save As')).not.toBeDisabled()
    })

    it('calls onSave when Save clicked', async () => {
      const onSave = vi.fn()
      const { user } = renderWithProviders(
        <Toolbar {...defaultProps} hasDocuments={true} onSave={onSave} />
      )

      await user.click(screen.getByText('Save'))
      expect(onSave).toHaveBeenCalled()
    })

    it('calls onSaveAs when Save As clicked', async () => {
      const onSaveAs = vi.fn()
      const { user } = renderWithProviders(
        <Toolbar {...defaultProps} hasDocuments={true} onSaveAs={onSaveAs} />
      )

      await user.click(screen.getByText('Save As'))
      expect(onSaveAs).toHaveBeenCalled()
    })

    it('shows asterisk on Save button when unsaved changes exist', () => {
      renderWithProviders(
        <Toolbar {...defaultProps} hasDocuments={true} hasUnsavedChanges={true} />
      )

      expect(screen.getByText('Save*')).toBeInTheDocument()
    })

    it('does not show asterisk when no unsaved changes', () => {
      renderWithProviders(
        <Toolbar {...defaultProps} hasDocuments={true} hasUnsavedChanges={false} />
      )

      expect(screen.getByText('Save')).toBeInTheDocument()
      expect(screen.queryByText('Save*')).not.toBeInTheDocument()
    })

    it('applies has-changes class when unsaved changes exist', () => {
      renderWithProviders(
        <Toolbar {...defaultProps} hasDocuments={true} hasUnsavedChanges={true} />
      )

      expect(screen.getByText('Save*')).toHaveClass('has-changes')
    })
  })

  describe('Zoom Controls', () => {
    it('displays current zoom level', () => {
      renderWithProviders(<Toolbar {...defaultProps} zoom={1.5} />)
      expect(screen.getByText('150%')).toBeInTheDocument()
    })

    it('calls onZoomChange when zoom out clicked', async () => {
      const onZoomChange = vi.fn()
      const { user } = renderWithProviders(
        <Toolbar {...defaultProps} zoom={1} onZoomChange={onZoomChange} />
      )

      await user.click(screen.getByText('−'))
      expect(onZoomChange).toHaveBeenCalled()
    })

    it('calls onZoomChange when zoom in clicked', async () => {
      const onZoomChange = vi.fn()
      const { user } = renderWithProviders(
        <Toolbar {...defaultProps} zoom={1} onZoomChange={onZoomChange} />
      )

      await user.click(screen.getByText('+'))
      expect(onZoomChange).toHaveBeenCalled()
    })

    it('disables zoom out at minimum zoom', () => {
      renderWithProviders(<Toolbar {...defaultProps} zoom={0.25} />)
      expect(screen.getByText('−')).toBeDisabled()
    })

    it('disables zoom in at maximum zoom', () => {
      renderWithProviders(<Toolbar {...defaultProps} zoom={3} />)
      expect(screen.getByText('+')).toBeDisabled()
    })
  })

  describe('Zoom Dropdown', () => {
    it('shows dropdown when zoom display clicked', async () => {
      const { user } = renderWithProviders(<Toolbar {...defaultProps} zoom={1} />)

      await user.click(screen.getByText('100%'))

      expect(screen.getByText('50%')).toBeInTheDocument()
      expect(screen.getByText('75%')).toBeInTheDocument()
      expect(screen.getByText('125%')).toBeInTheDocument()
      expect(screen.getByText('150%')).toBeInTheDocument()
      expect(screen.getByText('200%')).toBeInTheDocument()
      expect(screen.getByText('300%')).toBeInTheDocument()
    })

    it('calls onZoomChange when preset selected', async () => {
      const onZoomChange = vi.fn()
      const { user } = renderWithProviders(
        <Toolbar {...defaultProps} zoom={1} onZoomChange={onZoomChange} />
      )

      await user.click(screen.getByText('100%'))
      await user.click(screen.getByText('150%'))

      expect(onZoomChange).toHaveBeenCalledWith(1.5)
    })

    it('closes dropdown after selection', async () => {
      const { user } = renderWithProviders(<Toolbar {...defaultProps} zoom={1} />)

      await user.click(screen.getByText('100%'))
      expect(screen.getByText('200%')).toBeInTheDocument()

      await user.click(screen.getByText('150%'))
      // Dropdown should close, only current zoom visible
      expect(screen.queryAllByText('200%')).toHaveLength(0)
    })
  })

  describe('Annotation Tools', () => {
    it('renders all annotation tool buttons', () => {
      renderWithProviders(<Toolbar {...defaultProps} hasDocuments={true} />)

      expect(screen.getByTitle('Select')).toBeInTheDocument()
      expect(screen.getByTitle('Highlight')).toBeInTheDocument()
      expect(screen.getByTitle('Underline')).toBeInTheDocument()
      expect(screen.getByTitle('Strikethrough')).toBeInTheDocument()
      expect(screen.getByTitle('Box')).toBeInTheDocument()
      expect(screen.getByTitle('Text')).toBeInTheDocument()
    })

    it('marks current tool as active', () => {
      renderWithProviders(
        <Toolbar {...defaultProps} hasDocuments={true} currentTool="highlight" />
      )

      expect(screen.getByTitle('Highlight')).toHaveClass('active')
      expect(screen.getByTitle('Select')).not.toHaveClass('active')
    })

    it('calls onToolChange when tool clicked', async () => {
      const onToolChange = vi.fn()
      const { user } = renderWithProviders(
        <Toolbar {...defaultProps} hasDocuments={true} onToolChange={onToolChange} />
      )

      await user.click(screen.getByTitle('Highlight'))
      expect(onToolChange).toHaveBeenCalledWith('highlight')
    })

    it('disables annotation tools when no documents', () => {
      renderWithProviders(<Toolbar {...defaultProps} hasDocuments={false} />)

      expect(screen.getByTitle('Highlight')).toBeDisabled()
      expect(screen.getByTitle('Box')).toBeDisabled()
      expect(screen.getByTitle('Text')).toBeDisabled()
    })

    it('keeps select tool enabled without documents', () => {
      renderWithProviders(<Toolbar {...defaultProps} hasDocuments={false} />)

      expect(screen.getByTitle('Select')).not.toBeDisabled()
    })

    it('shows color picker when highlight tool is selected', () => {
      renderWithProviders(
        <Toolbar {...defaultProps} hasDocuments={true} currentTool="highlight" />
      )

      expect(screen.getByTitle('Highlight color')).toBeInTheDocument()
    })

    it('does not show color picker for other tools', () => {
      renderWithProviders(
        <Toolbar {...defaultProps} hasDocuments={true} currentTool="box" />
      )

      expect(screen.queryByTitle('Highlight color')).not.toBeInTheDocument()
    })
  })

  describe('Text Controls', () => {
    it('shows text controls when text tool is selected', () => {
      renderWithProviders(
        <Toolbar {...defaultProps} hasDocuments={true} currentTool="text" />
      )

      expect(screen.getByTitle('Font')).toBeInTheDocument()
      expect(screen.getByTitle('Font size')).toBeInTheDocument()
      expect(screen.getByTitle('Text color')).toBeInTheDocument()
    })

    it('shows text controls when text annotation is selected', () => {
      renderWithProviders(
        <Toolbar {...defaultProps} hasDocuments={true} currentTool="select" selectedAnnotationType="text" />
      )

      expect(screen.getByTitle('Font')).toBeInTheDocument()
      expect(screen.getByTitle('Font size')).toBeInTheDocument()
      expect(screen.getByTitle('Text color')).toBeInTheDocument()
    })

    it('does not show text controls for other tools', () => {
      renderWithProviders(
        <Toolbar {...defaultProps} hasDocuments={true} currentTool="highlight" />
      )

      expect(screen.queryByTitle('Font')).not.toBeInTheDocument()
      expect(screen.queryByTitle('Font size')).not.toBeInTheDocument()
    })

    it('displays current font', () => {
      renderWithProviders(
        <Toolbar {...defaultProps} hasDocuments={true} currentTool="text" textFont="Georgia" />
      )

      expect(screen.getByText('Georgia')).toBeInTheDocument()
    })

    it('displays current font size', () => {
      renderWithProviders(
        <Toolbar {...defaultProps} hasDocuments={true} currentTool="text" textSize={18} />
      )

      expect(screen.getByText('18')).toBeInTheDocument()
    })

    it('shows font dropdown when font button clicked', async () => {
      const { user } = renderWithProviders(
        <Toolbar {...defaultProps} hasDocuments={true} currentTool="text" />
      )

      await user.click(screen.getByTitle('Font'))

      expect(screen.getByText('Times New Roman')).toBeInTheDocument()
      expect(screen.getByText('Verdana')).toBeInTheDocument()
      expect(screen.getByText('Georgia')).toBeInTheDocument()
    })

    it('calls onTextFontChange when font selected', async () => {
      const onTextFontChange = vi.fn()
      const { user } = renderWithProviders(
        <Toolbar {...defaultProps} hasDocuments={true} currentTool="text" onTextFontChange={onTextFontChange} />
      )

      await user.click(screen.getByTitle('Font'))
      await user.click(screen.getByText('Georgia'))

      expect(onTextFontChange).toHaveBeenCalledWith('Georgia')
    })

    it('shows size dropdown when size button clicked', async () => {
      const { user } = renderWithProviders(
        <Toolbar {...defaultProps} hasDocuments={true} currentTool="text" />
      )

      await user.click(screen.getByTitle('Font size'))

      expect(screen.getByText('10')).toBeInTheDocument()
      expect(screen.getByText('14')).toBeInTheDocument()
      expect(screen.getByText('18')).toBeInTheDocument()
      expect(screen.getByText('24')).toBeInTheDocument()
    })

    it('calls onTextSizeChange when size selected', async () => {
      const onTextSizeChange = vi.fn()
      const { user } = renderWithProviders(
        <Toolbar {...defaultProps} hasDocuments={true} currentTool="text" onTextSizeChange={onTextSizeChange} />
      )

      await user.click(screen.getByTitle('Font size'))
      await user.click(screen.getByText('18'))

      expect(onTextSizeChange).toHaveBeenCalledWith(18)
    })

    it('calls onTextColorChange when color selected', async () => {
      const onTextColorChange = vi.fn()
      const { user } = renderWithProviders(
        <Toolbar {...defaultProps} hasDocuments={true} currentTool="text" onTextColorChange={onTextColorChange} />
      )

      await user.click(screen.getByTitle('Text color'))
      await user.click(screen.getByTitle('Red'))

      expect(onTextColorChange).toHaveBeenCalledWith('#ff0000')
    })
  })
})
