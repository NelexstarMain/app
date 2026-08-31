import React, { useState, useRef, useEffect, useCallback } from 'react'
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
  Check,
  Trash2,
  Move,
  Link2,
  FileText
} from 'lucide-react'
import { IpcChannel } from '../../../../shared/ipc/channels'

interface Props {
  document: CanvasDocument
  sessionCreatedNodeIds: string[]
  onDocumentChanged: (doc: CanvasDocument) => void
  onActivity: () => void
  onNodeAdded?: (nodeId: string) => void
  onOpenNote?: (notePath: string) => void
}

export const CanvasViewport: React.FC<Props> = ({
  document,
  sessionCreatedNodeIds,
  onDocumentChanged,
  onActivity,
  onNodeAdded,
  onOpenNote
}) => {
  const [doc, setDoc] = useState<CanvasDocument>(document)
  const [activeTool, setActiveTool] = useState<WhiteboardTool>('select')
  const [penColor, setPenColor] = useState('#D8DAE0')
  const [penWidth, setPenWidth] = useState(3)

  // Viewport navigation
  const [pan, setPan] = useState({ x: document.viewport.x || 0, y: document.viewport.y || 0 })
  const [zoom, setZoom] = useState(document.viewport.zoom || 1.0)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })

  // Node selection & dragging
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)

  // Current drawing stroke
  const [currentStroke, setCurrentStroke] = useState<Array<{ x: number; y: number }>>([])
  const [isDrawing, setIsDrawing] = useState(false)

  // Arrow connector creation
  const [connectingFrom, setConnectingFrom] = useState<{ nodeId: string; side: EdgeSide } | null>(null)
  const [connectingMousePos, setConnectingMousePos] = useState<{ x: number; y: number } | null>(null)

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
              title: `Pasted Image ${new Date().toLocaleTimeString()}`,
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

  // Keyboard Shortcuts (Delete, V, H, P, E, T, S, R, A, Q)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingNodeId) return // Don't trigger shortcuts while typing in input

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
      } else if (e.key === 'a' || e.key === 'A') {
        setActiveTool('arrow')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [doc, selectedNodeIds, editingNodeId])

  // Convert Screen (clientX, clientY) to Canvas World Coordinates
  const toWorldCoords = (clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 }
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom
    }
  }

  // Mouse Down
  const handleMouseDown = (e: React.MouseEvent) => {
    onActivity()
    const world = toWorldCoords(e.clientX, e.clientY)

    // Hand tool / Middle click pan
    if (activeTool === 'hand' || e.button === 1) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
      return
    }

    // Pen tool
    if (activeTool === 'pen') {
      setIsDrawing(true)
      setCurrentStroke([{ x: world.x, y: world.y }])
      return
    }

    // Creating new objects by clicking
    if (activeTool === 'text') {
      const newNode: CanvasNode = {
        id: `node_txt_${Date.now()}`,
        type: 'text_card',
        x: Math.round(world.x),
        y: Math.round(world.y),
        width: 260,
        height: 160,
        data: {
          title: 'Notatka Markdown',
          markdown: 'Napisz treść notatki... [[Link do notatki]], [[@entity_id|Obiekt]], #tag'
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
        width: 180,
        height: 180,
        data: {
          text: 'Nowa myśl lub pomysł...',
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
          fillColor: 'rgba(34, 36, 43, 0.4)',
          borderColor: '#4A6B8A'
        }
      }
      notifyChange({ ...doc, nodes: [...doc.nodes, newNode] })
      if (onNodeAdded) onNodeAdded(newNode.id)
      setSelectedNodeIds([newNode.id])
      setActiveTool('select')
      return
    }

    if (activeTool === 'quiz') {
      const newNode: CanvasNode = {
        id: `node_quiz_${Date.now()}`,
        type: 'quiz_card',
        x: Math.round(world.x),
        y: Math.round(world.y),
        width: 260,
        height: 160,
        data: {
          srs_card_id: `q_${Date.now()}`,
          question: 'Wpisz pytanie sprawdzające wiedzę...',
          answer: 'Wpisz poprawną odpowiedź',
          is_flipped: false
        }
      }
      notifyChange({ ...doc, nodes: [...doc.nodes, newNode] })
      if (onNodeAdded) onNodeAdded(newNode.id)
      setSelectedNodeIds([newNode.id])
      setActiveTool('select')
      return
    }

    // Default Canvas Background Click: deselect
    if (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'svg') {
      setSelectedNodeIds([])
      setEditingNodeId(null)
      setIsPanning(true)
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
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
    const newZoom = Math.max(0.2, Math.min(2.5, zoom * zoomFactor))
    setZoom(newZoom)
  }

  // Adding an Image via file input
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

  // Connect Anchor handler (Dragging from node anchor to another node)
  const handleAnchorMouseDown = (e: React.MouseEvent, nodeId: string, side: EdgeSide) => {
    e.stopPropagation()
    const world = toWorldCoords(e.clientX, e.clientY)
    setConnectingFrom({ nodeId, side })
    setConnectingMousePos(world)
  }

  const handleAnchorMouseUp = (e: React.MouseEvent, targetNodeId: string, targetSide: EdgeSide) => {
    e.stopPropagation()
    if (connectingFrom && connectingFrom.nodeId !== targetNodeId) {
      const newEdge: CanvasEdge = {
        id: `edge_${Date.now()}`,
        fromNode: connectingFrom.nodeId,
        fromSide: connectingFrom.side,
        toNode: targetNodeId,
        toSide: targetSide,
        label: 'RELACJA',
        color: '#4A6B8A',
        style: 'solid'
      }
      notifyChange({ ...doc, edges: [...doc.edges, newEdge] })
    }
    setConnectingFrom(null)
    setConnectingMousePos(null)
  }

  // Render Anchors around a Node for Visual Linkage
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
        className="absolute w-2.5 h-2.5 rounded-full bg-[#4A6B8A] border border-[#D8DAE0] hover:scale-150 cursor-crosshair z-20 transition-transform opacity-70 hover:opacity-100"
        title={`Connect from ${a.side}`}
      />
    ))
  }

  // Render Freehand SVG Path
  const renderStrokePath = (points: Array<{ x: number; y: number }>) => {
    if (points.length < 2) return ''
    let d = `M ${points[0].x} ${points[0].y}`
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`
    }
    return d
  }

  // Calculate connector edge coordinates
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

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      className={`h-full w-full canvas-grid relative overflow-hidden select-none ${
        activeTool === 'hand' || isPanning ? 'cursor-grab active:cursor-grabbing' : activeTool === 'pen' ? 'cursor-crosshair' : 'cursor-default'
      }`}
    >
      {/* Top Left Navigation Bar */}
      <div className="absolute top-4 left-4 z-30 flex items-center gap-1.5 p-1 rounded-lg bg-[#141519]/90 border border-[#22242b] text-xs">
        <button
          onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
          className="p-1 rounded text-[#727683] hover:text-[#D8DAE0] hover:bg-[#1b1c22]"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <span className="font-mono text-[11px] text-[#727683] w-9 text-center">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom((z) => Math.max(0.2, z - 0.15))}
          className="p-1 rounded text-[#727683] hover:text-[#D8DAE0] hover:bg-[#1b1c22]"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-3 bg-[#22242b] mx-0.5" />
        <button
          onClick={() => {
            setPan({ x: 0, y: 0 })
            setZoom(1.0)
          }}
          className="p-1 rounded text-[#727683] hover:text-[#D8DAE0] hover:bg-[#1b1c22]"
          title="Reset View"
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
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#4A6B8A" />
          </marker>
        </defs>

        {/* Existing Drawing Strokes */}
        {doc.nodes
          .filter((n) => n.type === 'drawing_stroke' && n.data?.points)
          .map((stroke) => (
            <path
              key={stroke.id}
              d={renderStrokePath(stroke.data.points)}
              stroke={stroke.data.color || '#D8DAE0'}
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

        {/* Current Active Stroke */}
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
          return (
            <g key={edge.id} className="pointer-events-auto">
              <line
                x1={coords.x1}
                y1={coords.y1}
                x2={coords.x2}
                y2={coords.y2}
                stroke={edge.color || '#4A6B8A'}
                strokeWidth="2"
                strokeDasharray={edge.style === 'dashed' ? '5 5' : undefined}
                markerEnd="url(#wb-arrow)"
              />
              {edge.label && (
                <text
                  x={(coords.x1 + coords.x2) / 2}
                  y={(coords.y1 + coords.y2) / 2 - 6}
                  fill="#727683"
                  fontSize="10"
                  fontFamily="sans-serif"
                  fontWeight="500"
                  textAnchor="middle"
                >
                  {edge.label}
                </text>
              )}
            </g>
          )
        })}

        {/* Dynamic Arrow during connection dragging */}
        {connectingFrom && connectingMousePos && (
          <line
            x1={toWorldCoords(pan.x, pan.y).x} // approximated
            y1={toWorldCoords(pan.x, pan.y).y}
            x2={connectingMousePos.x}
            y2={connectingMousePos.y}
            stroke="#4A6B8A"
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
                  e.stopPropagation()
                  setSelectedNodeIds([node.id])
                  setDraggedNodeId(node.id)
                  const world = toWorldCoords(e.clientX, e.clientY)
                  setDragOffset({ x: world.x - node.x, y: world.y - node.y })
                  onActivity()
                }}
                className={`absolute pointer-events-auto rounded-xl transition-shadow ${
                  isSelected ? 'ring-1 ring-[#4A6B8A] shadow-lg' : ''
                }`}
              >
                {/* 4 Connection Anchors (shown on hover or when selected) */}
                {renderAnchors(node)}

                {/* 1. Markdown Text Card */}
                {node.type === 'text_card' && (
                  <div className="h-full w-full p-3.5 rounded-xl bg-[#141519] border border-[#22242b] flex flex-col shadow-sm text-xs">
                    {editingNodeId === node.id ? (
                      <div className="flex flex-col h-full gap-2">
                        <input
                          type="text"
                          value={node.data.title || ''}
                          onChange={(e) => {
                            const updated = doc.nodes.map((n) =>
                              n.id === node.id ? { ...n, data: { ...n.data, title: e.target.value } } : n
                            )
                            setDoc({ ...doc, nodes: updated })
                          }}
                          placeholder="Tytuł..."
                          className="bg-[#1b1c22] border border-[#22242b] rounded px-2 py-1 text-xs text-[#D8DAE0] focus:outline-none"
                        />
                        <textarea
                          value={node.data.markdown || ''}
                          onChange={(e) => {
                            const updated = doc.nodes.map((n) =>
                              n.id === node.id ? { ...n, data: { ...n.data, markdown: e.target.value } } : n
                            )
                            setDoc({ ...doc, nodes: updated })
                          }}
                          className="flex-1 bg-transparent text-[#D8DAE0] resize-none focus:outline-none font-mono text-[11px]"
                        />
                        <button
                          onClick={() => {
                            setEditingNodeId(null)
                            notifyChange(doc)
                          }}
                          className="self-end px-2 py-0.5 rounded bg-[#22242b] text-[10px] text-[#D8DAE0]"
                        >
                          Zapisz
                        </button>
                      </div>
                    ) : (
                      <div onDoubleClick={() => setEditingNodeId(node.id)}>
                        <div className="font-semibold text-[#D8DAE0] mb-1.5 pb-1 border-b border-[#22242b] flex items-center justify-between">
                          <span>{node.data.title || 'Notatka'}</span>
                          <Edit2 className="w-3 h-3 text-[#727683] opacity-50 hover:opacity-100" />
                        </div>
                        <div className="text-[11px] text-[#727683] leading-relaxed whitespace-pre-wrap">
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
                    className="h-full w-full p-3.5 rounded-xl bg-[#1c1d22] border border-[#2d2f38] flex flex-col justify-between shadow-sm text-xs"
                  >
                    {editingNodeId === node.id ? (
                      <textarea
                        value={node.data.text || ''}
                        onChange={(e) => {
                          const updated = doc.nodes.map((n) =>
                            n.id === node.id ? { ...n, data: { ...n.data, text: e.target.value } } : n
                          )
                          setDoc({ ...doc, nodes: updated })
                        }}
                        onBlur={() => {
                          setEditingNodeId(null)
                          notifyChange(doc)
                        }}
                        autoFocus
                        className="w-full h-full bg-transparent text-[#D8DAE0] resize-none focus:outline-none text-xs"
                      />
                    ) : (
                      <div className="text-[#D8DAE0] text-xs leading-relaxed whitespace-pre-wrap">
                        {node.data.text}
                      </div>
                    )}
                    <div className="text-[9px] text-[#727683] self-end opacity-60">Sticky</div>
                  </div>
                )}

                {/* 3. Image Node / Visual Entity */}
                {(node.type === 'image_node' || node.type === 'visual_entity_node') && (
                  <div className="h-full w-full rounded-xl bg-[#141519] border border-[#22242b] overflow-hidden flex flex-col shadow-sm">
                    <div className="flex-1 bg-[#0b0c0e] flex items-center justify-center p-1 overflow-hidden relative">
                      {node.data.src ? (
                        <img src={node.data.src} alt={node.data.title} className="max-h-full max-w-full object-contain rounded" />
                      ) : (
                        <div className="text-[#727683] flex flex-col items-center gap-1">
                          <User className="w-8 h-8 opacity-40" />
                          <span className="text-[10px]">{node.data.title}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-2 border-t border-[#22242b] flex items-center justify-between text-[11px] text-[#D8DAE0] bg-[#141519]">
                      <span className="truncate">{node.data.title || 'Obraz / Entity'}</span>
                      {node.data.linked_note_id && onOpenNote && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onOpenNote(node.data.linked_note_id!)
                          }}
                          className="text-[#4A6B8A] hover:underline flex items-center gap-1 text-[10px]"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Notatka</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. Shapes (Rectangle / Ellipse) */}
                {node.type === 'shape' && (
                  <div
                    className={`h-full w-full border border-[#4A6B8A]/60 bg-[#141519]/50 flex items-center justify-center p-3 text-xs text-[#727683] ${
                      node.data.shapeType === 'ellipse' ? 'rounded-full' : 'rounded-xl'
                    }`}
                  >
                    <span>{node.data.label || 'Shape'}</span>
                  </div>
                )}

                {/* 5. Quiz Card */}
                {node.type === 'quiz_card' && (
                  <div className="h-full w-full p-3.5 rounded-xl bg-[#141519] border border-[#8C6D37]/40 flex flex-col justify-between shadow-sm text-xs">
                    <div>
                      <div className="text-[10px] text-[#8C6D37] font-semibold mb-1 flex items-center gap-1">
                        <HelpCircle className="w-3 h-3" />
                        <span>Active Recall</span>
                      </div>
                      <div className="text-[#D8DAE0] text-xs font-medium">{node.data.question}</div>
                    </div>
                    <div className="pt-2 border-t border-[#22242b]">
                      {node.data.is_flipped ? (
                        <div className="text-[#38664B] text-[11px] font-mono">{node.data.answer}</div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            const updated = doc.nodes.map((n) =>
                              n.id === node.id ? { ...n, data: { ...n.data, is_flipped: true } } : n
                            )
                            notifyChange({ ...doc, nodes: updated })
                          }}
                          className="w-full py-1 rounded bg-[#1b1c22] hover:bg-[#22242b] text-[11px] text-[#D8DAE0] flex items-center justify-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Pokaż Odpowiedź</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
      </div>

      {/* Floating Whiteboard Dock Toolbar */}
      <WhiteboardToolbar
        activeTool={activeTool}
        onSelectTool={(t) => setActiveTool(t)}
        penColor={penColor}
        onChangePenColor={(c) => setPenColor(c)}
        penWidth={penWidth}
        onChangePenWidth={(w) => setPenWidth(w)}
        onAddImage={handleAddImage}
      />
    </div>
  )
}
