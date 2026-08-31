import React, { useRef, useEffect, useState } from 'react'
import { IpcChannel } from '../../../../shared/ipc/channels'
import { GraphEdgeRecord } from '../../../../shared/types/database'
import { ZoomIn, ZoomOut, RefreshCw, Maximize2, Link2, Check, Sparkles } from 'lucide-react'

interface GraphNodeSim {
  id: string
  title: string
  type: 'note' | 'visual_entity' | 'canvas'
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  color: string
}

interface Props {
  sessionCreatedNodeIds: string[]
  sessionCreatedEdgeIds: string[]
  onNodeClick?: (nodeId: string, type: string) => void
  onActivity: () => void
}

export const KnowledgeGraphViewport: React.FC<Props> = ({
  sessionCreatedNodeIds,
  sessionCreatedEdgeIds,
  onNodeClick,
  onActivity
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [nodes, setNodes] = useState<GraphNodeSim[]>([])
  const [edges, setEdges] = useState<GraphEdgeRecord[]>([])
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])
  const [zoom, setZoom] = useState(1.0)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [filterType, setFilterType] = useState<string | null>(null)
  const [justLinked, setJustLinked] = useState(false)
  const animFrameRef = useRef<number | null>(null)
  const nodesRef = useRef<GraphNodeSim[]>([])

  const loadGraph = async () => {
    try {
      const res = await window.electronAPI.invoke(IpcChannel.DB_GET_GRAPH_DATA, {})
      if (res.nodes) {
        const width = window.innerWidth
        const height = window.innerHeight

        const simNodes: GraphNodeSim[] = res.nodes.map((n: any, idx: number) => {
          const angle = (idx / res.nodes.length) * Math.PI * 2
          const dist = 140 + Math.random() * 100
          return {
            id: n.id,
            title: n.title,
            type: n.type,
            x: width / 2 + Math.cos(angle) * dist,
            y: height / 2 + Math.sin(angle) * dist,
            vx: (Math.random() - 0.5) * 1.5,
            vy: (Math.random() - 0.5) * 1.5,
            radius: n.type === 'visual_entity' ? 22 : n.type === 'canvas' ? 18 : 15,
            color: n.type === 'visual_entity' ? '#c084fc' : n.type === 'canvas' ? '#38bdf8' : '#10b981'
          }
        })
        setNodes(simNodes)
        nodesRef.current = simNodes
        setEdges(res.edges || [])
      }
    } catch (err) {
      console.error('Failed to load graph:', err)
    }
  }

  useEffect(() => {
    loadGraph()
  }, [])

  // Multi-Connect Selected Nodes
  const handleConnectSelected = async () => {
    if (selectedNodeIds.length < 2) return
    const newEdges: GraphEdgeRecord[] = []

    for (let i = 0; i < selectedNodeIds.length - 1; i++) {
      for (let j = i + 1; j < selectedNodeIds.length; j++) {
        const sourceNode = nodesRef.current.find((n) => n.id === selectedNodeIds[i])
        const targetNode = nodesRef.current.find((n) => n.id === selectedNodeIds[j])
        const edge: GraphEdgeRecord = {
          edge_id: `edge_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          source_id: selectedNodeIds[i],
          source_type: (sourceNode?.type as any) || 'canvas',
          target_id: selectedNodeIds[j],
          target_type: (targetNode?.type as any) || 'canvas',
          relation_label: 'POWIĄZANIE',
          origin_context: 'manual_tag',
          origin_canvas_id: null,
          created_at: Date.now()
        }
        newEdges.push(edge)
      }
    }

    setEdges((prev) => [...prev, ...newEdges])
    setJustLinked(true)
    setTimeout(() => setJustLinked(false), 2000)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const loop = () => {
      const currentNodes = nodesRef.current

      // Physics forces
      const kRep = 700
      const kSpring = 0.005
      const restLength = 120
      const damping = 0.9

      for (let i = 0; i < currentNodes.length; i++) {
        const n1 = currentNodes[i]
        const cx = canvas.width / 2
        const cy = canvas.height / 2
        n1.vx += (cx - n1.x) * 0.0003
        n1.vy += (cy - n1.y) * 0.0003

        for (let j = i + 1; j < currentNodes.length; j++) {
          const n2 = currentNodes[j]
          const dx = n2.x - n1.x
          const dy = n2.y - n1.y
          const distSq = dx * dx + dy * dy + 80
          const dist = Math.sqrt(distSq)
          const force = kRep / distSq

          n1.vx -= (dx / dist) * force
          n1.vy -= (dy / dist) * force
          n2.vx += (dx / dist) * force
          n2.vy += (dy / dist) * force
        }
      }

      for (const edge of edges) {
        const source = currentNodes.find((n) => n.id === edge.source_id)
        const target = currentNodes.find((n) => n.id === edge.target_id)
        if (source && target) {
          const dx = target.x - source.x
          const dy = target.y - source.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const force = (dist - restLength) * kSpring

          source.vx += (dx / dist) * force
          source.vy += (dy / dist) * force
          target.vx -= (dx / dist) * force
          target.vy -= (dy / dist) * force
        }
      }

      for (const n of currentNodes) {
        n.x += n.vx
        n.y += n.vy
        n.vx *= damping
        n.vy *= damping
      }

      // Render Frame
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.save()
      ctx.translate(pan.x, pan.y)
      ctx.scale(zoom, zoom)

      // Draw Edges
      for (const edge of edges) {
        const source = currentNodes.find((n) => n.id === edge.source_id)
        const target = currentNodes.find((n) => n.id === edge.target_id)
        if (!source || !target) continue

        ctx.beginPath()
        ctx.moveTo(source.x, source.y)
        ctx.lineTo(target.x, target.y)
        ctx.strokeStyle = '#27272a'
        ctx.lineWidth = 2
        ctx.stroke()
      }

      // Draw Nodes
      for (const n of currentNodes) {
        const isSelected = selectedNodeIds.includes(n.id)

        if (filterType && n.type !== filterType) {
          ctx.globalAlpha = 0.2
        } else {
          ctx.globalAlpha = 1.0
        }

        // Selection Glow Ring
        if (isSelected) {
          ctx.beginPath()
          ctx.arc(n.x, n.y, n.radius + 6, 0, Math.PI * 2)
          ctx.strokeStyle = '#38bdf8'
          ctx.lineWidth = 3
          ctx.stroke()
        }

        ctx.beginPath()
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2)
        ctx.fillStyle = n.color
        ctx.fill()
        ctx.strokeStyle = '#18181b'
        ctx.lineWidth = 2.5
        ctx.stroke()

        if (zoom >= 0.4) {
          ctx.fillStyle = isSelected ? '#38bdf8' : '#f4f4f5'
          ctx.font = 'bold 11px Inter, sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText(n.title, n.x, n.y + n.radius + 14)
        }
      }

      ctx.restore()
      animFrameRef.current = requestAnimationFrame(loop)
    }

    animFrameRef.current = requestAnimationFrame(loop)
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [edges, zoom, pan, filterType, selectedNodeIds])

  const handleCanvasClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const mouseX = (e.clientX - rect.left - pan.x) / zoom
    const mouseY = (e.clientY - rect.top - pan.y) / zoom

    // Find clicked node
    const clickedNode = nodesRef.current.find((n) => {
      const dx = n.x - mouseX
      const dy = n.y - mouseY
      return Math.sqrt(dx * dx + dy * dy) <= n.radius + 6
    })

    if (clickedNode) {
      if (e.shiftKey) {
        // Multi-select with Shift
        setSelectedNodeIds((prev) =>
          prev.includes(clickedNode.id) ? prev.filter((id) => id !== clickedNode.id) : [...prev, clickedNode.id]
        )
      } else {
        setSelectedNodeIds([clickedNode.id])
        if (onNodeClick) onNodeClick(clickedNode.id, clickedNode.type)
      }
    } else {
      if (!e.shiftKey) {
        setSelectedNodeIds([])
      }
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    onActivity()
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
      onActivity()
    }
  }

  const handleMouseUp = () => setIsDragging(false)

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    onActivity()
    const factor = e.deltaY < 0 ? 1.08 : 0.92
    setZoom((z) => Math.max(0.15, Math.min(3.0, z * factor)))
  }

  return (
    <div className="h-full w-full bg-[#09090b] relative overflow-hidden select-none">
      {/* Top Left Navigation Bar */}
      <div className="absolute top-4 left-4 z-30 flex items-center gap-1.5 p-1 rounded-xl bg-[#18181b]/90 border border-[#27272a] shadow-xl text-xs backdrop-blur-md">
        <button
          onClick={loadGraph}
          className="p-1 rounded-lg text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#27272a]"
          title="Odśwież graf"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-3 bg-[#27272a] mx-0.5" />
        <button
          onClick={() => setZoom((z) => Math.min(3.0, z + 0.15))}
          className="p-1 rounded-lg text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#27272a]"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <span className="font-mono text-[11px] text-[#a1a1aa] w-9 text-center">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom((z) => Math.max(0.15, z - 0.15))}
          className="p-1 rounded-lg text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#27272a]"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Floating Multi-Select & Link Bar */}
      {selectedNodeIds.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#18181b]/95 border border-[#38bdf8]/50 shadow-2xl text-xs backdrop-blur-md">
          <span className="font-semibold text-[#f4f4f5]">Zaznaczono {selectedNodeIds.length} węzłów</span>
          <button
            onClick={handleConnectSelected}
            className="px-3 py-1 rounded-lg bg-gradient-to-r from-[#38bdf8] to-[#10b981] text-black font-bold text-xs flex items-center gap-1.5 shadow-md hover:opacity-90 transition-opacity"
          >
            {justLinked ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
            <span>{justLinked ? 'Połączono!' : 'Połącz zaznaczone'}</span>
          </button>
        </div>
      )}

      {/* Instruction Tip */}
      <div className="absolute bottom-4 left-4 z-20 text-[10px] text-[#71717a] bg-[#18181b]/80 px-2 py-1 rounded-lg border border-[#27272a]">
        Wskazówka: Przytrzymaj <kbd className="font-mono bg-[#27272a] px-1 py-0.2 rounded text-[#f4f4f5]">Shift</kbd> i klikaj kulki, aby zaznaczyć kilka i połączyć je relacją.
      </div>

      <canvas
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />
    </div>
  )
}
