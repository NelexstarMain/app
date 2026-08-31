import React, { useState, useRef, useEffect } from 'react'
import { CanvasDocument, CanvasNode, CanvasEdge } from '../../../../shared/types/canvas'
import { Plus, User, HelpCircle, Eye, EyeOff, LayoutGrid, RotateCw, ZoomIn, ZoomOut } from 'lucide-react'
import { IpcChannel } from '../../../../shared/ipc/channels'

interface Props {
  document: CanvasDocument
  sessionCreatedNodeIds: string[]
  onDocumentChanged: (doc: CanvasDocument) => void
  onActivity: () => void
  onNodeAdded?: (nodeId: string) => void
}

export const CanvasViewport: React.FC<Props> = ({
  document,
  sessionCreatedNodeIds,
  onDocumentChanged,
  onActivity,
  onNodeAdded
}) => {
  const [doc, setDoc] = useState<CanvasDocument>(document)
  const [pan, setPan] = useState({ x: document.viewport.x || 0, y: document.viewport.y || 0 })
  const [zoom, setZoom] = useState(document.viewport.zoom || 1.0)
  const [isPanning, setIsPanning] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)
  const [nodeOffset, setNodeOffset] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setDoc(document)
  }, [document])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'svg') {
      setIsPanning(true)
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
      onActivity()
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
      onActivity()
    } else if (draggedNodeId) {
      const updatedNodes = doc.nodes.map((n) => {
        if (n.id === draggedNodeId) {
          const newX = (e.clientX - pan.x - nodeOffset.x) / zoom
          const newY = (e.clientY - pan.y - nodeOffset.y) / zoom
          return { ...n, x: Math.round(newX), y: Math.round(newY) }
        }
        return n
      })
      const updatedDoc = { ...doc, nodes: updatedNodes }
      setDoc(updatedDoc)
      onActivity()
    }
  }

  const handleMouseUp = () => {
    if (isPanning) setIsPanning(false)
    if (draggedNodeId) {
      setDraggedNodeId(null)
      onDocumentChanged(doc)
    }
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    onActivity()
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92
    const newZoom = Math.max(0.2, Math.min(2.5, zoom * zoomFactor))
    setZoom(newZoom)
  }

  // Handle Drag & Drop from Asset Drawer
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    onActivity()
    const rawData = e.dataTransfer.getData('application/x-cogni-entity')
    if (!rawData) return

    const payload = JSON.parse(rawData)
    const rect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 }
    const dropX = (e.clientX - rect.left - pan.x) / zoom
    const dropY = (e.clientY - rect.top - pan.y) / zoom

    const isQuizMode = e.altKey || payload.isQuizMode

    let newNode: CanvasNode
    if (isQuizMode) {
      newNode = {
        id: `node_quiz_${Date.now()}`,
        type: 'quiz_card',
        x: Math.round(dropX),
        y: Math.round(dropY),
        width: 280,
        height: 160,
        color: '#F59E0B',
        data: {
          srs_card_id: `q_${Date.now()}`,
          question: `Pytanie o ${payload.title}:`,
          answer: payload.defaultQuestionSnippet || 'Przykładowa kluczowa odpowiedź',
          is_flipped: false
        }
      }
    } else {
      newNode = {
        id: `node_ent_${Date.now()}`,
        type: 'visual_entity_node',
        x: Math.round(dropX),
        y: Math.round(dropY),
        width: 260,
        height: 280,
        color: '#8B5CF6',
        data: {
          entity_id: payload.entityId,
          override_label: payload.title,
          display_mode: 'card_with_preview',
          show_backlink_badge: true,
          title: payload.title,
          thumb_path: payload.mediaThumbPath
        }
      }
    }

    const updatedDoc = { ...doc, nodes: [...doc.nodes, newNode] }
    setDoc(updatedDoc)
    onDocumentChanged(updatedDoc)
    if (onNodeAdded) onNodeAdded(newNode.id)
  }

  const handleAddTextCard = () => {
    const newNode: CanvasNode = {
      id: `node_txt_${Date.now()}`,
      type: 'text_card',
      x: Math.round((-pan.x + 200) / zoom),
      y: Math.round((-pan.y + 200) / zoom),
      width: 280,
      height: 180,
      color: '#3B82F6',
      data: {
        title: 'Nowa Karta Myśli',
        markdown: 'Wpisz treść notatki wizualnej...'
      }
    }
    const updatedDoc = { ...doc, nodes: [...doc.nodes, newNode] }
    setDoc(updatedDoc)
    onDocumentChanged(updatedDoc)
    if (onNodeAdded) onNodeAdded(newNode.id)
  }

  const toggleFlipQuiz = (nodeId: string) => {
    const updated = doc.nodes.map((n) => {
      if (n.id === nodeId && n.type === 'quiz_card') {
        return {
          ...n,
          data: { ...n.data, is_flipped: !n.data.is_flipped }
        }
      }
      return n
    })
    const newDoc = { ...doc, nodes: updated }
    setDoc(newDoc)
    onDocumentChanged(newDoc)
  }

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="h-full w-full bg-[#070A12] relative overflow-hidden select-none cursor-grab active:cursor-grabbing"
    >
      {/* Background Dot Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)',
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`
        }}
      />

      {/* Canvas Viewport Toolbar */}
      <div className="absolute top-4 left-4 z-30 flex items-center gap-2 frosted-glass p-1.5 rounded-xl border border-synapse-border/60">
        <button
          onClick={handleAddTextCard}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Card</span>
        </button>

        <div className="h-4 w-px bg-synapse-border/60 mx-1" />

        <button
          onClick={() => setZoom((z) => Math.min(2.0, z + 0.15))}
          className="p-1.5 rounded-lg hover:bg-synapse-surface text-synapse-muted hover:text-white text-xs"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <span className="text-[11px] font-mono text-synapse-muted w-10 text-center">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom((z) => Math.max(0.3, z - 0.15))}
          className="p-1.5 rounded-lg hover:bg-synapse-surface text-synapse-muted hover:text-white text-xs"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* SVG Edges Layer */}
      <svg
        className="absolute inset-0 pointer-events-none w-full h-full"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
      >
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#60A5FA" />
          </marker>
        </defs>

        {doc.edges.map((edge) => {
          const fromNode = doc.nodes.find((n) => n.id === edge.fromNode)
          const toNode = doc.nodes.find((n) => n.id === edge.toNode)
          if (!fromNode || !toNode) return null

          const x1 = fromNode.x + fromNode.width
          const y1 = fromNode.y + fromNode.height / 2
          const x2 = toNode.x
          const y2 = toNode.y + toNode.height / 2

          return (
            <g key={edge.id}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={edge.color || '#60A5FA'}
                strokeWidth="2.5"
                strokeDasharray={edge.style === 'dashed' ? '6 4' : undefined}
                markerEnd="url(#arrow)"
              />
              {edge.label && (
                <text
                  x={(x1 + x2) / 2}
                  y={(y1 + y2) / 2 - 8}
                  fill="#94A3B8"
                  fontSize="11"
                  fontFamily="sans-serif"
                  fontWeight="600"
                  textAnchor="middle"
                  className="bg-synapse-bg"
                >
                  {edge.label}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* Nodes Layer */}
      <div
        className="absolute inset-0 pointer-events-none w-full h-full"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
      >
        {doc.nodes.map((node) => {
          const isSessionGlow = sessionCreatedNodeIds.includes(node.id)

          return (
            <div
              key={node.id}
              style={{
                transform: `translate(${node.x}px, ${node.y}px)`,
                width: `${node.width}px`,
                minHeight: `${node.height}px`
              }}
              onMouseDown={(e) => {
                e.stopPropagation()
                setDraggedNodeId(node.id)
                const rect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 }
                setNodeOffset({
                  x: e.clientX - rect.left - pan.x - node.x * zoom,
                  y: e.clientY - rect.top - pan.y - node.y * zoom
                })
                onActivity()
              }}
              className={`absolute pointer-events-auto rounded-2xl border transition-shadow cursor-move flex flex-col p-4 shadow-xl ${
                isSessionGlow
                  ? 'glowing-node border-emerald-400 bg-synapse-card/90 shadow-emerald-500/30'
                  : 'border-synapse-border bg-synapse-card/90 hover:border-synapse-border/90'
              }`}
            >
              {/* Text Card */}
              {node.type === 'text_card' && (
                <div className="flex-1 flex flex-col">
                  <div className="text-xs font-bold text-sky-400 mb-2 pb-1 border-b border-synapse-border/40 truncate">
                    {node.data?.title || 'Note Card'}
                  </div>
                  <div className="text-[11px] text-synapse-text/90 leading-relaxed font-sans">
                    {node.data?.markdown || ''}
                  </div>
                </div>
              )}

              {/* Visual Entity Node */}
              {node.type === 'visual_entity_node' && (
                <div className="flex-1 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-purple-500/20 text-purple-300 flex items-center justify-center border border-purple-500/40 shadow-inner mb-3 mt-1">
                    <User className="w-8 h-8 text-purple-400" />
                  </div>
                  <div className="text-xs font-bold text-white mb-0.5">{node.data?.title || node.data?.override_label}</div>
                  <div className="text-[10px] text-purple-400 font-mono mb-2">{node.data?.entity_id}</div>
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-[10px] text-purple-300">
                    <span>Visual Entity Node</span>
                  </div>
                </div>
              )}

              {/* Quiz Card */}
              {node.type === 'quiz_card' && (
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2 text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                      <span className="flex items-center gap-1">
                        <HelpCircle className="w-3.5 h-3.5" />
                        Active Recall
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-white mb-2">{node.data?.question}</div>
                  </div>

                  <div className="pt-2 border-t border-synapse-border/40">
                    {node.data?.is_flipped ? (
                      <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-[11px] text-emerald-300 font-medium animate-in fade-in">
                        {node.data?.answer}
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleFlipQuiz(node.id)
                        }}
                        className="w-full py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Show Answer</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
