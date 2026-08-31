import React, { useState, useRef, useEffect } from 'react'
import { CanvasDocument, CanvasNode, CanvasEdge, EdgeSide } from '../../../../shared/types/canvas'
import { WhiteboardToolbar, WhiteboardTool } from './WhiteboardToolbar'
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  User,
  HelpCircle,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  Link2,
  FileText,
  Palette,
  ChevronUp,
  ChevronDown,
  Layers,
  Sparkles
} from 'lucide-react'
import { IpcChannel } from '../../../../shared/ipc/channels'

interface Props {
  document: CanvasDocument
  sessionCreatedNodeIds: string[]
  onDocumentChanged: (doc: CanvasDocument) => void
  onActivity: () => void
  onNodeAdded?: (nodeId: string) => void
  onOpenNote?: (notePath: string) => void
  onOpenCanvas?: (canvasPath: string) => void
}

export const CanvasViewport: React.FC<Props> = ({
  document,
  sessionCreatedNodeIds,
  onDocumentChanged,
  onActivity,
  onNodeAdded,
  onOpenNote,
  onOpenCanvas
}) => {
  const [doc, setDoc] = useState<CanvasDocument>(document)
  const [activeTool, setActiveTool] = useState<WhiteboardTool>('select')
  const [penColor, setPenColor] = useState('#f4f4f5')
  const [penWidth, setPenWidth] = useState(3)

  // Infinite Viewport Pan & Zoom
  const [pan, setPan] = useState({ x: document.viewport.x || 0, y: document.viewport.y || 0 })
  const [zoom, setZoom] = useState(document.viewport.zoom || 1.0)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })

  // Node selection & dragging
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)

  // Freehand drawing stroke
  const [currentStroke, setCurrentStroke] = useState<Array<{ x: number; y: number }>>([])
  const [isDrawing, setIsDrawing] = useState(false)

  // Arrow connector
  const [connectingFrom, setConnectingFrom] = useState<{ nodeId: string; side: EdgeSide; isSoft?: boolean } | null>(null)
  const [connectingMousePos, setConnectingMousePos] = useState<{ x: number; y: number } | null>(null)

  // Related Canvases Drawer
  const [relatedDrawerOpen, setRelatedDrawerOpen] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setDoc(document)
  }, [document])

  const notifyChange = (updatedDoc: CanvasDocument) => {
    setDoc(updatedDoc)
    onDocumentChanged(updatedDoc)
  }

  // Paste Support (Images & Text)
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const activeEl = window.document.activeElement
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return // Let input handle regular text pasting
      }

      const items = e.clipboardData?.items
      if (!items) return

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile()
          if (!file) continue
          const reader = new FileReader()
          reader.onload = async (event) => {
            const base64 = event.target?.result as string
            const res = await window.electronAPI.invoke(IpcChannel.ASSET_INGEST, {
              fileName: `pasted_${Date.now()}.png`,
              title: `Obraz ${new Date().toLocaleTimeString()}`,
              base64Data: base64,
              archetype: 'artwork'
            })

            if (res.entity) {
              const newNode: CanvasNode = {
                id: `node_img_${Date.now()}`,
                type: 'image_node',
                x: Math.round((-pan.x + window.innerWidth / 2) / zoom),
                y: Math.round((-pan.y + window.innerHeight / 2) / zoom),
                width: 280,
                height: 220,
                data: {
                  src: base64,
                  title: res.entity.title,
                  entity_id: res.entity.entity_id,
                  linked_note_id: res.entity.linked_note_id
                }
              }
              const updatedDoc = { ...doc, nodes: [...doc.nodes, newNode] }
              notifyChange(updatedDoc)
              if (onNodeAdded) onNodeAdded(newNode.id)
            }
          }
          reader.readAsDataURL(file)
          break
        }
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [doc, pan, zoom])

  // Keyboard Shortcuts (Delete, V, H, P, E, T, S, R, O, A, L, Q)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = window.document.activeElement
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return // NEVER intercept keyboard when typing in inputs/textareas
      }
      if (editingNodeId) return

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeIds.length > 0) {
          const updatedNodes = doc.nodes.filter((n) => !selectedNodeIds.includes(n.id))
          const updatedEdges = doc.edges.filter(
            (edge) => !selectedNodeIds.includes(edge.fromNode) && !selectedNodeIds.includes(edge.toNode)
          )
          setSelectedNodeIds([])
          notifyChange({ ...doc, nodes: updatedNodes, edges: updatedEdges })
        }
      } else if (e.key === 'v' || e.key === 'V') {
        setActiveTool('select')
      } else if (e.key === 'h' || e.key === 'H') {
        setActiveTool('hand')
      } else if (e.key === 'p' || e.key === 'P') {
        setActiveTool('pen')
      } else if (e.key === 'e' || e.key === 'E') {
        setActiveTool('eraser')
      } else if (e.key === 't' || e.key === 'T') {
        setActiveTool('text')
      } else if (e.key === 's' || e.key === 'S') {
        setActiveTool('sticky')
      } else if (e.key === 'r' || e.key === 'R') {
        setActiveTool('rectangle')
      } else if (e.key === 'o' || e.key === 'O') {
        setActiveTool('ellipse')
      } else if (e.key === 'a' || e.key === 'A') {
        setActiveTool('arrow')
      } else if (e.key === 'l' || e.key === 'L') {
        setActiveTool('soft_link')
      } else if (e.key === 'q' || e.key === 'Q') {
        setActiveTool('quiz')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [doc, selectedNodeIds, editingNodeId])

  // Coordinate Conversion
  const toWorldCoords = (clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 }
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom
    }
  }

  // Mouse Down (Includes Right Mouse Button Pan)
  const handleMouseDown = (e: React.MouseEvent) => {
    onActivity()
    const world = toWorldCoords(e.clientX, e.clientY)

    // Right Click Pan OR Hand tool OR Middle button
    if (e.button === 2 || e.button === 1 || activeTool === 'hand') {
      setIsPanning(true)
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
      return
    }

    // Pen tool
    if (activeTool === 'pen' && e.button === 0) {
      setIsDrawing(true)
      setCurrentStroke([{ x: world.x, y: world.y }])
      return
    }

    // Creating new objects by clicking
    if (e.button === 0) {
      if (activeTool === 'text') {
        const newNode: CanvasNode = {
          id: `node_txt_${Date.now()}`,
          type: 'text_card',
          x: Math.round(world.x),
          y: Math.round(world.y),
          width: 280,
          height: 180,
          data: {
            title: 'Notatka',
            markdown: 'Zacznij pisać treść notatki...'
          }
        }
        notifyChange({ ...doc, nodes: [...doc.nodes, newNode] })
        if (onNodeAdded) onNodeAdded(newNode.id)
        setSelectedNodeIds([newNode.id])
        setEditingNodeId(newNode.id)
        setActiveTool('select')
        return
      }

      if (activeTool === 'sticky') {
        const newNode: CanvasNode = {
          id: `node_sticky_${Date.now()}`,
          type: 'sticky_note',
          x: Math.round(world.x),
          y: Math.round(world.y),
          width: 190,
          height: 190,
          data: {
            text: 'Wpisz myśl...',
            color: 'yellow'
          }
        }
        notifyChange({ ...doc, nodes: [...doc.nodes, newNode] })
        if (onNodeAdded) onNodeAdded(newNode.id)
        setSelectedNodeIds([newNode.id])
        setEditingNodeId(newNode.id)
        setActiveTool('select')
        return
      }

      if (activeTool === 'rectangle' || activeTool === 'ellipse') {
        const newNode: CanvasNode = {
          id: `node_shape_${Date.now()}`,
          type: 'shape',
          x: Math.round(world.x),
          y: Math.round(world.y),
          width: 240,
          height: 160,
          data: {
            shapeType: activeTool,
            label: activeTool === 'rectangle' ? 'Obszar / Sekcja' : 'Pojęcie',
            text: '',
            fillColor: 'rgba(39, 39, 42, 0.5)',
            borderColor: '#38bdf8'
          }
        }
        notifyChange({ ...doc, nodes: [...doc.nodes, newNode] })
        if (onNodeAdded) onNodeAdded(newNode.id)
        setSelectedNodeIds([newNode.id])
        setEditingNodeId(newNode.id)
        setActiveTool('select')
        return
      }

      if (activeTool === 'quiz') {
        const newNode: CanvasNode = {
          id: `node_quiz_${Date.now()}`,
          type: 'quiz_card',
          x: Math.round(world.x),
          y: Math.round(world.y),
          width: 280,
          height: 200,
          data: {
            srs_card_id: `q_${Date.now()}`,
            question: 'Wpisz pytanie sprawdzające...',
            answer: 'Wpisz poprawną odpowiedź',
            is_flipped: false
          }
        }
        notifyChange({ ...doc, nodes: [...doc.nodes, newNode] })
        if (onNodeAdded) onNodeAdded(newNode.id)
        setSelectedNodeIds([newNode.id])
        setEditingNodeId(newNode.id)
        setActiveTool('select')
        return
      }

      // Default Canvas Background Click
      if (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'svg') {
        setSelectedNodeIds([])
        setEditingNodeId(null)
        setIsPanning(true)
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
      }
    }
  }

  // Mouse Move
  const handleMouseMove = (e: React.MouseEvent) => {
    const world = toWorldCoords(e.clientX, e.clientY)

    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y })
      onActivity()
    } else if (isDrawing && activeTool === 'pen') {
      setCurrentStroke((prev) => [...prev, { x: world.x, y: world.y }])
      onActivity()
    } else if (draggedNodeId) {
      const updated = doc.nodes.map((n) => {
        if (n.id === draggedNodeId) {
          return {
            ...n,
            x: Math.round(world.x - dragOffset.x),
            y: Math.round(world.y - dragOffset.y)
          }
        }
        return n
      })
      setDoc({ ...doc, nodes: updated })
      onActivity()
    }

    if (connectingFrom) {
      setConnectingMousePos(world)
    }
  }

  // Mouse Up
  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false)
    }

    if (isDrawing && currentStroke.length > 1) {
      const newStrokeNode: CanvasNode = {
        id: `stroke_${Date.now()}`,
        type: 'drawing_stroke',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        data: {
          points: currentStroke,
          color: penColor,
          width: penWidth
        }
      }
      notifyChange({ ...doc, nodes: [...doc.nodes, newStrokeNode] })
      setCurrentStroke([])
      setIsDrawing(false)
    }

    if (draggedNodeId) {
      setDraggedNodeId(null)
      onDocumentChanged(doc)
    }

    if (connectingFrom) {
      setConnectingFrom(null)
      setConnectingMousePos(null)
    }
  }

  // Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    onActivity()
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92
    const newZoom = Math.max(0.15, Math.min(3.0, zoom * zoomFactor))
    setZoom(newZoom)
  }

  // Adding Image
  const handleAddImage = () => {
    const input = window.document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64 = e.target?.result as string
        const res = await window.electronAPI.invoke(IpcChannel.ASSET_INGEST, {
          fileName: file.name,
          title: file.name.replace(/\.[^/.]+$/, ''),
          base64Data: base64,
          archetype: 'artwork'
        })
        if (res.entity) {
          const newNode: CanvasNode = {
            id: `node_img_${Date.now()}`,
            type: 'image_node',
            x: Math.round((-pan.x + window.innerWidth / 2) / zoom),
            y: Math.round((-pan.y + window.innerHeight / 2) / zoom),
            width: 280,
            height: 220,
            data: {
              src: base64,
              title: res.entity.title,
              entity_id: res.entity.entity_id,
              linked_note_id: res.entity.linked_note_id
            }
          }
          notifyChange({ ...doc, nodes: [...doc.nodes, newNode] })
          if (onNodeAdded) onNodeAdded(newNode.id)
        }
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }

  // Anchor Handlers
  const handleAnchorMouseDown = (e: React.MouseEvent, nodeId: string, side: EdgeSide) => {
    e.stopPropagation()
    const world = toWorldCoords(e.clientX, e.clientY)
    const isSoft = activeTool === 'soft_link'
    setConnectingFrom({ nodeId, side, isSoft })
    setConnectingMousePos(world)
  }

  const handleAnchorMouseUp = (e: React.MouseEvent, targetNodeId: string, targetSide: EdgeSide) => {
    e.stopPropagation()
    if (connectingFrom && connectingFrom.nodeId !== targetNodeId) {
      const isSoft = connectingFrom.isSoft || activeTool === 'soft_link'
      const newEdge: CanvasEdge = {
        id: `edge_${Date.now()}`,
        fromNode: connectingFrom.nodeId,
        fromSide: connectingFrom.side,
        toNode: targetNodeId,
        toSide: targetSide,
        label: isSoft ? 'POWIĄZANIE' : 'RELACJA',
        color: isSoft ? '#71717a' : '#38bdf8',
        style: isSoft ? 'soft_link' : 'solid'
      }
      notifyChange({ ...doc, edges: [...doc.edges, newEdge] })
    }
    setConnectingFrom(null)
    setConnectingMousePos(null)
  }

  const renderAnchors = (node: CanvasNode) => {
    const anchors: Array<{ side: EdgeSide; x: number; y: number }> = [
      { side: 'top', x: node.width / 2, y: 0 },
      { side: 'right', x: node.width, y: node.height / 2 },
      { side: 'bottom', x: node.width / 2, y: node.height },
      { side: 'left', x: 0, y: node.height / 2 }
    ]

    return anchors.map((a) => (
      <div
        key={a.side}
        style={{ transform: `translate(${a.x - 5}px, ${a.y - 5}px)` }}
        onMouseDown={(e) => handleAnchorMouseDown(e, node.id, a.side)}
        onMouseUp={(e) => handleAnchorMouseUp(e, node.id, a.side)}
        className="absolute w-2.5 h-2.5 rounded-full bg-[#38bdf8] border border-white hover:scale-150 cursor-crosshair z-30 transition-transform opacity-70 hover:opacity-100 shadow-md"
        title={`Połącz (${a.side})`}
      />
    ))
  }

  const renderStrokePath = (points: Array<{ x: number; y: number }>) => {
    if (points.length < 2) return ''
    let d = `M ${points[0].x} ${points[0].y}`
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`
    }
    return d
  }

  const getEdgeCoordinates = (edge: CanvasEdge) => {
    const fromNode = doc.nodes.find((n) => n.id === edge.fromNode)
    const toNode = doc.nodes.find((n) => n.id === edge.toNode)
    if (!fromNode || !toNode) return null

    const getSidePos = (node: CanvasNode, side: EdgeSide) => {
      if (side === 'top') return { x: node.x + node.width / 2, y: node.y }
      if (side === 'right') return { x: node.x + node.width, y: node.y + node.height / 2 }
      if (side === 'bottom') return { x: node.x + node.width / 2, y: node.y + node.height }
      return { x: node.x, y: node.y + node.height / 2 }
    }

    const p1 = getSidePos(fromNode, edge.fromSide)
    const p2 = getSidePos(toNode, edge.toSide)
    return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y }
  }

  const getStickyBgClass = (color: string) => {
    switch (color) {
      case 'yellow': return 'bg-[#3d3416] border-[#854d0e]/60 text-[#fef08a]'
      case 'blue': return 'bg-[#172554] border-[#1e40af]/60 text-[#bfdbfe]'
      case 'green': return 'bg-[#143322] border-[#15803d]/60 text-[#bbf7d0]'
      case 'purple': return 'bg-[#2e1065] border-[#6b21a8]/60 text-[#e9d5ff]'
      case 'rose': return 'bg-[#4c0519] border-[#9f1239]/60 text-[#fecdd3]'
      default: return 'bg-[#27272a] border-[#3f3f46] text-[#f4f4f5]'
    }
  }

  return (
    <div
      ref={containerRef}
      onContextMenu={(e) => e.preventDefault()}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      className={`h-full w-full canvas-grid relative overflow-hidden select-none ${
        activeTool === 'hand' || isPanning ? 'cursor-grab active:cursor-grabbing' : activeTool === 'pen' ? 'cursor-crosshair' : 'cursor-default'
      }`}
    >
      {/* Top Left Navigation Indicator */}
      <div className="absolute top-4 left-4 z-30 flex items-center gap-1.5 p-1 rounded-xl bg-[#18181b]/90 border border-[#27272a] shadow-xl text-xs backdrop-blur-md">
        <button
          onClick={() => setZoom((z) => Math.min(3.0, z + 0.15))}
          className="p-1 rounded-lg text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#27272a]"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <span className="font-mono text-[11px] text-[#a1a1aa] w-9 text-center font-medium">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom((z) => Math.max(0.15, z - 0.15))}
          className="p-1 rounded-lg text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#27272a]"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-3 bg-[#27272a] mx-0.5" />
        <button
          onClick={() => {
            setPan({ x: 0, y: 0 })
            setZoom(1.0)
          }}
          className="p-1 rounded-lg text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#27272a]"
          title="Resetuj widok (0,0)"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* SVG Canvas Layer for Drawings and Arrows */}
      <svg
        className="absolute inset-0 pointer-events-none w-full h-full"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
      >
        <defs>
          <marker
            id="wb-arrow"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
          </marker>
          <marker
            id="wb-soft-arrow"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <circle cx="5" cy="5" r="4" fill="#71717a" />
          </marker>
        </defs>

        {/* Existing Drawing Strokes */}
        {doc.nodes
          .filter((n) => n.type === 'drawing_stroke' && n.data?.points)
          .map((stroke) => (
            <path
              key={stroke.id}
              d={renderStrokePath(stroke.data.points)}
              stroke={stroke.data.color || '#f4f4f5'}
              strokeWidth={stroke.data.width || 3}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={activeTool === 'eraser' ? 'pointer-events-auto hover:opacity-40 cursor-pointer' : ''}
              onClick={() => {
                if (activeTool === 'eraser') {
                  notifyChange({ ...doc, nodes: doc.nodes.filter((n) => n.id !== stroke.id) })
                }
              }}
            />
          ))}

        {/* Current Active Freehand Stroke */}
        {isDrawing && currentStroke.length > 1 && (
          <path
            d={renderStrokePath(currentStroke)}
            stroke={penColor}
            strokeWidth={penWidth}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Connectors / Arrows between Nodes */}
        {doc.edges.map((edge) => {
          const coords = getEdgeCoordinates(edge)
          if (!coords) return null
          const isSoft = edge.style === 'dotted' || edge.style === 'soft_link'
          return (
            <g key={edge.id} className="pointer-events-auto">
              <line
                x1={coords.x1}
                y1={coords.y1}
                x2={coords.x2}
                y2={coords.y2}
                stroke={edge.color || (isSoft ? '#71717a' : '#38bdf8')}
                strokeWidth={isSoft ? '1.5' : '2'}
                strokeDasharray={isSoft ? '4 4' : edge.style === 'dashed' ? '6 6' : undefined}
                markerEnd={isSoft ? 'url(#wb-soft-arrow)' : 'url(#wb-arrow)'}
              />
              {edge.label && (
                <text
                  x={(coords.x1 + coords.x2) / 2}
                  y={(coords.y1 + coords.y2) / 2 - 6}
                  fill={isSoft ? '#71717a' : '#a1a1aa'}
                  fontSize="10"
                  fontFamily="Inter, sans-serif"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {edge.label}
                </text>
              )}
            </g>
          )
        })}

        {/* Dynamic Arrow Preview during Dragging */}
        {connectingFrom && connectingMousePos && (
          <line
            x1={0}
            y1={0}
            x2={connectingMousePos.x}
            y2={connectingMousePos.y}
            stroke="#38bdf8"
            strokeWidth="2"
            strokeDasharray="4 4"
            markerEnd="url(#wb-arrow)"
          />
        )}
      </svg>

      {/* Interactive Whiteboard Nodes Container */}
      <div
        className="absolute inset-0 pointer-events-none w-full h-full"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
      >
        {doc.nodes
          .filter((n) => n.type !== 'drawing_stroke')
          .map((node) => {
            const isSelected = selectedNodeIds.includes(node.id)

            return (
              <div
                key={node.id}
                style={{
                  transform: `translate(${node.x}px, ${node.y}px)`,
                  width: `${node.width}px`,
                  minHeight: `${node.height}px`
                }}
                onMouseDown={(e) => {
                  if (activeTool === 'eraser') {
                    notifyChange({ ...doc, nodes: doc.nodes.filter((n) => n.id !== node.id) })
                    return
                  }
                  if (e.button === 0) {
                    e.stopPropagation()
                    setSelectedNodeIds([node.id])
                    setDraggedNodeId(node.id)
                    const world = toWorldCoords(e.clientX, e.clientY)
                    setDragOffset({ x: world.x - node.x, y: world.y - node.y })
                    onActivity()
                  }
                }}
                className={`absolute pointer-events-auto rounded-2xl transition-all shadow-xl ${
                  isSelected ? 'ring-2 ring-[#38bdf8] shadow-2xl scale-[1.01]' : 'hover:ring-1 hover:ring-[#3f3f46]'
                }`}
              >
                {/* 4 Connection Anchors */}
                {renderAnchors(node)}

                {/* 1. Markdown Text Card */}
                {node.type === 'text_card' && (
                  <div className="h-full w-full p-4 rounded-2xl bg-[#18181b] border border-[#27272a] flex flex-col justify-between text-xs">
                    {editingNodeId === node.id ? (
                      <div
                        onKeyDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="flex flex-col h-full gap-2"
                      >
                        <input
                          type="text"
                          value={node.data.title || ''}
                          onChange={(e) => {
                            const updated = doc.nodes.map((n) =>
                              n.id === node.id ? { ...n, data: { ...n.data, title: e.target.value } } : n
                            )
                            setDoc({ ...doc, nodes: updated })
                          }}
                          placeholder="Tytuł notatki..."
                          className="bg-[#27272a] border border-[#3f3f46] rounded-lg px-2.5 py-1 text-xs text-[#f4f4f5] focus:outline-none focus:border-[#38bdf8]"
                        />
                        <textarea
                          value={node.data.markdown || ''}
                          onChange={(e) => {
                            const updated = doc.nodes.map((n) =>
                              n.id === node.id
                                ? {
                                    ...n,
                                    height: Math.max(160, e.target.scrollHeight + 50),
                                    data: { ...n.data, markdown: e.target.value }
                                  }
                                : n
                            )
                            setDoc({ ...doc, nodes: updated })
                          }}
                          placeholder="Treść notatki..."
                          className="flex-1 bg-transparent text-[#f4f4f5] resize-none focus:outline-none font-mono text-[11px] min-h-[90px]"
                        />
                        <button
                          onClick={() => {
                            setEditingNodeId(null)
                            notifyChange(doc)
                          }}
                          className="self-end px-3 py-1 rounded-lg bg-[#27272a] hover:bg-[#3f3f46] text-[11px] font-medium text-[#f4f4f5] transition-colors"
                        >
                          Gotowe
                        </button>
                      </div>
                    ) : (
                      <div onDoubleClick={() => setEditingNodeId(node.id)}>
                        <div className="font-semibold text-[#f4f4f5] mb-2 pb-1.5 border-b border-[#27272a] flex items-center justify-between">
                          <span>{node.data.title || 'Notatka'}</span>
                          <Edit2 className="w-3 h-3 text-[#71717a] opacity-60 hover:opacity-100 cursor-pointer" />
                        </div>
                        <div className="text-[11px] text-[#a1a1aa] leading-relaxed whitespace-pre-wrap">
                          {node.data.markdown}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Sticky Note */}
                {node.type === 'sticky_note' && (
                  <div
                    onDoubleClick={() => setEditingNodeId(node.id)}
                    className={`h-full w-full p-4 rounded-2xl border flex flex-col justify-between shadow-lg text-xs transition-colors ${getStickyBgClass(
                      node.data.color || 'yellow'
                    )}`}
                  >
                    {editingNodeId === node.id ? (
                      <div
                        onKeyDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="flex flex-col h-full gap-2"
                      >
                        <textarea
                          value={node.data.text || ''}
                          onChange={(e) => {
                            const updated = doc.nodes.map((n) =>
                              n.id === node.id
                                ? { ...n, height: Math.max(180, e.target.scrollHeight + 60), data: { ...n.data, text: e.target.value } }
                                : n
                            )
                            setDoc({ ...doc, nodes: updated })
                          }}
                          autoFocus
                          className="flex-1 bg-transparent text-inherit resize-none focus:outline-none text-xs font-medium"
                        />
                        <div className="flex items-center justify-between pt-1 border-t border-white/10">
                          {/* Color Switcher */}
                          <div className="flex items-center gap-1">
                            {['yellow', 'blue', 'green', 'purple', 'rose'].map((c) => (
                              <button
                                key={c}
                                onClick={() => {
                                  const updated = doc.nodes.map((n) =>
                                    n.id === node.id ? { ...n, data: { ...n.data, color: c } } : n
                                  )
                                  notifyChange({ ...doc, nodes: updated })
                                }}
                                className={`w-3.5 h-3.5 rounded-full border border-black/30 ${
                                  c === 'yellow' ? 'bg-yellow-400' : c === 'blue' ? 'bg-blue-400' : c === 'green' ? 'bg-green-400' : c === 'purple' ? 'bg-purple-400' : 'bg-rose-400'
                                }`}
                              />
                            ))}
                          </div>
                          <button
                            onClick={() => {
                              setEditingNodeId(null)
                              notifyChange(doc)
                            }}
                            className="px-2.5 py-0.5 rounded bg-black/30 hover:bg-black/50 text-[10px] font-semibold"
                          >
                            Zapisz
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="text-xs font-medium leading-relaxed whitespace-pre-wrap">
                          {node.data.text}
                        </div>
                        <div className="text-[9px] opacity-60 self-end font-mono">Sticky Note</div>
                      </>
                    )}
                  </div>
                )}

                {/* 3. Image Node / Visual Entity */}
                {(node.type === 'image_node' || node.type === 'visual_entity_node') && (
                  <div className="h-full w-full rounded-2xl bg-[#18181b] border border-[#27272a] overflow-hidden flex flex-col shadow-lg">
                    <div className="flex-1 bg-[#09090b] flex items-center justify-center p-1 overflow-hidden relative min-h-[140px]">
                      {node.data.src ? (
                        <img src={node.data.src} alt={node.data.title} className="max-h-full max-w-full object-contain rounded-lg" />
                      ) : (
                        <div className="text-[#71717a] flex flex-col items-center gap-1.5">
                          <User className="w-8 h-8 text-[#c084fc] opacity-60" />
                          <span className="text-[10px] text-[#f4f4f5] font-medium">{node.data.title}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-2.5 border-t border-[#27272a] flex items-center justify-between text-xs text-[#f4f4f5] bg-[#18181b]">
                      <span className="truncate font-medium">{node.data.title || 'Obraz'}</span>
                      {node.data.linked_note_id && onOpenNote && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onOpenNote(node.data.linked_note_id!)
                          }}
                          className="text-[#38bdf8] hover:underline flex items-center gap-1 text-[10px] font-medium"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Notatka</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. Shapes (Rectangle / Ellipse) with Live Text Input */}
                {node.type === 'shape' && (
                  <div
                    onDoubleClick={() => setEditingNodeId(node.id)}
                    className={`h-full w-full border-2 border-[#38bdf8]/60 bg-[#18181b]/70 flex flex-col items-center justify-center p-4 text-xs backdrop-blur-sm ${
                      node.data.shapeType === 'ellipse' ? 'rounded-full' : 'rounded-2xl'
                    }`}
                  >
                    {editingNodeId === node.id ? (
                      <textarea
                        value={node.data.text || node.data.label || ''}
                        onChange={(e) => {
                          const updated = doc.nodes.map((n) =>
                            n.id === node.id ? { ...n, data: { ...n.data, text: e.target.value, label: e.target.value } } : n
                          )
                          setDoc({ ...doc, nodes: updated })
                        }}
                        onKeyDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onBlur={() => {
                          setEditingNodeId(null)
                          notifyChange(doc)
                        }}
                        autoFocus
                        placeholder="Wpisz treść w kształcie..."
                        className="w-full h-full bg-transparent text-[#f4f4f5] text-center resize-none focus:outline-none text-xs font-semibold"
                      />
                    ) : (
                      <span className="font-semibold text-[#f4f4f5] text-center leading-relaxed">
                        {node.data.text || node.data.label || 'Kształt'}
                      </span>
                    )}
                  </div>
                )}

                {/* 5. Live Editable Active Recall Card */}
                {node.type === 'quiz_card' && (
                  <div
                    onKeyDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="h-full w-full p-4 rounded-2xl bg-[#18181b] border border-[#f59e0b]/40 flex flex-col justify-between shadow-xl text-xs"
                  >
                    <div>
                      <div className="text-[10px] text-[#f59e0b] font-bold uppercase tracking-wider mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>Active Recall</span>
                        </div>
                        <button
                          onClick={() => setEditingNodeId(editingNodeId === node.id ? null : node.id)}
                          className="text-[#71717a] hover:text-[#f4f4f5] p-1 rounded hover:bg-[#27272a]"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>

                      {editingNodeId === node.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={node.data.question || ''}
                            onChange={(e) => {
                              const updated = doc.nodes.map((n) =>
                                n.id === node.id ? { ...n, data: { ...n.data, question: e.target.value } } : n
                              )
                              setDoc({ ...doc, nodes: updated })
                            }}
                            onKeyDown={(e) => e.stopPropagation()}
                            placeholder="Wpisz pytanie..."
                            className="w-full bg-[#27272a] border border-[#3f3f46] rounded-lg px-2.5 py-1 text-xs text-[#f4f4f5] focus:outline-none focus:border-[#f59e0b]"
                          />
                          <input
                            type="text"
                            value={node.data.answer || ''}
                            onChange={(e) => {
                              const updated = doc.nodes.map((n) =>
                                n.id === node.id ? { ...n, data: { ...n.data, answer: e.target.value } } : n
                              )
                              setDoc({ ...doc, nodes: updated })
                            }}
                            onKeyDown={(e) => e.stopPropagation()}
                            placeholder="Wpisz odpowiedź..."
                            className="w-full bg-[#27272a] border border-[#3f3f46] rounded-lg px-2.5 py-1 text-xs text-[#10b981] font-mono focus:outline-none focus:border-[#10b981]"
                          />
                          <button
                            onClick={() => {
                              setEditingNodeId(null)
                              notifyChange(doc)
                            }}
                            className="w-full py-1 rounded bg-[#27272a] hover:bg-[#3f3f46] text-[10px] font-bold text-[#f4f4f5]"
                          >
                            Zapisz fiszkę
                          </button>
                        </div>
                      ) : (
                        <div
                          onDoubleClick={() => setEditingNodeId(node.id)}
                          className="text-[#f4f4f5] text-xs font-semibold mb-2 leading-relaxed"
                        >
                          {node.data.question}
                        </div>
                      )}
                    </div>

                    {!editingNodeId && (
                      <div className="pt-2 border-t border-[#27272a]">
                        {node.data.is_flipped ? (
                          <div className="flex items-center justify-between">
                            <span className="text-[#10b981] text-xs font-mono font-semibold">{node.data.answer}</span>
                            <button
                              onClick={() => {
                                const updated = doc.nodes.map((n) =>
                                  n.id === node.id ? { ...n, data: { ...n.data, is_flipped: false } } : n
                                )
                                notifyChange({ ...doc, nodes: updated })
                              }}
                              className="text-[#71717a] hover:text-[#f4f4f5] text-[10px] p-0.5 rounded hover:bg-[#27272a]"
                            >
                              Ukryj
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              const updated = doc.nodes.map((n) =>
                                n.id === node.id ? { ...n, data: { ...n.data, is_flipped: true } } : n
                              )
                              notifyChange({ ...doc, nodes: updated })
                            }}
                            className="w-full py-1.5 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] text-[11px] text-[#f4f4f5] font-medium flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Pokaż Odpowiedź</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
      </div>

      {/* Floating Glassmorphism Whiteboard Toolbar */}
      <WhiteboardToolbar
        activeTool={activeTool}
        onSelectTool={(t) => setActiveTool(t)}
        penColor={penColor}
        onChangePenColor={(c) => setPenColor(c)}
        penWidth={penWidth}
        onChangePenWidth={(w) => setPenWidth(w)}
        onAddImage={handleAddImage}
      />

      {/* Collapsible Bottom "Powiązane Tablice" Section */}
      <div className="absolute bottom-20 left-4 z-30 flex flex-col items-start select-none">
        <button
          onClick={() => setRelatedDrawerOpen(!relatedDrawerOpen)}
          className="px-2.5 py-1 rounded-lg bg-[#18181b]/90 hover:bg-[#27272a] border border-[#27272a] text-[11px] text-[#a1a1aa] hover:text-[#f4f4f5] flex items-center gap-1.5 shadow-lg backdrop-blur-md"
        >
          <Layers className="w-3.5 h-3.5 text-[#38bdf8]" />
          <span>Powiązane tablice</span>
          {relatedDrawerOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
        </button>

        {relatedDrawerOpen && (
          <div className="mt-1.5 p-2 rounded-xl bg-[#141519]/95 border border-[#27272a] shadow-2xl backdrop-blur-md flex flex-wrap gap-1.5 max-w-xs">
            {doc.edges
              .filter((e) => e.style === 'soft_link')
              .map((edge) => (
                <div
                  key={edge.id}
                  className="px-2 py-0.5 rounded-lg bg-[#18181b] border border-[#3f3f46] text-[10px] text-[#38bdf8] flex items-center gap-1 font-mono"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>{edge.label || 'Powiązanie'}</span>
                </div>
              ))}
            {doc.edges.filter((e) => e.style === 'soft_link').length === 0 && (
              <span className="text-[10px] text-[#71717a] italic p-1">Brak bezpośrednich subtelnych linków. Użyj narzędzia [L]!</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
