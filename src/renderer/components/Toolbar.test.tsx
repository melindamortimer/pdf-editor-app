import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen } from '@test/render'
import Toolbar from './Toolbar'

const defaultProps = {
  hasDocuments: false,
  hasUnsavedChanges: false,
  canSave: false,
  zoom: 1,
  onOpenFiles: vi.fn(),
  onSave: vi.fn(),
  onSaveAs: vi.fn(),
  onZoomChange: vi.fn()
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
})
