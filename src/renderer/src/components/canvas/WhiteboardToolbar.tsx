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
  Image as ImageIcon,
  HelpCircle,
  Undo,
  Redo
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
  | 'quiz'

interface Props {
  activeTool: WhiteboardTool
  onSelectTool: (tool: WhiteboardTool) => void
  penColor: string
  onChangePenColor: (color: string) => void
  penWidth: number
  onChangePenWidth: (width: number) => void
  onAddImage: () => void
  onUndo?: () => void
  onRedo?: () => void
}

const PEN_COLORS = [
  { label: 'White', value: '#D8DAE0' },
  { label: 'Gray', value: '#727683' },
  { label: 'Blue', value: '#4A6B8A' },
  { label: 'Emerald', value: '#38664B' },
  { label: 'Amber', value: '#8C6D37' },
  { label: 'Purple', value: '#584C6B' }
]

export const WhiteboardToolbar: React.FC<Props> = ({
  activeTool,
  onSelectTool,
  penColor,
  onChangePenColor,
  penWidth,
  onChangePenWidth,
  onAddImage,
  onUndo,
  onRedo
}) => {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 p-1.5 rounded-xl bg-[#141519]/95 border border-[#22242b] shadow-2xl backdrop-blur-md select-none">
      {/* Primary Tools */}
      <button
        onClick={() => onSelectTool('select')}
        className={`p-2 rounded-lg text-xs transition-colors ${activeTool === 'select' ? 'bg-[#22242b] text-[#D8DAE0]' : 'text-[#727683] hover:text-[#D8DAE0] hover:bg-[#1b1c22]'}`}
        title="Select & Move (V)"
      >
        <MousePointer className="w-4 h-4" />
      </button>

      <button
        onClick={() => onSelectTool('hand')}
        className={`p-2 rounded-lg text-xs transition-colors ${activeTool === 'hand' ? 'bg-[#22242b] text-[#D8DAE0]' : 'text-[#727683] hover:text-[#D8DAE0] hover:bg-[#1b1c22]'}`}
        title="Pan Canvas (H)"
      >
        <Hand className="w-4 h-4" />
      </button>

      <div className="w-px h-5 bg-[#22242b] mx-0.5" />

      <button
        onClick={() => onSelectTool('pen')}
        className={`p-2 rounded-lg text-xs transition-colors ${activeTool === 'pen' ? 'bg-[#22242b] text-[#D8DAE0]' : 'text-[#727683] hover:text-[#D8DAE0] hover:bg-[#1b1c22]'}`}
        title="Draw / Pen (P)"
      >
        <PenTool className="w-4 h-4" />
      </button>

      <button
        onClick={() => onSelectTool('eraser')}
        className={`p-2 rounded-lg text-xs transition-colors ${activeTool === 'eraser' ? 'bg-[#22242b] text-[#D8DAE0]' : 'text-[#727683] hover:text-[#D8DAE0] hover:bg-[#1b1c22]'}`}
        title="Eraser (E)"
      >
        <Eraser className="w-4 h-4" />
      </button>

      <div className="w-px h-5 bg-[#22242b] mx-0.5" />

      <button
        onClick={() => onSelectTool('text')}
        className={`p-2 rounded-lg text-xs transition-colors ${activeTool === 'text' ? 'bg-[#22242b] text-[#D8DAE0]' : 'text-[#727683] hover:text-[#D8DAE0] hover:bg-[#1b1c22]'}`}
        title="Markdown Note (T)"
      >
        <FileText className="w-4 h-4" />
      </button>

      <button
        onClick={() => onSelectTool('sticky')}
        className={`p-2 rounded-lg text-xs transition-colors ${activeTool === 'sticky' ? 'bg-[#22242b] text-[#D8DAE0]' : 'text-[#727683] hover:text-[#D8DAE0] hover:bg-[#1b1c22]'}`}
        title="Sticky Note (S)"
      >
        <StickyNote className="w-4 h-4" />
      </button>

      <button
        onClick={() => onSelectTool('rectangle')}
        className={`p-2 rounded-lg text-xs transition-colors ${activeTool === 'rectangle' ? 'bg-[#22242b] text-[#D8DAE0]' : 'text-[#727683] hover:text-[#D8DAE0] hover:bg-[#1b1c22]'}`}
        title="Rectangle (R)"
      >
        <Square className="w-4 h-4" />
      </button>

      <button
        onClick={() => onSelectTool('ellipse')}
        className={`p-2 rounded-lg text-xs transition-colors ${activeTool === 'ellipse' ? 'bg-[#22242b] text-[#D8DAE0]' : 'text-[#727683] hover:text-[#D8DAE0] hover:bg-[#1b1c22]'}`}
        title="Circle / Ellipse (O)"
      >
        <Circle className="w-4 h-4" />
      </button>

      <button
        onClick={() => onSelectTool('arrow')}
        className={`p-2 rounded-lg text-xs transition-colors ${activeTool === 'arrow' ? 'bg-[#22242b] text-[#D8DAE0]' : 'text-[#727683] hover:text-[#D8DAE0] hover:bg-[#1b1c22]'}`}
        title="Connector Arrow (A)"
      >
        <ArrowUpRight className="w-4 h-4" />
      </button>

      <button
        onClick={onAddImage}
        className="p-2 rounded-lg text-xs text-[#727683] hover:text-[#D8DAE0] hover:bg-[#1b1c22] transition-colors"
        title="Insert Image / Paste (I)"
      >
        <ImageIcon className="w-4 h-4" />
      </button>

      <button
        onClick={() => onSelectTool('quiz')}
        className={`p-2 rounded-lg text-xs transition-colors ${activeTool === 'quiz' ? 'bg-[#22242b] text-[#D8DAE0]' : 'text-[#727683] hover:text-[#D8DAE0] hover:bg-[#1b1c22]'}`}
        title="Active Recall Card (Q)"
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {/* Pen Options Popup */}
      {activeTool === 'pen' && (
        <div className="flex items-center gap-1 ml-2 pl-2 border-l border-[#22242b]">
          {PEN_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => onChangePenColor(c.value)}
              style={{ backgroundColor: c.value }}
              className={`w-3.5 h-3.5 rounded-full border transition-transform ${penColor === c.value ? 'scale-125 border-white' : 'border-transparent opacity-70 hover:opacity-100'}`}
              title={c.label}
            />
          ))}
          <div className="w-px h-3 bg-[#22242b] mx-1" />
          {[2, 4, 8].map((w) => (
            <button
              key={w}
              onClick={() => onChangePenWidth(w)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${penWidth === w ? 'bg-[#22242b] text-white font-bold' : 'text-[#727683] hover:text-white'}`}
            >
              {w}px
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
