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
  Bold,
  Italic,
  Type,
  BoxSelect,
  Link2
} from 'lucide-react'
import { IpcChannel } from '../../../../shared/ipc/channels'

import { AppConfig, DEFAULT_APP_CONFIG, StickyPaletteColor } from '../../../../shared/types/config'

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

const DEFAULT_STICKY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  sticky_violet: { bg: '#25123e', border: '#a855f7', text: '#e9d5ff' },
  sticky_deep_purple: { bg: '#170c28', border: '#7c3aed', text: '#ddd6fe' },
  sticky_navy: { bg: '#0b112c', border: '#3b82f6', text: '#bfdbfe' },
  sticky_midnight: { bg: '#101438', border: '#6366f1', text: '#c7d2fe' },
  sticky_lavender: { bg: '#2c1b4d', border: '#c084fc', text: '#f3e8ff' },
  sticky_electric: { bg: '#1e0d36', border: '#9333ea', text: '#fae8ff' },
  yellow: { bg: '#25123e', border: '#a855f7', text: '#e9d5ff' },
  purple: { bg: '#170c28', border: '#7c3aed', text: '#ddd6fe' },
  blue: { bg: '#0b112c', border: '#3b82f6', text: '#bfdbfe' },
  green: { bg: '#101438', border: '#6366f1', text: '#c7d2fe' },
  pink: { bg: '#2c1b4d', border: '#c084fc', text: '#f3e8ff' },
  orange: { bg: '#1e0d36', border: '#9333ea', text: '#fae8ff' }
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
  const [penColor, setPenColor] = useState('#c084fc')
  const [penWidth, setPenWidth] = useState(3)
  const [stickyPalette, setStickyPalette] = useState<StickyPaletteColor[]>(DEFAULT_APP_CONFIG.stickyPalette)

  // Infinite Viewport Pan & Zoom
  const [pan, setPan] = useState({ x: document.viewport?.x || 0, y: document.viewport?.y || 0 })
  const [zoom, setZoom] = useState(document.viewport?.zoom || 1.0)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })

  // Node selection, dragging & resizing
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const draggedFrameChildrenRef = useRef<{ id: string; offsetX: number; offsetY: number }[]>([])
  const [isDraggingEraser, setIsDraggingEraser] = useState(false)
  
  // 8-Directional Resizing
  const [resizingNodeId, setResizingNodeId] = useState<string | null>(null)
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null)
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0, mouseX: 0, mouseY: 0 })
  
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const editingNodeIdRef = useRef<string | null>(null)
  editingNodeIdRef.current = editingNodeId
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

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

  // Błędy 3 & 4: Zabezpieczenie przed nadpisywaniem stanu edycji z zewnątrz (Race condition fix)
  useEffect(() => {
    if (editingNodeIdRef.current) return
    setDoc(document)
  }, [document])

  // Load workspace candidates and config
  useEffect(() => {
    const loadData = async () => {
      try {
        const [graphRes, configRes] = await Promise.all([
          window.electronAPI.invoke(IpcChannel.DB_GET_GRAPH_DATA, {}),
          window.electronAPI.invoke(IpcChannel.CONFIG_GET, undefined)
        ])
        if (graphRes?.nodes) {
          const list: MentionCandidate[] = graphRes.nodes.map((n: any) => ({
            id: n.id,
            title: n.title,
            type: n.type === 'canvas' ? 'canvas' : n.type === 'visual_entity' ? 'asset' : 'note'
          }))
          setAllWorkspaceCandidates(list)
        }
        if (configRes?.config?.stickyPalette) {
          setStickyPalette(configRes.config.stickyPalette)
        }
      } catch {
        // Ignore
      }
    }
    loadData()
  }, [])

  const notifyChange = (updatedDoc: CanvasDocument, immediate = false) => {
    setDoc(updatedDoc)
    if (immediate) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      onDocumentChanged(updatedDoc)
    } else {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = setTimeout(() => {
        onDocumentChanged(updatedDoc)
      }, 200)
    }
  }

  const handleCommitNodeEdit = async () => {
    editingNodeIdRef.current = null
    setEditingNodeId(null)
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    onDocumentChanged(doc)
    if (document.canvas_id) {
      try {
        await window.electronAPI.invoke(IpcChannel.FILE_WRITE_ATOMIC, {
          relativePath: document.canvas_id,
          content: JSON.stringify(doc, null, 2),
          createBackup: false
        })
      } catch (err) {
        console.error('Failed to flush canvas to disk on commit:', err)
      }
    }
  }

  // Błąd 5: Obsługa przewijania wewnątrz notatek (płynny scroll wewnątrz, a po osiągnięciu krawędzi zoom płótna)
  const handleCardWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const canScroll = el.scrollHeight > el.clientHeight
    if (canScroll) {
      const atTop = el.scrollTop <= 0 && e.deltaY < 0
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1 && e.deltaY > 0
      if (!atTop && !atBottom) {
        e.stopPropagation()
        return
      }
    }
  }

  // Helper: Odległość punktu od odcinka dla gumki (Radial Sweeper)
  function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1)
    if (l2 === 0) return Math.hypot(px - x1, py - y1)
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2
    t = Math.max(0, Math.min(1, t))
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)))
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

      // Moduł 6: Inteligentne Ramki Sekcji (Ctrl+G)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'g' || e.key === 'G')) {
        e.preventDefault()
        if (selectedNodeIds.length > 0) {
          const selectedNodes = doc.nodes.filter((n) => selectedNodeIds.includes(n.id))
          const minX = Math.min(...selectedNodes.map((n) => n.x)) - 30
          const minY = Math.min(...selectedNodes.map((n) => n.y)) - 40
          const maxX = Math.max(...selectedNodes.map((n) => n.x + n.width)) + 30
          const maxY = Math.max(...selectedNodes.map((n) => n.y + n.height)) + 30

          const frameNode: CanvasNode = {
            id: `frame_${Date.now()}`,
            type: 'shape',
            x: Math.round(minX),
            y: Math.round(minY),
            width: Math.round(maxX - minX),
            height: Math.round(maxY - minY),
            data: {
              shapeType: 'frame',
              label: 'Sekcja Architektury',
              fillColor: 'rgba(37, 20, 58, 0.25)',
              borderColor: '#422066'
            }
          }
          notifyChange({ ...doc, nodes: [frameNode, ...doc.nodes] }, true)
        } else {
          setActiveTool('frame')
        }
        return
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeIds.length > 0) {
          const updatedNodes = doc.nodes.filter((n) => !selectedNodeIds.includes(n.id))
          const updatedEdges = doc.edges.filter(
            (edge) => !selectedNodeIds.includes(edge.fromNode) && !selectedNodeIds.includes(edge.toNode)
          )
          setSelectedNodeIds([])
          notifyChange({ ...doc, nodes: updatedNodes, edges: updatedEdges }, true)
        }
      } else if (e.key === 'v' || e.key === 'V') {
        setActiveTool('select')
      } else if (e.key === 'h' || e.key === 'H') {
        setActiveTool('hand')
      } else if (e.key === 'e' || e.key === 'E') {
        setActiveTool('eraser')
      } else if (e.key === 't' || e.key === 'T') {
        setActiveTool('text')
      } else if (e.key === 's' || e.key === 'S') {
        setActiveTool('sticky')
      } else if (e.key === 'r' || e.key === 'R') {
        setActiveTool('rectangle')
      } else if (e.key === 'f' || e.key === 'F') {
        setActiveTool('frame')
      } else if (e.key === 'a' || e.key === 'A' || e.key === 'l' || e.key === 'L') {
        setActiveTool('arrow')
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

  // Prop 5: Smart Nearest-Edge Routing with Dynamic Magnet Ports (16px spacing)
  const calculateSmartEdge = (n1: CanvasNode, n2: CanvasNode, edgeId?: string) => {
    const c1 = { x: n1.x + n1.width / 2, y: n1.y + n1.height / 2 }
    const c2 = { x: n2.x + n2.width / 2, y: n2.y + n2.height / 2 }
    const dx = c2.x - c1.x
    const dy = c2.y - c1.y

    let side1: 'left' | 'right' | 'top' | 'bottom'
    let side2: 'left' | 'right' | 'top' | 'bottom'

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) {
        side1 = 'right'
        side2 = 'left'
      } else {
        side1 = 'left'
        side2 = 'right'
      }
    } else {
      if (dy > 0) {
        side1 = 'bottom'
        side2 = 'top'
      } else {
        side1 = 'top'
        side2 = 'bottom'
      }
    }

    let offset1 = 0
    let offset2 = 0

    if (edgeId && doc.edges) {
      const edgesN1 = doc.edges.filter((e) => {
        if (e.fromNode === n1.id) {
          const other = doc.nodes.find((n) => n.id === e.toNode)
          if (!other) return false
          const odx = other.x + other.width / 2 - c1.x
          const ody = other.y + other.height / 2 - c1.y
          const oside = Math.abs(odx) > Math.abs(ody) ? (odx > 0 ? 'right' : 'left') : (ody > 0 ? 'bottom' : 'top')
          return oside === side1
        }
        return false
      })

      const idx1 = edgesN1.findIndex((e) => e.id === edgeId)
      if (idx1 >= 0 && edgesN1.length > 1) {
        offset1 = (idx1 - (edgesN1.length - 1) / 2) * 16
      }

      const edgesN2 = doc.edges.filter((e) => {
        if (e.toNode === n2.id) {
          const other = doc.nodes.find((n) => n.id === e.fromNode)
          if (!other) return false
          const odx = c2.x - (other.x + other.width / 2)
          const ody = c2.y - (other.y + other.height / 2)
          const oside = Math.abs(odx) > Math.abs(ody) ? (odx > 0 ? 'left' : 'right') : (ody > 0 ? 'top' : 'bottom')
          return oside === side2
        }
        return false
      })

      const idx2 = edgesN2.findIndex((e) => e.id === edgeId)
      if (idx2 >= 0 && edgesN2.length > 1) {
        offset2 = (idx2 - (edgesN2.length - 1) / 2) * 16
      }
    }

    let p1 = { x: c1.x, y: c1.y }
    let p2 = { x: c2.x, y: c2.y }

    if (side1 === 'right') p1 = { x: n1.x + n1.width, y: c1.y + offset1 }
    else if (side1 === 'left') p1 = { x: n1.x, y: c1.y + offset1 }
    else if (side1 === 'bottom') p1 = { x: c1.x + offset1, y: n1.y + n1.height }
    else p1 = { x: c1.x + offset1, y: n1.y }

    if (side2 === 'right') p2 = { x: n2.x + n2.width, y: c2.y + offset2 }
    else if (side2 === 'left') p2 = { x: n2.x, y: c2.y + offset2 }
    else if (side2 === 'bottom') p2 = { x: c2.x + offset2, y: n2.y + n2.height }
    else p2 = { x: c2.x + offset2, y: n2.y }

    return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y }
  }

  // Prop 3: Radial Sweeper Eraser (R = 24px)
  const applyEraserSweep = (worldX: number, worldY: number) => {
    const R = 24
    let nodesChanged = false
    let edgesChanged = false

    // 1. Remove edges within 24px of line segment
    const remainingEdges = doc.edges.filter((edge) => {
      const fromNode = doc.nodes.find((n) => n.id === edge.fromNode)
      const toNode = doc.nodes.find((n) => n.id === edge.toNode)
      if (!fromNode || !toNode) return false
      const coords = calculateSmartEdge(fromNode, toNode, edge.id)
      const dist = distToSegment(worldX, worldY, coords.x1, coords.y1, coords.x2, coords.y2)
      if (dist <= R) {
        edgesChanged = true
        return false
      }
      return true
    })

    // 2. Remove drawing strokes within 24px of any point or segment
    const remainingNodes = doc.nodes.filter((node) => {
      if (node.type === 'drawing_stroke' && node.data?.points) {
        const pts = node.data.points
        for (let i = 0; i < pts.length - 1; i++) {
          const d = distToSegment(worldX, worldY, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y)
          if (d <= R) {
            nodesChanged = true
            return false
          }
        }
        return true
      }
      const withinX = worldX >= node.x - R && worldX <= node.x + node.width + R
      const withinY = worldY >= node.y - R && worldY <= node.y + node.height + R
      if (withinX && withinY) {
        if (worldX >= node.x && worldX <= node.x + node.width && worldY >= node.y && worldY <= node.y + node.height) {
          nodesChanged = true
          return false
        }
      }
      return true
    })

    if (nodesChanged || edgesChanged) {
      notifyChange({
        ...doc,
        nodes: remainingNodes,
        edges: remainingEdges.filter((e) =>
          remainingNodes.some((n) => n.id === e.fromNode) && remainingNodes.some((n) => n.id === e.toNode)
        )
      })
    }
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

    // Eraser tool (Radial Sweeper)
    if (activeTool === 'eraser' && e.button === 0) {
      setIsDraggingEraser(true)
      applyEraserSweep(world.x, world.y)
      return
    }

    // Creating new objects by clicking on canvas
    if (e.button === 0) {
      if (activeTool === 'frame') {
        const frameNode: CanvasNode = {
          id: `frame_${Date.now()}`,
          type: 'shape',
          x: Math.round(world.x),
          y: Math.round(world.y),
          width: 480,
          height: 320,
          data: {
            shapeType: 'frame',
            label: 'Sekcja Architektury',
            fillColor: 'rgba(37, 20, 58, 0.25)',
            borderColor: '#422066'
          }
        }
        notifyChange({ ...doc, nodes: [frameNode, ...doc.nodes] }, true)
        setSelectedNodeIds([frameNode.id])
        setActiveTool('select')
        return
      }

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
            color: 'sticky_violet'
          }
        }
        notifyChange({ ...doc, nodes: [...doc.nodes, newNode] })
        if (onNodeAdded) onNodeAdded(newNode.id)
        setSelectedNodeIds([newNode.id])
        setEditingNodeId(newNode.id)
        setActiveTool('select')
        return
      }

      if (activeTool === 'rectangle') {
        const newNode: CanvasNode = {
          id: `node_shape_${Date.now()}`,
          type: 'shape',
          x: Math.round(world.x),
          y: Math.round(world.y),
          width: 240,
          height: 160,
          data: {
            shapeType: 'rectangle',
            label: 'Obszar / Sekcja',
            text: '',
            fillColor: 'rgba(16, 19, 34, 0.8)',
            borderColor: '#422066'
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
    } else if (isDraggingEraser && activeTool === 'eraser') {
      applyEraserSweep(world.x, world.y)
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
      const newX = Math.round(world.x - dragOffset.x)
      const newY = Math.round(world.y - dragOffset.y)
      const updated = doc.nodes.map((n) => {
        if (n.id === draggedNodeId) {
          return {
            ...n,
            x: newX,
            y: newY
          }
        }
        const childInfo = draggedFrameChildrenRef.current.find((c) => c.id === n.id)
        if (childInfo) {
          return {
            ...n,
            x: Math.round(newX + childInfo.offsetX),
            y: Math.round(newY + childInfo.offsetY)
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
      if (isDraggingEraser) setIsDraggingEraser(false)
      draggedFrameChildrenRef.current = []
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
  }, [doc, isPanning, isDraggingEraser, resizingNodeId, draggedNodeId, connectingFromNodeId, isDrawing, currentStroke, penColor, penWidth])

  // Mouse Up
  const handleMouseUp = () => {
    if (isPanning) setIsPanning(false)
    if (isDraggingEraser) setIsDraggingEraser(false)
    draggedFrameChildrenRef.current = []
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
      const newEdge: CanvasEdge = {
        id: `edge_${Date.now()}`,
        fromNode: connectingFromNodeId,
        toNode: targetNodeId,
        label: '',
        color: '#a855f7',
        style: 'solid',
        bidirectional: false,
        strokeWidth: 2
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
            bidirectional: config.bidirectional,
            strokeWidth: config.strokeWidth
          }
        : e
    )
    const updatedDoc = { ...doc, edges: updated }
    setDoc(updatedDoc)
    notifyChange(updatedDoc)
    setEditingEdge(null)
  }

  const handleDeleteEdge = (edgeId: string) => {
    const updatedDoc = { ...doc, edges: doc.edges.filter((e) => e.id !== edgeId) }
    setDoc(updatedDoc)
    notifyChange(updatedDoc)
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

  // Render text with interactive @mention jump links and [[wikilinks]]
  const renderLinkedText = (text: string) => {
    if (!text) return null
    // Match [[@entity_...|Label]], [[Note Title]], @[Title], @Word
    const parts = text.split(/(\[\[@[a-zA-Z0-9_\-\|]+\]\]|\[\[[a-zA-Z0-9_\-\s\/\.\u00C0-\u024F\|]+\]\]|@(?:\[[^\]]+\]|[a-zA-Z0-9_\-\u00C0-\u024F]+))/g)

    return parts.map((part, idx) => {
      if (part.startsWith('[[@')) {
        const clean = part.slice(2, -2)
        const [entId, label] = clean.split('|')
        const cleanId = entId.startsWith('@') ? entId.slice(1) : entId
        return (
          <span
            key={idx}
            onClick={(e) => {
              e.stopPropagation()
              handleJumpToNode(cleanId)
            }}
            className="inline-flex items-center gap-0.5 px-1 py-0.5 mx-0.5 rounded-md bg-[#c084fc]/20 hover:bg-[#c084fc]/35 text-[#c084fc] border border-[#c084fc]/40 cursor-pointer font-semibold transition-colors shadow-sm text-[11px]"
            title={`Zasób: ${label || cleanId}`}
          >
            <User className="w-2.5 h-2.5" />
            <span>{label || cleanId}</span>
          </span>
        )
      }

      if (part.startsWith('[[') && part.endsWith(']]')) {
        const clean = part.slice(2, -2)
        const [targetNote, label] = clean.split('|')
        return (
          <span
            key={idx}
            onClick={(e) => {
              e.stopPropagation()
              handleJumpToNode(targetNote)
            }}
            className="inline-flex items-center gap-0.5 px-1 py-0.5 mx-0.5 rounded-md bg-[#38bdf8]/20 hover:bg-[#38bdf8]/35 text-[#38bdf8] border border-[#38bdf8]/40 cursor-pointer font-semibold transition-colors shadow-sm text-[11px]"
            title={`Przejdź do: ${targetNote}`}
          >
            <FileText className="w-2.5 h-2.5" />
            <span>{label || targetNote}</span>
          </span>
        )
      }

      if (part.startsWith('@')) {
        const rawName = part.startsWith('@[') ? part.slice(2, -1) : part.slice(1)
        return (
          <span
            key={idx}
            onClick={(e) => {
              e.stopPropagation()
              handleJumpToNode(rawName)
            }}
            className="inline-flex items-center gap-0.5 px-1 py-0.5 mx-0.5 rounded-md bg-[#10b981]/20 hover:bg-[#10b981]/35 text-[#10b981] border border-[#10b981]/40 cursor-pointer font-semibold transition-colors shadow-sm text-[11px]"
            title={`Wzmianka: ${rawName}`}
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
        className={`absolute w-2.5 h-2.5 bg-[#a855f7] border border-white rounded-full z-40 hover:scale-150 transition-transform shadow-md cursor-${h.cursor}`}
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
        activeTool === 'hand' || isPanning
          ? 'cursor-grab active:cursor-grabbing'
          : activeTool === 'eraser'
          ? 'cursor-crosshair'
          : 'cursor-default'
      }`}
    >
      {/* Top Left Navigation Indicator */}
      <div className="absolute top-4 left-4 z-30 flex items-center gap-1.5 p-1 rounded-[7px] bg-[#0a0c16]/90 border border-[#422066] shadow-xl text-xs backdrop-blur-md">
        <button
          onClick={() => setZoom((z) => Math.min(3.0, z + 0.15))}
          className="p-1 rounded-[5px] text-[#8b87a8] hover:text-[#f4f4f5] hover:bg-[#25143a] transition-colors"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <span className="font-mono text-[11px] text-[#8b87a8] w-9 text-center font-medium">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom((z) => Math.max(0.15, z - 0.15))}
          className="p-1 rounded-[5px] text-[#8b87a8] hover:text-[#f4f4f5] hover:bg-[#25143a] transition-colors"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-3 bg-[#422066] mx-0.5" />
        <button
          onClick={() => {
            setPan({ x: 0, y: 0 })
            setZoom(1.0)
          }}
          className="p-1 rounded-[5px] text-[#8b87a8] hover:text-[#f4f4f5] hover:bg-[#25143a] transition-colors"
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
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#a855f7" />
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
            <path d="M 10 0 L 0 5 L 10 10 z" fill="#a855f7" />
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
            <circle cx="5" cy="5" r="4" fill="#a855f7" />
          </marker>
          {Array.from(
            new Set(
              doc.edges.map((e) => e.color || (e.style === 'dotted' || e.style === 'soft_link' ? '#a855f7' : '#c084fc'))
            )
          ).map((color) => {
            const safeId = color.replace(/[^a-zA-Z0-9]/g, '')
            return (
              <React.Fragment key={safeId}>
                <marker
                  id={`wb-arrow-${safeId}`}
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
                </marker>
                <marker
                  id={`wb-arrow-start-${safeId}`}
                  viewBox="0 0 10 10"
                  refX="4"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto"
                >
                  <path d="M 10 0 L 0 5 L 10 10 z" fill={color} />
                </marker>
              </React.Fragment>
            )
          })}
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

            const coords = calculateSmartEdge(fromNode, toNode, edge.id)
            const isSoft = edge.style === 'dotted' || edge.style === 'soft_link'
            const strokeColor = edge.color || (isSoft ? '#a855f7' : '#c084fc')
            const safeId = strokeColor.replace(/[^a-zA-Z0-9]/g, '')

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
                  strokeWidth={edge.strokeWidth || (isSoft ? 1.5 : 2.5)}
                  strokeDasharray={isSoft ? '4 4' : edge.style === 'dashed' ? '6 6' : undefined}
                  markerEnd={isSoft ? 'url(#wb-soft-arrow)' : `url(#wb-arrow-${safeId})`}
                  markerStart={edge.bidirectional ? `url(#wb-arrow-start-${safeId})` : undefined}
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
                      rx={5}
                      fill="#101322"
                      stroke={strokeColor}
                      strokeWidth={1}
                      className="group-hover:fill-[#1b122c] transition-colors"
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
                stroke="#a855f7"
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
          .sort((a, b) => (a.data?.shapeType === 'frame' ? -1 : 0) - (b.data?.shapeType === 'frame' ? -1 : 0))
          .map((node) => {
            const isSelected = selectedNodeIds.includes(node.id)
            const isHighlighted = highlightedNodeId === node.id
            const isConnecting = activeTool === 'arrow'
            const isFrame = node.data?.shapeType === 'frame'

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

                    // If dragging a frame, collect all enclosed cards to move with it
                    if (node.data?.shapeType === 'frame') {
                      const children = doc.nodes.filter(
                        (n) =>
                          n.id !== node.id &&
                          n.x >= node.x &&
                          n.y >= node.y &&
                          n.x + n.width <= node.x + node.width &&
                          n.y + n.height <= node.y + node.height
                      )
                      draggedFrameChildrenRef.current = children.map((c) => ({
                        id: c.id,
                        offsetX: c.x - node.x,
                        offsetY: c.y - node.y
                      }))
                    } else {
                      draggedFrameChildrenRef.current = []
                    }
                    onActivity()
                  }
                }}
                onMouseUp={(e) => {
                  if (isConnecting && connectingFromNodeId) {
                    e.stopPropagation()
                    handleNodeConnectEnd(node.id)
                  }
                }}
                className={`absolute pointer-events-auto ${isFrame ? 'z-[1]' : 'z-[10]'} rounded-[7px] transition-all shadow-xl ${
                  isHighlighted
                    ? 'ring-2 ring-[#c084fc] shadow-[0_0_15px_rgba(168,85,247,0.5)] scale-105 animate-pulse'
                    : isSelected
                    ? 'ring-2 ring-[#a855f7] shadow-2xl'
                    : 'hover:ring-1 hover:ring-[#422066]'
                }`}
              >
                {/* 8 Resize Handles on Selected Node */}
                {isSelected && activeTool === 'select' && render8ResizeHandles(node)}

                {/* 1. Minimalist Regular Note (Czysty tekst / Frameless Note) */}
                {node.type === 'text_card' && (
                  <div className="h-full w-full p-4 rounded-[7px] bg-[#101322] border border-[#422066] specular-border shadow-2xl flex flex-col justify-between text-xs break-words overflow-hidden transition-colors">
                    {editingNodeId === node.id ? (
                      <div
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                            handleCommitNodeEdit()
                          }
                          e.stopPropagation()
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="flex flex-col h-full gap-2 relative"
                      >
                        {/* Formatting Bar */}
                        <div className="flex items-center gap-1 pb-1 border-b border-[#422066] text-[10px]">
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
                              className={`px-1.5 py-0.5 rounded-[3px] font-mono ${
                                (node.data.fontSize || 'medium') === sz
                                  ? 'bg-[#a855f7]/20 text-[#c084fc] font-bold'
                                  : 'text-[#8b87a8] hover:text-[#f4f4f5]'
                              }`}
                            >
                              {sz === 'small' ? 'S' : sz === 'medium' ? 'M' : sz === 'large' ? 'L' : 'H'}
                            </button>
                          ))}
                          <div className="w-px h-3 bg-[#422066] mx-1" />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = doc.nodes.map((n) =>
                                n.id === node.id ? { ...n, data: { ...n.data, bold: !n.data.bold } } : n
                              )
                              setDoc({ ...doc, nodes: updated })
                            }}
                            className={`p-1 rounded-[3px] ${node.data.bold ? 'bg-[#25143a] text-[#f4f4f5]' : 'text-[#8b87a8]'}`}
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
                            className={`p-1 rounded-[3px] ${node.data.italic ? 'bg-[#25143a] text-[#f4f4f5]' : 'text-[#8b87a8]'}`}
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
                          className="bg-transparent border-b border-[#422066] px-1 py-0.5 text-xs font-semibold text-[#f4f4f5] focus:outline-none focus:border-[#a855f7]"
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
                          onClick={handleCommitNodeEdit}
                          className="self-end px-3 py-1 rounded-[5px] bg-[#25143a] hover:bg-[#341b52] border border-[#422066] text-[11px] font-medium text-[#c084fc] transition-colors"
                        >
                          Gotowe
                        </button>
                      </div>
                    ) : (
                      <div
                        onWheel={handleCardWheel}
                        onDoubleClick={() => setEditingNodeId(node.id)}
                        className="overflow-y-auto max-h-full pr-1"
                      >
                        {node.data.title && (
                          <div className="font-semibold text-[#f4f4f5] mb-1.5 flex items-center justify-between opacity-90">
                            <span className="truncate">{node.data.title}</span>
                            <Edit2 className="w-3 h-3 text-[#a855f7] opacity-0 hover:opacity-100 cursor-pointer shrink-0" />
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

                {/* 2. Vibrant Square Sticky Note (Proportional Auto-Scaling & RGB Live Styling) */}
                {node.type === 'sticky_note' && (() => {
                  const preset = stickyPalette.find((p) => p.id === node.data.color) ||
                    DEFAULT_STICKY_COLORS[node.data.color || 'sticky_violet'] ||
                    DEFAULT_STICKY_COLORS.sticky_violet

                  const bgStyle = preset.bg?.startsWith('#') ? preset.bg : '#25123e'
                  const borderStyle = preset.border?.startsWith('#') ? preset.border : '#a855f7'
                  const textStyle = preset.text?.startsWith('#') ? preset.text : '#e9d5ff'

                  return (
                    <div
                      onWheel={handleCardWheel}
                      onDoubleClick={() => setEditingNodeId(node.id)}
                      style={{
                        backgroundColor: bgStyle,
                        borderColor: borderStyle,
                        color: textStyle
                      }}
                      className="h-full w-full p-4 rounded-[7px] border shadow-2xl flex flex-col justify-between text-xs transition-all overflow-hidden break-words backdrop-blur-md specular-border"
                    >
                      {editingNodeId === node.id ? (
                        <div
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                              handleCommitNodeEdit()
                            }
                            e.stopPropagation()
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          className="flex flex-col h-full gap-2 relative"
                        >
                          <textarea
                            value={node.data.text || ''}
                            onChange={(e) => {
                              const text = e.target.value
                              const chars = text.length
                              const proportionalDim = Math.max(200, Math.round(Math.sqrt(chars * 320)))

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
                              {stickyPalette.map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => {
                                    const updated = doc.nodes.map((n) =>
                                      n.id === node.id ? { ...n, data: { ...n.data, color: p.id } } : n
                                    )
                                    notifyChange({ ...doc, nodes: updated })
                                  }}
                                  style={{ backgroundColor: p.bg, borderColor: p.border }}
                                  className={`w-4 h-4 rounded-full border-2 transition-transform ${
                                    node.data.color === p.id ? 'ring-2 ring-white scale-125' : 'opacity-80 hover:opacity-100'
                                  }`}
                                  title={p.name}
                                />
                              ))}
                            </div>

                            <button
                              onClick={handleCommitNodeEdit}
                              className="px-2.5 py-0.5 rounded-[5px] bg-black/20 hover:bg-black/40 text-[10px] font-bold text-inherit transition-colors"
                            >
                              Zapisz
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="overflow-y-auto max-h-full pr-1 flex flex-col justify-between h-full">
                          <div className="text-xs font-semibold leading-relaxed whitespace-pre-wrap break-words">
                            {renderLinkedText(node.data.text || 'Karteczka Sticky')}
                          </div>
                          <div className="text-[9px] opacity-60 self-end font-mono">Sticky Note</div>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* 3. Image Node / Visual Entity */}
                {(node.type === 'image_node' || node.type === 'visual_entity_node') && (
                  <div className="h-full w-full rounded-[7px] bg-[#101322] border border-[#422066] specular-border overflow-hidden flex flex-col shadow-lg">
                    <div className="flex-1 bg-[#06070d] flex items-center justify-center p-1 overflow-hidden relative min-h-[140px]">
                      {node.data.src ? (
                        <img
                          src={node.data.src}
                          alt={node.data.title}
                          className="max-h-full max-w-full object-contain rounded-[5px] shadow-sm"
                        />
                      ) : (
                        <div className="text-[#8b87a8] flex flex-col items-center gap-1.5">
                          <User className="w-8 h-8 text-[#c084fc] opacity-60" />
                          <span className="text-[10px] text-[#f4f4f5] font-medium">{node.data.title}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-2.5 border-t border-[#422066] flex items-center justify-between text-xs text-[#f4f4f5] bg-[#0a0c16]">
                      <span className="truncate font-semibold text-xs">{node.data.title || 'Obraz'}</span>
                      {node.data.linked_note_id && onOpenNote && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onOpenNote(node.data.linked_note_id!)
                          }}
                          className="text-[#a855f7] hover:underline flex items-center gap-1 text-[10px] font-medium"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Notatka</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. Shapes (Frame / Rectangle / Ellipse) with Live Text Input */}
                {node.type === 'shape' && (
                  node.data.shapeType === 'frame' ? (
                    <div
                      className="h-full w-full border-2 border-dashed border-[#422066] bg-[#25143a]/25 rounded-[7px] flex flex-col justify-start relative group pointer-events-auto"
                    >
                      <div className="px-3 py-1.5 bg-[#101322]/85 border-b border-[#422066] flex items-center justify-between backdrop-blur-sm rounded-t-[5px]">
                        {editingNodeId === node.id ? (
                          <input
                            type="text"
                            value={node.data.label || node.data.text || ''}
                            onChange={(e) => {
                              const updated = doc.nodes.map((n) =>
                                n.id === node.id ? { ...n, data: { ...n.data, label: e.target.value, text: e.target.value } } : n
                              )
                              setDoc({ ...doc, nodes: updated })
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCommitNodeEdit()
                              e.stopPropagation()
                            }}
                            onBlur={handleCommitNodeEdit}
                            autoFocus
                            className="bg-transparent text-xs font-bold text-[#c084fc] outline-none border-b border-[#a855f7] px-1"
                          />
                        ) : (
                          <div
                            onDoubleClick={() => setEditingNodeId(node.id)}
                            className="flex items-center gap-1.5 cursor-text select-none text-xs font-bold text-[#c084fc]"
                          >
                            <span>{node.data.label || node.data.text || 'Sekcja Architektury'}</span>
                            <Edit2 className="w-3 h-3 text-[#a855f7] opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                        <span className="text-[10px] font-mono text-[#a855f7]/60">RAMKA [Ctrl+G]</span>
                      </div>
                    </div>
                  ) : (
                    <div
                      onDoubleClick={() => setEditingNodeId(node.id)}
                      className={`h-full w-full border border-[#422066] bg-[#101322]/80 flex flex-col items-center justify-center p-4 text-xs backdrop-blur-sm overflow-hidden break-words specular-border ${
                        node.data.shapeType === 'ellipse' ? 'rounded-full' : 'rounded-[7px]'
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
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                              handleCommitNodeEdit()
                            }
                            e.stopPropagation()
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          onBlur={handleCommitNodeEdit}
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
                  )
                )}

                {/* 5. Live Editable Active Recall Flashcard (Excluded from Graph) */}
                {node.type === 'quiz_card' && (
                  <div
                    onKeyDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="h-full w-full p-4 rounded-[7px] bg-[#101322] border border-[#422066] specular-border flex flex-col justify-between shadow-xl text-xs overflow-hidden break-words"
                  >
                    <div>
                      <div className="text-[10px] text-[#c084fc] font-bold uppercase tracking-wider mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5 text-[#a855f7]" />
                          <span>Fiszka SRS (Nie w grafie)</span>
                        </div>
                        <button
                          onClick={() => setEditingNodeId(editingNodeId === node.id ? null : node.id)}
                          className="text-[#8b87a8] hover:text-[#f4f4f5] p-1 rounded-[3px] hover:bg-[#25143a]"
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
                            className="w-full bg-[#15182a] border border-[#422066] rounded-[5px] px-2.5 py-1 text-xs text-[#f4f4f5] focus:outline-none focus:border-[#a855f7]"
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
                            className="w-full bg-[#15182a] border border-[#422066] rounded-[5px] px-2.5 py-1 text-xs text-[#c084fc] font-mono focus:outline-none focus:border-[#c084fc]"
                          />
                          <button
                            onClick={handleCommitNodeEdit}
                            className="w-full py-1 rounded-[5px] bg-[#25143a] hover:bg-[#341b52] border border-[#422066] text-[10px] font-bold text-[#c084fc] transition-colors"
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
                      <div className="pt-2 border-t border-[#422066]">
                        {node.data.is_flipped ? (
                          <div className="flex items-center justify-between">
                            <span className="text-[#c084fc] text-xs font-mono font-semibold break-all">
                              {node.data.answer}
                            </span>
                            <button
                              onClick={() => {
                                const updated = doc.nodes.map((n) =>
                                  n.id === node.id ? { ...n, data: { ...n.data, is_flipped: false } } : n
                                )
                                notifyChange({ ...doc, nodes: updated })
                              }}
                              className="text-[#8b87a8] hover:text-[#f4f4f5] text-[10px] p-0.5 rounded-[3px] hover:bg-[#25143a]"
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
                            className="w-full py-1.5 rounded-[5px] bg-[#15182a] hover:bg-[#25143a] border border-[#422066] text-[11px] text-[#c084fc] font-medium flex items-center justify-center gap-1.5 transition-colors shadow-sm"
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
            color: editingEdge.color || '#a855f7',
            style: editingEdge.style || 'solid',
            bidirectional: editingEdge.bidirectional || false,
            strokeWidth: editingEdge.strokeWidth || 2.5
          }}
          onClose={() => setEditingEdge(null)}
          onConfirm={handleUpdateEdge}
        />
      )}

      {/* Collapsible Bottom "Powiązane Tablice" Section */}
      <div className="absolute bottom-20 left-4 z-30 flex flex-col items-start select-none">
        <button
          onClick={() => setRelatedDrawerOpen(!relatedDrawerOpen)}
          className="px-2.5 py-1 rounded-[7px] bg-[#0a0c16]/90 hover:bg-[#15182a] border border-[#422066] text-[11px] text-[#8b87a8] hover:text-[#f4f4f5] flex items-center gap-1.5 shadow-lg backdrop-blur-md transition-colors"
        >
          <Layers className="w-3.5 h-3.5 text-[#a855f7]" />
          <span>Powiązane tablice</span>
          {relatedDrawerOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
        </button>

        {relatedDrawerOpen && (
          <div className="mt-1.5 p-2 rounded-[7px] bg-[#0a0c16]/95 border border-[#422066] shadow-2xl backdrop-blur-md flex flex-wrap gap-1.5 max-w-xs">
            {doc.edges
              .filter((e) => e.style === 'soft_link')
              .map((edge) => (
                <div
                  key={edge.id}
                  className="px-2 py-0.5 rounded-[3px] bg-[#15182a] border border-[#422066] text-[10px] text-[#c084fc] flex items-center gap-1 font-mono"
                >
                  <Link2 className="w-2.5 h-2.5 text-[#a855f7]" />
                  <span>{edge.label || 'Powiązanie'}</span>
                </div>
              ))}
            {doc.edges.filter((e) => e.style === 'soft_link').length === 0 && (
              <span className="text-[10px] text-[#8b87a8] italic p-1">
                Brak subtelnych linków. Użyj narzędzia [L] lub wpisz @nazwa w tekście!
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
