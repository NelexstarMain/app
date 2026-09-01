import React, { useState, useRef, useEffect } from 'react'
import { CanvasDocument, CanvasNode, CanvasEdge, EdgeSide, EdgeStyle } from '../../../../shared/types/canvas'
import { WhiteboardToolbar, WhiteboardTool } from './WhiteboardToolbar'
import { ImageNameModal } from './ImageNameModal'
import { ArrowEditModal, ArrowConfigData } from './ArrowEditModal'
import { MentionAutocomplete, MentionCandidate } from './MentionAutocomplete'
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  User,
  HelpCircle,
  Eye,
  Edit2,
  Trash2,
  AtSign,
  FileText,
  Layers,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Bold,
  Italic,
  Type
} from 'lucide-react'
import { IpcChannel } from '../../../../shared/ipc/channels'

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

interface Props {
  document: CanvasDocument
  sessionCreatedNodeIds: string[]
  onDocumentChanged: (doc: CanvasDocument) => void
  onActivity: () => void
  onNodeAdded?: (nodeId: string) => void
  onOpenNote?: (notePath: string) => void
  onOpenCanvas?: (canvasPath: string) => void
}

const STICKY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  yellow: { bg: 'bg-[#fef08a]', border: 'border-[#fde047]', text: 'text-[#713f12]' },
  pink: { bg: 'bg-[#fbcfe8]', border: 'border-[#f472b6]', text: 'text-[#831843]' },
  purple: { bg: 'bg-[#e9d5ff]', border: 'border-[#c084fc]', text: 'text-[#581c87]' },
  blue: { bg: 'bg-[#bae6fd]', border: 'border-[#38bdf8]', text: 'text-[#0c4a6e]' },
  green: { bg: 'bg-[#bbf7d0]', border: 'border-[#4ade80]', text: 'text-[#14532d]' },
  orange: { bg: 'bg-[#fed7aa]', border: 'border-[#fb923c]', text: 'text-[#7c2d12]' }
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
  const [pan, setPan] = useState({ x: document.viewport?.x || 0, y: document.viewport?.y || 0 })
  const [zoom, setZoom] = useState(document.viewport?.zoom || 1.0)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })

  // Node selection, dragging & resizing
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  
  // 8-Directional Resizing
  const [resizingNodeId, setResizingNodeId] = useState<string | null>(null)
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null)
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0, mouseX: 0, mouseY: 0 })
  
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null)

  // Freehand drawing stroke
  const [currentStroke, setCurrentStroke] = useState<Array<{ x: number; y: number }>>([])
  const [isDrawing, setIsDrawing] = useState(false)

  // Arrow connector (drag from node to node)
  const [connectingFromNodeId, setConnectingFromNodeId] = useState<string | null>(null)
  const [connectingMousePos, setConnectingMousePos] = useState<{ x: number; y: number } | null>(null)

  // Arrow Edit Modal
  const [editingEdge, setEditingEdge] = useState<CanvasEdge | null>(null)

  // Image Naming Modal
  const [imageModalOpen, setImageModalOpen] = useState(false)
  const [pendingImageData, setPendingImageData] = useState<{ base64: string; fileName: string } | null>(null)

  // @ Mention Autocomplete Popover
  const [mentionOpen, setMentionOpen] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionTargetNodeId, setMentionTargetNodeId] = useState<string | null>(null)
  const [allWorkspaceCandidates, setAllWorkspaceCandidates] = useState<MentionCandidate[]>([])

  // Related Canvases Drawer
  const [relatedDrawerOpen, setRelatedDrawerOpen] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setDoc(document)
  }, [document])

  // Load workspace candidates for @ autocomplete
  useEffect(() => {
    const loadCandidates = async () => {
      try {
        const res = await window.electronAPI.invoke(IpcChannel.DB_GET_GRAPH_DATA, {})
        if (res.nodes) {
          const list: MentionCandidate[] = res.nodes.map((n: any) => ({
            id: n.id,
            title: n.title,
            type: n.type === 'canvas' ? 'canvas' : n.type === 'visual_entity' ? 'asset' : 'note'
          }))
          setAllWorkspaceCandidates(list)
        }
      } catch {
        // Ignore
      }
    }
    loadCandidates()
  }, [])

  const notifyChange = (updatedDoc: CanvasDocument) => {
    setDoc(updatedDoc)
    onDocumentChanged(updatedDoc)
  }

  // Paste Support (with Image Name Modal)
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const activeEl = window.document.activeElement
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return
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
            setPendingImageData({ base64, fileName: `Obraz_${Date.now()}.png` })
            setImageModalOpen(true)
          }
          reader.readAsDataURL(file)
          break
        }
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [doc, pan, zoom])

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = window.document.activeElement
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return
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

  // Coordinate Conversion (World Coordinates)
  const toWorldCoords = (clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 }
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom
    }
  }

  // Jump to Node via @ Link
  const handleJumpToNode = (targetTitleOrId: string) => {
    const clean = targetTitleOrId.toLowerCase().trim()
    
    // Check current canvas nodes
    const localMatch = doc.nodes.find((n) => {
      const t = (n.data?.title || n.data?.label || n.data?.text || n.data?.question || '').toLowerCase()
      return t.includes(clean) || n.id.toLowerCase() === clean
    })

    if (localMatch) {
      const targetPanX = -localMatch.x * zoom + window.innerWidth / 2 - (localMatch.width * zoom) / 2
      const targetPanY = -localMatch.y * zoom + window.innerHeight / 2 - (localMatch.height * zoom) / 2
      setPan({ x: targetPanX, y: targetPanY })
      setHighlightedNodeId(localMatch.id)
      setSelectedNodeIds([localMatch.id])
      setTimeout(() => setHighlightedNodeId(null), 2500)
      return
    }

    // Check other canvas / files
    const external = allWorkspaceCandidates.find((c) => c.title.toLowerCase().includes(clean))
    if (external) {
      if (external.type === 'canvas' && onOpenCanvas) {
        onOpenCanvas(external.id)
      } else if (external.type === 'note' && onOpenNote) {
        onOpenNote(external.id)
      }
    }
  }

  // Smart Nearest-Edge Routing (No static anchor dots)
  const calculateSmartEdge = (n1: CanvasNode, n2: CanvasNode) => {
    const c1 = { x: n1.x + n1.width / 2, y: n1.y + n1.height / 2 }
    const c2 = { x: n2.x + n2.width / 2, y: n2.y + n2.height / 2 }
    const dx = c2.x - c1.x
    const dy = c2.y - c1.y

    let p1 = { x: c1.x, y: c1.y }
    let p2 = { x: c2.x, y: c2.y }

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) {
        p1 = { x: n1.x + n1.width, y: c1.y }
        p2 = { x: n2.x, y: c2.y }
      } else {
        p1 = { x: n1.x, y: c1.y }
        p2 = { x: n2.x + n2.width, y: c2.y }
      }
    } else {
      if (dy > 0) {
        p1 = { x: c1.x, y: n1.y + n1.height }
        p2 = { x: c2.x, y: n2.y }
      } else {
        p1 = { x: c1.x, y: n1.y }
        p2 = { x: c2.x, y: n2.y + n2.height }
      }
    }

    return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y }
  }

  // Mouse Down
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

    // Creating new objects by clicking on canvas
    if (e.button === 0) {
      if (activeTool === 'text') {
        const newNode: CanvasNode = {
          id: `node_txt_${Date.now()}`,
          type: 'text_card',
          x: Math.round(world.x),
          y: Math.round(world.y),
          width: 260,
          height: 140,
          data: {
            title: 'Notatka',
            markdown: 'Wpisz treść notatki... (użyj @nazwa do podlinkowania)'
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
          width: 200,
          height: 200,
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
            fillColor: 'rgba(24, 24, 27, 0.7)',
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
      if (
        e.target === containerRef.current ||
        (e.target as HTMLElement).tagName === 'svg' ||
        (e.target as HTMLElement).tagName === 'g'
      ) {
        setSelectedNodeIds([])
        setEditingNodeId(null)
        setMentionOpen(false)
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
    } else if (resizingNodeId && resizeHandle) {
      const deltaX = (e.clientX - resizeStart.mouseX) / zoom
      const deltaY = (e.clientY - resizeStart.mouseY) / zoom

      const updated = doc.nodes.map((n) => {
        if (n.id !== resizingNodeId) return n

        let newX = resizeStart.x
        let newY = resizeStart.y
        let newW = resizeStart.width
        let newH = resizeStart.height

        if (resizeHandle.includes('e')) newW = Math.max(120, resizeStart.width + deltaX)
        if (resizeHandle.includes('s')) newH = Math.max(80, resizeStart.height + deltaY)
        if (resizeHandle.includes('w')) {
          const clampedDelta = Math.min(deltaX, resizeStart.width - 120)
          newX = resizeStart.x + clampedDelta
          newW = resizeStart.width - clampedDelta
        }
        if (resizeHandle.includes('n')) {
          const clampedDelta = Math.min(deltaY, resizeStart.height - 80)
          newY = resizeStart.y + clampedDelta
          newH = resizeStart.height - clampedDelta
        }

        return {
          ...n,
          x: Math.round(newX),
          y: Math.round(newY),
          width: Math.round(newW),
          height: Math.round(newH)
        }
      })

      setDoc({ ...doc, nodes: updated })
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

    if (connectingFromNodeId) {
      setConnectingMousePos(world)
    }
  }

  // Global Mouse Up Listener
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isPanning) setIsPanning(false)
      if (resizingNodeId) {
        setResizingNodeId(null)
        setResizeHandle(null)
        onDocumentChanged(doc)
      }
      if (draggedNodeId) {
        setDraggedNodeId(null)
        onDocumentChanged(doc)
      }
      if (connectingFromNodeId) {
        setConnectingFromNodeId(null)
        setConnectingMousePos(null)
      }
      if (isDrawing) {
        if (currentStroke.length > 1) {
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
        }
        setCurrentStroke([])
        setIsDrawing(false)
      }
    }

    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [doc, isPanning, resizingNodeId, draggedNodeId, connectingFromNodeId, isDrawing, currentStroke, penColor, penWidth])

  // Mouse Up
  const handleMouseUp = () => {
    if (isPanning) setIsPanning(false)
    if (isDrawing) {
      if (currentStroke.length > 1) {
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
      }
      setCurrentStroke([])
      setIsDrawing(false)
    }
    if (resizingNodeId) {
      setResizingNodeId(null)
      setResizeHandle(null)
      onDocumentChanged(doc)
    }
    if (draggedNodeId) {
      setDraggedNodeId(null)
      onDocumentChanged(doc)
    }
    if (connectingFromNodeId) {
      setConnectingFromNodeId(null)
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

  // Adding Image (with required naming modal)
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
        setPendingImageData({ base64, fileName: file.name.replace(/\.[^/.]+$/, '') })
        setImageModalOpen(true)
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }

  const handleConfirmImage = async (name: string) => {
    if (!pendingImageData) return
    const res = await window.electronAPI.invoke(IpcChannel.ASSET_INGEST, {
      fileName: `${name}.png`,
      title: name,
      base64Data: pendingImageData.base64,
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
          src: pendingImageData.base64,
          title: name,
          entity_id: res.entity.entity_id,
          linked_note_id: res.entity.linked_note_id
        }
      }
      notifyChange({ ...doc, nodes: [...doc.nodes, newNode] })
      if (onNodeAdded) onNodeAdded(newNode.id)
    }
    setPendingImageData(null)
  }

  // Node connection handler (Smart Routing)
  const handleNodeConnectEnd = (targetNodeId: string) => {
    if (connectingFromNodeId && connectingFromNodeId !== targetNodeId) {
      const isSoft = activeTool === 'soft_link'
      const newEdge: CanvasEdge = {
        id: `edge_${Date.now()}`,
        fromNode: connectingFromNodeId,
        toNode: targetNodeId,
        label: isSoft ? 'POWIĄZANIE' : 'RELACJA',
        color: isSoft ? '#71717a' : '#38bdf8',
        style: isSoft ? 'soft_link' : 'solid',
        bidirectional: false
      }
      notifyChange({ ...doc, edges: [...doc.edges, newEdge] })
    }
    setConnectingFromNodeId(null)
    setConnectingMousePos(null)
  }

  // Arrow property update from modal
  const handleUpdateEdge = (config: ArrowConfigData) => {
    if (!editingEdge) return
    const updated = doc.edges.map((e) =>
      e.id === editingEdge.id
        ? {
            ...e,
            label: config.label,
            color: config.color,
            style: config.style,
            bidirectional: config.bidirectional
          }
        : e
    )
    notifyChange({ ...doc, edges: updated })
    setEditingEdge(null)
  }

  const handleDeleteEdge = (edgeId: string) => {
    notifyChange({ ...doc, edges: doc.edges.filter((e) => e.id !== edgeId) })
    setEditingEdge(null)
  }

  const renderStrokePath = (points: Array<{ x: number; y: number }>) => {
    if (points.length < 2) return ''
    let d = `M ${points[0].x} ${points[0].y}`
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`
    }
    return d
  }

  // Render text with interactive @mention jump links
  const renderLinkedText = (text: string) => {
    if (!text) return null
    // Match @[Title] or @Word
    const parts = text.split(/(@(?:\[[^\]]+\]|[a-zA-Z0-9_\-\u00C0-\u024F]+))/g)

    return parts.map((part, idx) => {
      if (part.startsWith('@')) {
        const rawName = part.startsWith('@[') ? part.slice(2, -1) : part.slice(1)
        return (
          <span
            key={idx}
            onClick={(e) => {
              e.stopPropagation()
              handleJumpToNode(rawName)
            }}
            className="inline-flex items-center gap-0.5 px-1 py-0.5 mx-0.5 rounded-md bg-[#38bdf8]/20 hover:bg-[#38bdf8]/35 text-[#38bdf8] border border-[#38bdf8]/40 cursor-pointer font-semibold transition-colors shadow-sm"
            title={`Przejdź do: ${rawName}`}
          >
            <AtSign className="w-2.5 h-2.5" />
            <span>{rawName}</span>
          </span>
        )
      }
      return <span key={idx}>{part}</span>
    })
  }

  // 8-Directional Resizing Handles
  const render8ResizeHandles = (node: CanvasNode) => {
    const handles: Array<{ handle: ResizeHandle; cursor: string; style: React.CSSProperties }> = [
      { handle: 'nw', cursor: 'nwse-resize', style: { top: -4, left: -4 } },
      { handle: 'n', cursor: 'ns-resize', style: { top: -4, left: '50%', transform: 'translateX(-50%)' } },
      { handle: 'ne', cursor: 'nesw-resize', style: { top: -4, right: -4 } },
      { handle: 'e', cursor: 'ew-resize', style: { top: '50%', right: -4, transform: 'translateY(-50%)' } },
      { handle: 'se', cursor: 'nwse-resize', style: { bottom: -4, right: -4 } },
      { handle: 's', cursor: 'ns-resize', style: { bottom: -4, left: '50%', transform: 'translateX(-50%)' } },
      { handle: 'sw', cursor: 'nesw-resize', style: { bottom: -4, left: -4 } },
      { handle: 'w', cursor: 'ew-resize', style: { top: '50%', left: -4, transform: 'translateY(-50%)' } }
    ]

    return handles.map((h) => (
      <div
        key={h.handle}
        onMouseDown={(e) => {
          e.stopPropagation()
          setResizingNodeId(node.id)
          setResizeHandle(h.handle)
          setResizeStart({
            x: node.x,
            y: node.y,
            width: node.width,
            height: node.height,
            mouseX: e.clientX,
            mouseY: e.clientY
          })
        }}
        style={h.style}
        className={`absolute w-2.5 h-2.5 bg-[#38bdf8] border border-white rounded-full z-40 hover:scale-150 transition-transform shadow-md cursor-${h.cursor}`}
      />
    ))
  }

  // Build candidate list for @ mention
  const mentionCandidates: MentionCandidate[] = [
    ...doc.nodes
      .filter((n) => n.type !== 'drawing_stroke')
      .map((n) => ({
        id: n.id,
        title: n.data?.title || n.data?.label || (n.data?.text ? n.data.text.slice(0, 25) : 'Węzeł'),
        type: 'canvas_node' as const
      })),
    ...allWorkspaceCandidates
  ]

  return (
    <div
      ref={containerRef}
      onContextMenu={(e) => e.preventDefault()}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      style={{
        backgroundPosition: `${pan.x}px ${pan.y}px`,
        backgroundSize: `${24 * zoom}px ${24 * zoom}px`
      }}
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

      {/* UNBOUNDED FULL-SCREEN SVG LAYER */}
      <svg className="absolute inset-0 pointer-events-none w-full h-full overflow-visible" style={{ overflow: 'visible' }}>
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
            id="wb-arrow-start"
            viewBox="0 0 10 10"
            refX="4"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 10 0 L 0 5 L 10 10 z" fill="#38bdf8" />
          </marker>
          <marker
            id="wb-soft-arrow"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <circle cx="5" cy="5" r="4" fill="#71717a" />
          </marker>
        </defs>

        <g style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
          {/* Drawing Strokes */}
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

          {/* Current Freehand Stroke */}
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

          {/* Smart Connectors / Arrows (Click to edit) */}
          {doc.edges.map((edge) => {
            const fromNode = doc.nodes.find((n) => n.id === edge.fromNode)
            const toNode = doc.nodes.find((n) => n.id === edge.toNode)
            if (!fromNode || !toNode) return null

            const coords = calculateSmartEdge(fromNode, toNode)
            const isSoft = edge.style === 'dotted' || edge.style === 'soft_link'
            const strokeColor = edge.color || (isSoft ? '#71717a' : '#38bdf8')

            return (
              <g
                key={edge.id}
                className="pointer-events-auto cursor-pointer group"
                onClick={() => setEditingEdge(edge)}
              >
                <line
                  x1={coords.x1}
                  y1={coords.y1}
                  x2={coords.x2}
                  y2={coords.y2}
                  stroke={strokeColor}
                  strokeWidth={isSoft ? '1.5' : '2.5'}
                  strokeDasharray={isSoft ? '4 4' : edge.style === 'dashed' ? '6 6' : undefined}
                  markerEnd={isSoft ? 'url(#wb-soft-arrow)' : 'url(#wb-arrow)'}
                  markerStart={edge.bidirectional ? 'url(#wb-arrow-start)' : undefined}
                  className="group-hover:stroke-white transition-colors"
                />

                {/* Interactive Relation Badge on Line */}
                {edge.label && (
                  <g transform={`translate(${(coords.x1 + coords.x2) / 2}, ${(coords.y1 + coords.y2) / 2})`}>
                    <rect
                      x={-Math.max(30, edge.label.length * 4)}
                      y={-10}
                      width={Math.max(60, edge.label.length * 8)}
                      height={20}
                      rx={6}
                      fill="#141519"
                      stroke={strokeColor}
                      strokeWidth={1}
                      className="group-hover:fill-[#1f2128] transition-colors"
                    />
                    <text
                      x={0}
                      y={3.5}
                      fill={strokeColor}
                      fontSize="9.5"
                      fontFamily="Inter, sans-serif"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {edge.label}
                    </text>
                  </g>
                )}
              </g>
            )
          })}

          {/* Dynamic Arrow Dragging Preview */}
          {connectingFromNodeId && connectingMousePos && (() => {
            const fromNode = doc.nodes.find((n) => n.id === connectingFromNodeId)
            if (!fromNode) return null
            const startX = fromNode.x + fromNode.width / 2
            const startY = fromNode.y + fromNode.height / 2
            return (
              <line
                x1={startX}
                y1={startY}
                x2={connectingMousePos.x}
                y2={connectingMousePos.y}
                stroke="#38bdf8"
                strokeWidth="2.5"
                strokeDasharray="4 4"
                markerEnd="url(#wb-arrow)"
              />
            )
          })()}
        </g>
      </svg>

      {/* UNBOUNDED FULL-SCREEN NODES CONTAINER */}
      <div
        className="absolute inset-0 pointer-events-none w-full h-full overflow-visible"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
      >
        {doc.nodes
          .filter((n) => n.type !== 'drawing_stroke')
          .map((node) => {
            const isSelected = selectedNodeIds.includes(node.id)
            const isHighlighted = highlightedNodeId === node.id
            const isConnecting = activeTool === 'arrow' || activeTool === 'soft_link'

            return (
              <div
                key={node.id}
                style={{
                  transform: `translate(${node.x}px, ${node.y}px)`,
                  width: `${node.width}px`,
                  minHeight: `${node.height}px`
                }}
                onMouseDown={(e) => {
                  if (activeTool === 'pen') return
                  if (activeTool === 'eraser') {
                    notifyChange({ ...doc, nodes: doc.nodes.filter((n) => n.id !== node.id) })
                    return
                  }
                  if (isConnecting) {
                    e.stopPropagation()
                    setConnectingFromNodeId(node.id)
                    setConnectingMousePos(toWorldCoords(e.clientX, e.clientY))
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
                onMouseUp={(e) => {
                  if (isConnecting && connectingFromNodeId) {
                    e.stopPropagation()
                    handleNodeConnectEnd(node.id)
                  }
                }}
                className={`absolute ${
                  activeTool === 'pen' ? 'pointer-events-none' : 'pointer-events-auto'
                } rounded-2xl transition-all shadow-xl ${
                  isHighlighted
                    ? 'ring-4 ring-[#10b981] scale-105 shadow-2xl animate-pulse'
                    : isSelected
                    ? 'ring-2 ring-[#38bdf8] shadow-2xl'
                    : 'hover:ring-1 hover:ring-[#3f3f46]'
                }`}
              >
                {/* 8 Resize Handles on Selected Node */}
                {isSelected && activeTool === 'select' && render8ResizeHandles(node)}

                {/* 1. Minimalist Regular Note (Czysty tekst / Frameless Note) */}
                {node.type === 'text_card' && (
                  <div className="h-full w-full p-4 rounded-2xl bg-[#141519]/40 hover:bg-[#18181b]/70 border border-transparent hover:border-[#27272a] backdrop-blur-[2px] flex flex-col justify-between text-xs break-words overflow-hidden transition-colors">
                    {editingNodeId === node.id ? (
                      <div
                        onKeyDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="flex flex-col h-full gap-2 relative"
                      >
                        {/* Formatting Bar */}
                        <div className="flex items-center gap-1 pb-1 border-b border-white/10 text-[10px]">
                          {['small', 'medium', 'large', 'heading'].map((sz) => (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => {
                                const updated = doc.nodes.map((n) =>
                                  n.id === node.id ? { ...n, data: { ...n.data, fontSize: sz } } : n
                                )
                                setDoc({ ...doc, nodes: updated })
                              }}
                              className={`px-1.5 py-0.5 rounded font-mono ${
                                (node.data.fontSize || 'medium') === sz
                                  ? 'bg-[#38bdf8]/20 text-[#38bdf8] font-bold'
                                  : 'text-[#71717a] hover:text-[#f4f4f5]'
                              }`}
                            >
                              {sz === 'small' ? 'S' : sz === 'medium' ? 'M' : sz === 'large' ? 'L' : 'H'}
                            </button>
                          ))}
                          <div className="w-px h-3 bg-white/10 mx-1" />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = doc.nodes.map((n) =>
                                n.id === node.id ? { ...n, data: { ...n.data, bold: !n.data.bold } } : n
                              )
                              setDoc({ ...doc, nodes: updated })
                            }}
                            className={`p-1 rounded ${node.data.bold ? 'bg-white/20 text-[#f4f4f5]' : 'text-[#71717a]'}`}
                          >
                            <Bold className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = doc.nodes.map((n) =>
                                n.id === node.id ? { ...n, data: { ...n.data, italic: !n.data.italic } } : n
                              )
                              setDoc({ ...doc, nodes: updated })
                            }}
                            className={`p-1 rounded ${node.data.italic ? 'bg-white/20 text-[#f4f4f5]' : 'text-[#71717a]'}`}
                          >
                            <Italic className="w-3 h-3" />
                          </button>
                        </div>

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
                          className="bg-transparent border-b border-white/10 px-1 py-0.5 text-xs font-semibold text-[#f4f4f5] focus:outline-none focus:border-[#38bdf8]"
                        />

                        <textarea
                          value={node.data.markdown || ''}
                          onChange={(e) => {
                            const text = e.target.value
                            const scrollH = e.target.scrollHeight
                            const newHeight = Math.max(140, scrollH + 70)

                            // Check for @ mention trigger
                            const lastWord = text.split(/\s+/).pop() || ''
                            if (lastWord.startsWith('@')) {
                              setMentionOpen(true)
                              setMentionQuery(lastWord.slice(1))
                              setMentionTargetNodeId(node.id)
                            } else {
                              setMentionOpen(false)
                            }

                            const updated = doc.nodes.map((n) =>
                              n.id === node.id
                                ? { ...n, height: Math.max(n.height, newHeight), data: { ...n.data, markdown: text } }
                                : n
                            )
                            setDoc({ ...doc, nodes: updated })
                          }}
                          placeholder="Treść... Wpisz @ aby podlinkować"
                          className={`flex-1 bg-transparent text-[#f4f4f5] resize-none focus:outline-none leading-relaxed ${
                            node.data.fontSize === 'heading'
                              ? 'text-base font-bold'
                              : node.data.fontSize === 'large'
                              ? 'text-sm'
                              : node.data.fontSize === 'small'
                              ? 'text-[10px]'
                              : 'text-xs'
                          } ${node.data.bold ? 'font-bold' : ''} ${node.data.italic ? 'italic' : ''}`}
                        />

                        {/* Autocomplete Menu */}
                        {mentionOpen && mentionTargetNodeId === node.id && (
                          <MentionAutocomplete
                            isOpen={mentionOpen}
                            query={mentionQuery}
                            candidates={mentionCandidates}
                            onSelect={(c) => {
                              const words = (node.data.markdown || '').split(/\s+/)
                              words[words.length - 1] = `@${c.title}`
                              const newMarkdown = words.join(' ') + ' '
                              const updated = doc.nodes.map((n) =>
                                n.id === node.id ? { ...n, data: { ...n.data, markdown: newMarkdown } } : n
                              )
                              setDoc({ ...doc, nodes: updated })
                              setMentionOpen(false)
                            }}
                            onClose={() => setMentionOpen(false)}
                          />
                        )}

                        <button
                          onClick={() => {
                            setEditingNodeId(null)
                            notifyChange(doc)
                          }}
                          className="self-end px-3 py-1 rounded-lg bg-[#27272a] hover:bg-[#3f3f46] text-[11px] font-medium text-[#f4f4f5]"
                        >
                          Gotowe
                        </button>
                      </div>
                    ) : (
                      <div onDoubleClick={() => setEditingNodeId(node.id)}>
                        {node.data.title && (
                          <div className="font-semibold text-[#f4f4f5] mb-1.5 flex items-center justify-between opacity-90">
                            <span className="truncate">{node.data.title}</span>
                            <Edit2 className="w-3 h-3 text-[#71717a] opacity-0 hover:opacity-100 cursor-pointer shrink-0" />
                          </div>
                        )}
                        <div
                          className={`leading-relaxed whitespace-pre-wrap break-words ${
                            node.data.fontSize === 'heading'
                              ? 'text-base font-bold text-[#f4f4f5]'
                              : node.data.fontSize === 'large'
                              ? 'text-sm text-[#f4f4f5]'
                              : node.data.fontSize === 'small'
                              ? 'text-[10px] text-[#a1a1aa]'
                              : 'text-xs text-[#d4d4d8]'
                          } ${node.data.bold ? 'font-bold' : ''} ${node.data.italic ? 'italic' : ''}`}
                        >
                          {renderLinkedText(node.data.markdown || 'Kliknij dwukrotnie, aby pisać...')}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Vibrant Square Sticky Note (Proportional Auto-Scaling) */}
                {node.type === 'sticky_note' && (() => {
                  const palette = STICKY_COLORS[node.data.color || 'yellow'] || STICKY_COLORS.yellow
                  return (
                    <div
                      onDoubleClick={() => setEditingNodeId(node.id)}
                      className={`h-full w-full p-4 rounded-2xl border shadow-xl flex flex-col justify-between text-xs transition-all overflow-hidden break-words ${palette.bg} ${palette.border} ${palette.text}`}
                    >
                      {editingNodeId === node.id ? (
                        <div
                          onKeyDown={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          className="flex flex-col h-full gap-2 relative"
                        >
                          <textarea
                            value={node.data.text || ''}
                            onChange={(e) => {
                              const text = e.target.value
                              // Proportional scaling (square growth in both width and height)
                              const chars = text.length
                              const proportionalDim = Math.max(200, Math.round(Math.sqrt(chars * 320)))

                              // Check for @ mention trigger
                              const lastWord = text.split(/\s+/).pop() || ''
                              if (lastWord.startsWith('@')) {
                                setMentionOpen(true)
                                setMentionQuery(lastWord.slice(1))
                                setMentionTargetNodeId(node.id)
                              } else {
                                setMentionOpen(false)
                              }

                              const updated = doc.nodes.map((n) =>
                                n.id === node.id
                                  ? {
                                      ...n,
                                      width: Math.max(n.width, proportionalDim),
                                      height: Math.max(n.height, proportionalDim),
                                      data: { ...n.data, text }
                                    }
                                  : n
                              )
                              setDoc({ ...doc, nodes: updated })
                            }}
                            autoFocus
                            placeholder="Wpisz treść... (@ aby linkować)"
                            className="flex-1 bg-transparent text-inherit resize-none focus:outline-none text-xs font-medium leading-relaxed"
                          />

                          {/* Autocomplete Menu */}
                          {mentionOpen && mentionTargetNodeId === node.id && (
                            <MentionAutocomplete
                              isOpen={mentionOpen}
                              query={mentionQuery}
                              candidates={mentionCandidates}
                              onSelect={(c) => {
                                const words = (node.data.text || '').split(/\s+/)
                                words[words.length - 1] = `@${c.title}`
                                const newText = words.join(' ') + ' '
                                const updated = doc.nodes.map((n) =>
                                  n.id === node.id ? { ...n, data: { ...n.data, text: newText } } : n
                                )
                                setDoc({ ...doc, nodes: updated })
                                setMentionOpen(false)
                              }}
                              onClose={() => setMentionOpen(false)}
                            />
                          )}

                          <div className="flex items-center justify-between pt-1 border-t border-black/10">
                            {/* Color Switcher */}
                            <div className="flex items-center gap-1">
                              {Object.keys(STICKY_COLORS).map((cKey) => (
                                <button
                                  key={cKey}
                                  type="button"
                                  onClick={() => {
                                    const updated = doc.nodes.map((n) =>
                                      n.id === node.id ? { ...n, data: { ...n.data, color: cKey } } : n
                                    )
                                    notifyChange({ ...doc, nodes: updated })
                                  }}
                                  className={`w-4 h-4 rounded-full border border-black/20 ${STICKY_COLORS[cKey].bg} ${
                                    node.data.color === cKey ? 'ring-2 ring-black/40 scale-110' : ''
                                  }`}
                                />
                              ))}
                            </div>

                            <button
                              onClick={() => {
                                setEditingNodeId(null)
                                notifyChange(doc)
                              }}
                              className="px-2.5 py-0.5 rounded bg-black/20 hover:bg-black/40 text-[10px] font-bold text-inherit"
                            >
                              Zapisz
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="text-xs font-semibold leading-relaxed whitespace-pre-wrap break-words">
                            {renderLinkedText(node.data.text || 'Karteczka Sticky')}
                          </div>
                          <div className="text-[9px] opacity-60 self-end font-mono">Sticky Note</div>
                        </>
                      )}
                    </div>
                  )
                })()}

                {/* 3. Image Node / Visual Entity */}
                {(node.type === 'image_node' || node.type === 'visual_entity_node') && (
                  <div className="h-full w-full rounded-2xl bg-[#18181b] border border-[#27272a] overflow-hidden flex flex-col shadow-lg">
                    <div className="flex-1 bg-[#09090b] flex items-center justify-center p-1 overflow-hidden relative min-h-[140px]">
                      {node.data.src ? (
                        <img
                          src={node.data.src}
                          alt={node.data.title}
                          className="max-h-full max-w-full object-contain rounded-lg shadow-sm"
                        />
                      ) : (
                        <div className="text-[#71717a] flex flex-col items-center gap-1.5">
                          <User className="w-8 h-8 text-[#c084fc] opacity-60" />
                          <span className="text-[10px] text-[#f4f4f5] font-medium">{node.data.title}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-2.5 border-t border-[#27272a] flex items-center justify-between text-xs text-[#f4f4f5] bg-[#18181b]">
                      <span className="truncate font-semibold text-xs">{node.data.title || 'Obraz'}</span>
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
                    className={`h-full w-full border-2 border-[#38bdf8]/60 bg-[#18181b]/70 flex flex-col items-center justify-center p-4 text-xs backdrop-blur-sm overflow-hidden break-words ${
                      node.data.shapeType === 'ellipse' ? 'rounded-full' : 'rounded-2xl'
                    }`}
                  >
                    {editingNodeId === node.id ? (
                      <textarea
                        value={node.data.text || node.data.label || ''}
                        onChange={(e) => {
                          const scrollH = e.target.scrollHeight
                          const newHeight = Math.max(160, scrollH + 50)
                          const updated = doc.nodes.map((n) =>
                            n.id === node.id
                              ? {
                                  ...n,
                                  height: Math.max(n.height, newHeight),
                                  data: { ...n.data, text: e.target.value, label: e.target.value }
                                }
                              : n
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
                        placeholder="Wpisz treść..."
                        className="w-full h-full bg-transparent text-[#f4f4f5] text-center resize-none focus:outline-none text-xs font-semibold break-words leading-relaxed"
                      />
                    ) : (
                      <span className="font-semibold text-[#f4f4f5] text-center leading-relaxed break-words">
                        {renderLinkedText(node.data.text || node.data.label || 'Kształt')}
                      </span>
                    )}
                  </div>
                )}

                {/* 5. Live Editable Active Recall Flashcard (Excluded from Graph) */}
                {node.type === 'quiz_card' && (
                  <div
                    onKeyDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="h-full w-full p-4 rounded-2xl bg-[#18181b] border border-[#f59e0b]/40 flex flex-col justify-between shadow-xl text-xs overflow-hidden break-words"
                  >
                    <div>
                      <div className="text-[10px] text-[#f59e0b] font-bold uppercase tracking-wider mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>Fiszka SRS (Nie w grafie)</span>
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
                          className="text-[#f4f4f5] text-xs font-semibold mb-2 leading-relaxed break-words"
                        >
                          {node.data.question}
                        </div>
                      )}
                    </div>

                    {!editingNodeId && (
                      <div className="pt-2 border-t border-[#27272a]">
                        {node.data.is_flipped ? (
                          <div className="flex items-center justify-between">
                            <span className="text-[#10b981] text-xs font-mono font-semibold break-all">
                              {node.data.answer}
                            </span>
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

      {/* Floating Toolbar */}
      <WhiteboardToolbar
        activeTool={activeTool}
        onSelectTool={(t) => setActiveTool(t)}
        penColor={penColor}
        onChangePenColor={(c) => setPenColor(c)}
        penWidth={penWidth}
        onChangePenWidth={(w) => setPenWidth(w)}
        onAddImage={handleAddImage}
      />

      {/* Image Name Input Modal */}
      <ImageNameModal
        isOpen={imageModalOpen}
        previewSrc={pendingImageData?.base64 || null}
        defaultName={pendingImageData?.fileName || 'Nowe_Zdjecie'}
        onClose={() => setImageModalOpen(false)}
        onConfirm={handleConfirmImage}
      />

      {/* Arrow Properties & Customization Modal */}
      {editingEdge && (
        <ArrowEditModal
          isOpen={!!editingEdge}
          initialData={{
            label: editingEdge.label || '',
            color: editingEdge.color || '#38bdf8',
            style: editingEdge.style || 'solid',
            bidirectional: editingEdge.bidirectional || false,
            strokeWidth: 2.5
          }}
          onClose={() => setEditingEdge(null)}
          onConfirm={handleUpdateEdge}
        />
      )}

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
              <span className="text-[10px] text-[#71717a] italic p-1">
                Brak subtelnych linków. Użyj narzędzia [L] lub wpisz @nazwa w tekście!
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
