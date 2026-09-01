import React from 'react'
import {
  MousePointer,
  Hand,
  PenTool,
  Eraser,
  FileText,
  StickyNote,
  Square,
  Circle,
  ArrowUpRight,
  GitCommit,
  Image as ImageIcon,
  HelpCircle
} from 'lucide-react'

export type WhiteboardTool =
  | 'select'
  | 'hand'
  | 'pen'
  | 'eraser'
  | 'text'
  | 'sticky'
  | 'rectangle'
  | 'ellipse'
  | 'arrow'
  | 'soft_link'
  | 'quiz'

interface Props {
  activeTool: WhiteboardTool
  onSelectTool: (tool: WhiteboardTool) => void
  penColor: string
  onChangePenColor: (color: string) => void
  penWidth: number
  onChangePenWidth: (width: number) => void
  onAddImage: () => void
}

const PEN_COLORS = [
  { label: 'Jasny Fiolet', value: '#c084fc' },
  { label: 'Elektryczny Fiolet', value: '#a855f7' },
  { label: 'Głęboki Fiolet', value: '#7c3aed' },
  { label: 'Błękit Indygo', value: '#818cf8' },
  { label: 'Nocny Granat', value: '#38bdf8' },
  { label: 'Śnieżna Biel', value: '#f8fafc' },
  { label: 'Popielata Lawenda', value: '#94a3b8' }
]

export const WhiteboardToolbar: React.FC<Props> = ({
  activeTool,
  onSelectTool,
  penColor,
  onChangePenColor,
  penWidth,
  onChangePenWidth,
  onAddImage
}) => {
  const getToolBtnClass = (tool: WhiteboardTool) => {
    const isActive = activeTool === tool
    return `relative p-2 rounded-xl text-xs transition-all flex items-center justify-center group ${
      isActive
        ? 'bg-[#a855f7]/20 text-[#c084fc] border border-[#a855f7]/50 shadow-[0_0_12px_rgba(168,85,247,0.25)]'
        : 'text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#16142e] border border-transparent'
    }`
  }

  const renderTooltip = (text: string) => (
    <div className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-[#0f1123] border border-[#28254c] text-[#f8fafc] text-[10px] rounded-lg font-medium pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl z-50">
      {text}
    </div>
  )

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 p-2 rounded-2xl glass-toolbar select-none border border-[#28254c]">
      {/* Primary Selection Tools */}
      <button
        onClick={() => onSelectTool('select')}
        className={getToolBtnClass('select')}
      >
        <MousePointer className="w-4 h-4" />
        {renderTooltip('Kursor / Wybór [V]')}
      </button>

      <button
        onClick={() => onSelectTool('hand')}
        className={getToolBtnClass('hand')}
      >
        <Hand className="w-4 h-4" />
        {renderTooltip('Ręka / Przesuwanie [H] (lub PPM drag)')}
      </button>

      <div className="w-px h-5 bg-[#28254c] mx-0.5" />

      {/* Drawing Tools */}
      <button
        onClick={() => onSelectTool('pen')}
        className={getToolBtnClass('pen')}
      >
        <PenTool className="w-4 h-4" />
        {renderTooltip('Rysuj odręcznie [P]')}
      </button>

      <button
        onClick={() => onSelectTool('eraser')}
        className={getToolBtnClass('eraser')}
      >
        <Eraser className="w-4 h-4" />
        {renderTooltip('Gumka [E]')}
      </button>

      <div className="w-px h-5 bg-[#28254c] mx-0.5" />

      {/* Cards & Text Tools */}
      <button
        onClick={() => onSelectTool('text')}
        className={getToolBtnClass('text')}
      >
        <FileText className="w-4 h-4" />
        {renderTooltip('Notatka Markdown [T]')}
      </button>

      <button
        onClick={() => onSelectTool('sticky')}
        className={getToolBtnClass('sticky')}
      >
        <StickyNote className="w-4 h-4" />
        {renderTooltip('Karteczka Sticky [S]')}
      </button>

      <button
        onClick={() => onSelectTool('rectangle')}
        className={getToolBtnClass('rectangle')}
      >
        <Square className="w-4 h-4" />
        {renderTooltip('Prostokąt / Sekcja [R]')}
      </button>

      <button
        onClick={() => onSelectTool('ellipse')}
        className={getToolBtnClass('ellipse')}
      >
        <Circle className="w-4 h-4" />
        {renderTooltip('Koło / Elipsa [O]')}
      </button>

      <div className="w-px h-5 bg-[#28254c] mx-0.5" />

      {/* Connection Connectors */}
      <button
        onClick={() => onSelectTool('arrow')}
        className={getToolBtnClass('arrow')}
      >
        <ArrowUpRight className="w-4 h-4" />
        {renderTooltip('Strzałka relacji [A]')}
      </button>

      <button
        onClick={() => onSelectTool('soft_link')}
        className={getToolBtnClass('soft_link')}
      >
        <GitCommit className="w-4 h-4" />
        {renderTooltip('Subtelny link grafu [L]')}
      </button>

      <button
        onClick={onAddImage}
        className="relative p-2 rounded-xl text-xs text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#16142e] transition-all flex items-center justify-center group"
      >
        <ImageIcon className="w-4 h-4" />
        {renderTooltip('Wstaw zdjęcie [I] (lub Ctrl+V)')}
      </button>

      <button
        onClick={() => onSelectTool('quiz')}
        className={getToolBtnClass('quiz')}
      >
        <HelpCircle className="w-4 h-4" />
        {renderTooltip('Fiszka Active Recall [Q]')}
      </button>

      {/* Pen Options Popup */}
      {activeTool === 'pen' && (
        <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-[#28254c]">
          {PEN_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => onChangePenColor(c.value)}
              style={{ backgroundColor: c.value }}
              className={`w-4 h-4 rounded-full border transition-all ${
                penColor === c.value ? 'scale-125 border-white ring-2 ring-[#a855f7]/60' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
              title={c.label}
            />
          ))}
          <div className="w-px h-3 bg-[#28254c] mx-1" />
          {[2, 4, 8].map((w) => (
            <button
              key={w}
              onClick={() => onChangePenWidth(w)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                penWidth === w ? 'bg-[#a855f7]/20 text-[#c084fc] border border-[#a855f7]/40 font-bold' : 'text-[#94a3b8] hover:text-[#f8fafc]'
              }`}
            >
              {w}px
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
