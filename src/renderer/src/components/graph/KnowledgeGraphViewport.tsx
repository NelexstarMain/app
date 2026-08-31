import React, { useRef, useEffect, useState } from 'react'
import { IpcChannel } from '../../../../shared/ipc/channels'
import { GraphEdgeRecord } from '../../../../shared/types/database'
import { ZoomIn, ZoomOut, RefreshCw, Filter, Sparkles } from 'lucide-react'

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
  const [zoom, setZoom] = useState(1.0)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [filterType, setFilterType] = useState<string | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const nodesRef = useRef<GraphNodeSim[]>([])

  // Load Graph Data from DB
  const loadGraph = async () => {
    try {
      const res = await window.electronAPI.invoke(IpcChannel.DB_GET_GRAPH_DATA, {})
      if (res.nodes) {
        const width = window.innerWidth
        const height = window.innerHeight

        const simNodes: GraphNodeSim[] = res.nodes.map((n: any, idx: number) => {
          const angle = (idx / res.nodes.length) * Math.PI * 2
          const dist = 150 + Math.random() * 120
          return {
            id: n.id,
            title: n.title,
            type: n.type,
            x: width / 2 + Math.cos(angle) * dist,
            y: height / 2 + Math.sin(angle) * dist,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            radius: n.type === 'visual_entity' ? 24 : n.type === 'canvas' ? 20 : 16,
            color: n.type === 'visual_entity' ? '#8B5CF6' : n.type === 'canvas' ? '#EC4899' : '#3B82F6'
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

  // Physics Simulation Loop & Canvas Rendering
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let startTime = performance.now()

    const loop = (timestamp: number) => {
      const elapsedSec = (timestamp - startTime) / 1000
      const currentNodes = nodesRef.current

      // 1. Force Simulation Step (Coulomb repulsion & Spring attraction)
      const kRep = 800
      const kSpring = 0.005
      const restLength = 120
      const damping = 0.92

      for (let i = 0; i < currentNodes.length; i++) {
        const n1 = currentNodes[i]

        // Center gravity
        const cx = canvas.width / 2
        const cy = canvas.height / 2
        n1.vx += (cx - n1.x) * 0.0005
        n1.vy += (cy - n1.y) * 0.0005

        // Repulsion between all node pairs
        for (let j = i + 1; j < currentNodes.length; j++) {
          const n2 = currentNodes[j]
          const dx = n2.x - n1.x
          const dy = n2.y - n1.y
          const distSq = dx * dx + dy * dy + 100
          const dist = Math.sqrt(distSq)
          const force = kRep / distSq

          const fx = (dx / dist) * force
          const fy = (dy / dist) * force

          n1.vx -= fx
          n1.vy -= fy
          n2.vx += fx
          n2.vy += fy
        }
      }

      // Spring attraction along edges
      for (const edge of edges) {
        const source = currentNodes.find((n) => n.id === edge.source_id)
        const target = currentNodes.find((n) => n.id === edge.target_id)
        if (source && target) {
          const dx = target.x - source.x
          const dy = target.y - source.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const force = (dist - restLength) * kSpring

          const fx = (dx / dist) * force
          const fy = (dy / dist) * force

          source.vx += fx
          source.vy += fy
          target.vx -= fx
          target.vy -= fy
        }
      }

      // Apply velocity with damping
      for (const n of currentNodes) {
        n.x += n.vx
        n.y += n.vy
        n.vx *= damping
        n.vy *= damping
      }

      // 2. Render Frame
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.save()
      ctx.translate(pan.x, pan.y)
      ctx.scale(zoom, zoom)

      // Draw Edges
      for (const edge of edges) {
        const source = currentNodes.find((n) => n.id === edge.source_id)
        const target = currentNodes.find((n) => n.id === edge.target_id)
        if (!source || !target) continue

        const isNewEdge = sessionCreatedEdgeIds.includes(edge.edge_id)

        ctx.beginPath()
        ctx.moveTo(source.x, source.y)
        ctx.lineTo(target.x, target.y)
        ctx.strokeStyle = isNewEdge ? '#38BDF8' : '#334155'
        ctx.lineWidth = isNewEdge ? 2.5 : 1.5
        ctx.stroke()

        // Flowing Photon Particle for new edges (40 px/s)
        if (isNewEdge) {
          const speed = 40
          const dist = Math.hypot(target.x - source.x, target.y - source.y) || 1
          const travel = ((elapsedSec * speed) % dist) / dist
          const px = source.x + (target.x - source.x) * travel
          const py = source.y + (target.y - source.y) * travel

          ctx.save()
          ctx.beginPath()
          ctx.arc(px, py, 4, 0, Math.PI * 2)
          ctx.fillStyle = '#38BDF8'
          ctx.shadowColor = '#38BDF8'
          ctx.shadowBlur = 10
          ctx.fill()
          ctx.restore()
        }

        // Edge label if zoom >= 0.8
        if (zoom >= 0.8 && edge.relation_label) {
          ctx.fillStyle = '#64748B'
          ctx.font = '10px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText(edge.relation_label, (source.x + target.x) / 2, (source.y + target.y) / 2 - 4)
        }
      }

      // Draw Nodes with Session Glow Shaders & LOD
      for (const n of currentNodes) {
        if (filterType && n.type !== filterType) {
          ctx.globalAlpha = 0.15
        } else {
          ctx.globalAlpha = 1.0
        }

        const isNew = sessionCreatedNodeIds.includes(n.id)

        // Pulsing Neon Emerald Glow (1.2 Hz)
        if (isNew) {
          const pulse = Math.sin(elapsedSec * 2 * Math.PI * 1.2) * 0.5 + 0.5
          ctx.save()
          ctx.beginPath()
          ctx.arc(n.x, n.y, n.radius + 6 + pulse * 6, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(16, 185, 129, ${0.15 + pulse * 0.25})`
          ctx.shadowColor = '#10B981'
          ctx.shadowBlur = 14 + pulse * 8
          ctx.fill()
          ctx.restore()
        }

        // Node Body
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2)
        ctx.fillStyle = isNew ? '#10B981' : n.color
        ctx.fill()
        ctx.strokeStyle = isNew ? '#34D399' : '#1E293B'
        ctx.lineWidth = 2.5
        ctx.stroke()

        // LOD 2 & 3 Text Labels
        if (zoom >= 0.45) {
          ctx.fillStyle = '#F8FAFC'
          ctx.font = `600 ${zoom >= 1.0 ? '12px' : '10px'} sans-serif`
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
  }, [edges, zoom, pan, filterType, sessionCreatedNodeIds, sessionCreatedEdgeIds])

  // Mouse pan & zoom handlers
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

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    onActivity()
    const factor = e.deltaY < 0 ? 1.1 : 0.9
    setZoom((z) => Math.max(0.2, Math.min(2.5, z * factor)))
  }

  return (
    <div className="h-full w-full bg-[#070A12] relative overflow-hidden select-none">
      {/* Controls Overlay */}
      <div className="absolute top-4 left-4 z-30 flex items-center gap-2 frosted-glass p-2 rounded-xl border border-synapse-border/60">
        <button
          onClick={loadGraph}
          className="p-1.5 rounded-lg hover:bg-synapse-surface text-synapse-muted hover:text-white"
          title="Refresh Graph Layout"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-synapse-border/60 mx-1" />

        <button
          onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
          className="p-1.5 rounded-lg hover:bg-synapse-surface text-synapse-muted hover:text-white"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <span className="text-xs font-mono text-synapse-muted w-10 text-center">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom((z) => Math.max(0.2, z - 0.15))}
          className="p-1.5 rounded-lg hover:bg-synapse-surface text-synapse-muted hover:text-white"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-synapse-border/60 mx-1" />

        {/* Filter Pills */}
        <div className="flex items-center gap-1 text-[11px]">
          <button
            onClick={() => setFilterType(null)}
            className={`px-2 py-1 rounded-lg transition-colors ${!filterType ? 'bg-synapse-surface text-white font-semibold' : 'text-synapse-muted hover:text-white'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilterType('visual_entity')}
            className={`px-2 py-1 rounded-lg transition-colors ${filterType === 'visual_entity' ? 'bg-purple-500/20 text-purple-300 font-semibold' : 'text-synapse-muted hover:text-white'}`}
          >
            Entities
          </button>
          <button
            onClick={() => setFilterType('note')}
            className={`px-2 py-1 rounded-lg transition-colors ${filterType === 'note' ? 'bg-sky-500/20 text-sky-300 font-semibold' : 'text-synapse-muted hover:text-white'}`}
          >
            Notes
          </button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />
    </div>
  )
}
