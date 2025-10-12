"""Toolbar for annotation and editing tools."""

import logging
from enum import Enum
from typing import Optional

from PySide6.QtWidgets import (
    QWidget,
    QHBoxLayout,
    QToolButton,
    QLabel,
    QSpinBox,
    QPushButton,
    QColorDialog,
    QLineEdit,
    QTextEdit,
    QVBoxLayout,
    QFrame,
)
from PySide6.QtCore import Qt, Signal
from PySide6.QtGui import QIcon, QColor, QAction

logger = logging.getLogger(__name__)


class ToolType(Enum):
    """Available tool types."""

    SELECT = "select"
    TEXT = "text"
    HIGHLIGHT = "highlight"
    SIGNATURE = "signature"


class AnnotationToolbar(QWidget):
    """Toolbar for selecting and configuring annotation tools."""

    tool_changed = Signal(object)  # Emits ToolType
    apply_changes = Signal()  # Emits when Apply Changes button is clicked

    def __init__(self, parent=None):
        super().__init__(parent)
        self.current_tool: ToolType = ToolType.SELECT
        self.selected_color: tuple = (0, 0, 0)  # RGB 0-1
        self.font_size: int = 12

        self._setup_ui()

    def _setup_ui(self):
        """Setup the toolbar UI."""
        layout = QHBoxLayout()
        layout.setContentsMargins(5, 1, 5, 1)  # Minimal margins
        layout.setSpacing(5)  # Reduced spacing

        # Tool selection group
        layout.addWidget(QLabel("Tool:"))

        self.select_btn = QToolButton()
        self.select_btn.setText("↖ Select")
        self.select_btn.setCheckable(True)
        self.select_btn.setChecked(True)
        self.select_btn.setToolTip("Select and navigate pages")
        self.select_btn.setStyleSheet(
            "QToolButton { padding: 3px 8px; font-size: 9pt; }"  # Minimal padding
            "QToolButton:checked { background-color: #4CAF50; color: white; }"
        )
        self.select_btn.clicked.connect(lambda: self._select_tool(ToolType.SELECT))
        layout.addWidget(self.select_btn)

        self.text_btn = QToolButton()
        self.text_btn.setText("✎ Text")
        self.text_btn.setCheckable(True)
        self.text_btn.setChecked(False)
        self.text_btn.setToolTip("Add text annotations (click on PDF to place)")
        self.text_btn.setStyleSheet(
            "QToolButton { padding: 3px 8px; font-size: 9pt; }"  # Minimal padding
            "QToolButton:checked { background-color: #4CAF50; color: white; }"
        )
        self.text_btn.clicked.connect(lambda: self._select_tool(ToolType.TEXT))
        layout.addWidget(self.text_btn)

        self.highlight_btn = QToolButton()
        self.highlight_btn.setText("▓ Highlight")
        self.highlight_btn.setCheckable(True)
        self.highlight_btn.setToolTip("Highlight text (coming soon)")
        self.highlight_btn.setStyleSheet(
            "QToolButton { padding: 3px 8px; font-size: 9pt; }"  # Minimal padding
            "QToolButton:checked { background-color: #4CAF50; color: white; }"
        )
        self.highlight_btn.clicked.connect(lambda: self._select_tool(ToolType.HIGHLIGHT))
        self.highlight_btn.setEnabled(False)  # Not yet implemented
        layout.addWidget(self.highlight_btn)

        self.signature_btn = QToolButton()
        self.signature_btn.setText("✍ Signature")
        self.signature_btn.setCheckable(True)
        self.signature_btn.setToolTip("Add digital signature")
        self.signature_btn.setStyleSheet(
            "QToolButton { padding: 3px 8px; font-size: 9pt; }"  # Minimal padding
            "QToolButton:checked { background-color: #4CAF50; color: white; }"
        )
        self.signature_btn.clicked.connect(lambda: self._select_tool(ToolType.SIGNATURE))
        layout.addWidget(self.signature_btn)

        # Separator
        separator1 = QFrame()
        separator1.setFrameShape(QFrame.VLine)
        separator1.setFrameShadow(QFrame.Sunken)
        layout.addWidget(separator1)

        # Text properties (only visible for text tool)
        self.text_props_widget = QWidget()
        text_props_layout = QHBoxLayout()
        text_props_layout.setContentsMargins(0, 0, 0, 0)
        text_props_layout.setSpacing(8)

        text_props_layout.addWidget(QLabel("Size:"))
        self.font_size_spin = QSpinBox()
        self.font_size_spin.setRange(8, 72)
        self.font_size_spin.setValue(12)
        self.font_size_spin.setSuffix("pt")
        self.font_size_spin.valueChanged.connect(self._on_font_size_changed)
        text_props_layout.addWidget(self.font_size_spin)

        text_props_layout.addWidget(QLabel("Color:"))
        self.color_display = QLabel()
        self.color_display.setFixedSize(30, 25)
        self.color_display.setStyleSheet(
            "QLabel { background-color: black; border: 1px solid #ccc; border-radius: 3px; }"
        )
        text_props_layout.addWidget(self.color_display)

        self.color_btn = QPushButton("Choose")
        self.color_btn.clicked.connect(self._choose_color)
        text_props_layout.addWidget(self.color_btn)

        self.text_props_widget.setLayout(text_props_layout)
        layout.addWidget(self.text_props_widget)

        # Spacer to push Apply button to the right
        layout.addStretch()

        # Separator
        separator2 = QFrame()
        separator2.setFrameShape(QFrame.VLine)
        separator2.setFrameShadow(QFrame.Sunken)
        layout.addWidget(separator2)

        # Apply Changes button (compact)
        self.apply_btn = QPushButton("💾 Apply Changes")
        self.apply_btn.setStyleSheet(
            "QPushButton {"
            "  background-color: #4CAF50;"
            "  color: white;"
            "  font-weight: bold;"
            "  font-size: 9pt;"  # Smaller font
            "  padding: 3px 12px;"  # Minimal padding
            "  border-radius: 3px;"
            "}"
            "QPushButton:hover {"
            "  background-color: #45a049;"
            "}"
            "QPushButton:disabled {"
            "  background-color: #cccccc;"
            "  color: #666666;"
            "}"
        )
        self.apply_btn.setEnabled(False)
        self.apply_btn.clicked.connect(self._on_apply_changes)
        layout.addWidget(self.apply_btn)

        self.setLayout(layout)
        self.setStyleSheet("QWidget { background-color: #f5f5f5; }")
        self.setMaximumHeight(28)  # Limit toolbar height

    def _select_tool(self, tool_type: ToolType):
        """Select a tool."""
        self.current_tool = tool_type

        # Update button states
        self.select_btn.setChecked(tool_type == ToolType.SELECT)
        self.text_btn.setChecked(tool_type == ToolType.TEXT)
        self.highlight_btn.setChecked(tool_type == ToolType.HIGHLIGHT)
        self.signature_btn.setChecked(tool_type == ToolType.SIGNATURE)

        # Show/hide text properties
        self.text_props_widget.setVisible(tool_type == ToolType.TEXT)

        self.tool_changed.emit(tool_type)
        logger.info(f"Selected tool: {tool_type.value}")

    def _choose_color(self):
        """Open color picker."""
        current_color = QColor(
            int(self.selected_color[0] * 255),
            int(self.selected_color[1] * 255),
            int(self.selected_color[2] * 255),
        )

        color = QColorDialog.getColor(current_color, self, "Choose Text Color")

        if color.isValid():
            self.selected_color = (
                color.red() / 255.0,
                color.green() / 255.0,
                color.blue() / 255.0,
            )
            self.color_display.setStyleSheet(
                f"QLabel {{ background-color: {color.name()}; border: 1px solid #ccc; border-radius: 3px; }}"
            )

    def _on_font_size_changed(self, value: int):
        """Handle font size change."""
        self.font_size = value

    def _on_apply_changes(self):
        """Handle Apply Changes button click."""
        self.apply_changes.emit()

    def get_current_tool(self) -> ToolType:
        """Get the currently selected tool."""
        return self.current_tool

    def get_text_color(self) -> tuple:
        """Get the selected text color (RGB 0-1)."""
        return self.selected_color

    def get_font_size(self) -> int:
        """Get the selected font size."""
        return self.font_size

    def enable_apply_button(self, enabled: bool):
        """Enable or disable the Apply Changes button."""
        self.apply_btn.setEnabled(enabled)

    def set_apply_button_text(self, text: str):
        """Set the Apply Changes button text."""
        self.apply_btn.setText(text)
