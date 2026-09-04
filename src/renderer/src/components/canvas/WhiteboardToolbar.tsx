import React from 'react'
import {
  MousePointer,
  Hand,
  FileText,
  StickyNote,
  Square,
  BoxSelect,
  Image as ImageIcon,
  ArrowUpRight,
  Eraser
} from 'lucide-react'

export type WhiteboardTool =
  | 'select'
  | 'hand'
  | 'text'
  | 'sticky'
  | 'rectangle'
  | 'frame'
  | 'arrow'
  | 'eraser'

interface Props {
  activeTool: WhiteboardTool
  onSelectTool: (tool: WhiteboardTool) => void
  onAddImage: () => void
}

export const WhiteboardToolbar: React.FC<Props> = ({
  activeTool,
  onSelectTool,
  onAddImage
}) => {
  const getToolBtnClass = (tool: WhiteboardTool) => {
    const isActive = activeTool === tool
    return `relative p-2 rounded-[5px] text-xs transition-all flex items-center justify-center group ${
      isActive
        ? 'bg-[#25143a] text-[#c084fc] border border-[#a855f7] shadow-[0_0_12px_rgba(168,85,247,0.25)]'
        : 'text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#15182a] border border-transparent'
    }`
  }

  const renderTooltip = (text: string) => (
    <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-[#0a0c16] border border-[#422066] text-[#f8fafc] text-[10px] rounded-[3px] font-mono pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl z-50">
      {text}
    </div>
  )

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 p-1.5 rounded-[7px] glass-toolbar select-none border border-[#422066] specular-border">
      {/* Moduł 1: Nawigacja */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onSelectTool('select')}
          className={getToolBtnClass('select')}
        >
          <MousePointer className="w-3.5 h-3.5" />
          {renderTooltip('Wskaźnik [V]')}
        </button>

        <button
          onClick={() => onSelectTool('hand')}
          className={getToolBtnClass('hand')}
        >
          <Hand className="w-3.5 h-3.5" />
          {renderTooltip('Rączka / Przesuwanie [H]')}
        </button>
      </div>

      <div className="w-px h-4 bg-[#422066] mx-0.5" />

      {/* Moduł 2: Obiekty */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onSelectTool('text')}
          className={getToolBtnClass('text')}
        >
          <FileText className="w-3.5 h-3.5" />
          {renderTooltip('Karta Markdown [T]')}
        </button>

        <button
          onClick={() => onSelectTool('sticky')}
          className={getToolBtnClass('sticky')}
        >
          <StickyNote className="w-3.5 h-3.5" />
          {renderTooltip('Karteczka Sticky [S]')}
        </button>

        <button
          onClick={() => onSelectTool('rectangle')}
          className={getToolBtnClass('rectangle')}
        >
          <Square className="w-3.5 h-3.5" />
          {renderTooltip('Kształt [R]')}
        </button>

        <button
          onClick={() => onSelectTool('frame')}
          className={getToolBtnClass('frame')}
        >
          <BoxSelect className="w-3.5 h-3.5" />
          {renderTooltip('Ramka Grupy [F] (Ctrl+G)')}
        </button>

        <button
          onClick={onAddImage}
          className="relative p-2 rounded-[5px] text-xs text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#15182a] border border-transparent transition-all flex items-center justify-center group"
        >
          <ImageIcon className="w-3.5 h-3.5" />
          {renderTooltip('Obraz [I] (lub Ctrl+V)')}
        </button>
      </div>

      <div className="w-px h-4 bg-[#422066] mx-0.5" />

      {/* Moduł 3: Narzędzia */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onSelectTool('arrow')}
          className={getToolBtnClass('arrow')}
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          {renderTooltip('Łącznik / Strzałka [L]')}
        </button>

        <button
          onClick={() => onSelectTool('eraser')}
          className={getToolBtnClass('eraser')}
        >
          <Eraser className="w-3.5 h-3.5" />
          {renderTooltip('Gumka obszarowa [E]')}
        </button>
      </div>
    </div>
  )
}

