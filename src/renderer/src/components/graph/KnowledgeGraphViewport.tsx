import React, { useRef, useEffect, useState } from 'react'
import { IpcChannel } from '../../../../shared/ipc/channels'
import { GraphEdgeRecord } from '../../../../shared/types/database'
import { ZoomIn, ZoomOut, RefreshCw, Maximize2 } from 'lucide-react'

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
            radius: n.type === 'visual_entity' ? 20 : n.type === 'canvas' ? 16 : 14,
            color: n.type === 'visual_entity' ? '#584C6B' : n.type === 'canvas' ? '#8C6D37' : '#4A6B8A'
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

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let startTime = performance.now()

    const loop = (timestamp: number) => {
      const currentNodes = nodesRef.current

      // Physics forces
      const kRep = 600
      const kSpring = 0.004
      const restLength = 110
      const damping = 0.9

      for (let i = 0; i < currentNodes.length; i++) {
        const n1 = currentNodes[i]
        const cx = canvas.width / 2
        const cy = canvas.height / 2
        n1.vx += (cx - n1.x) * 0.0004
        n1.vy += (cy - n1.y) * 0.0004

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
        ctx.strokeStyle = '#22242b'
        ctx.lineWidth = 1.5
        ctx.stroke()
      }

      // Draw Nodes
      for (const n of currentNodes) {
        if (filterType && n.type !== filterType) {
          ctx.globalAlpha = 0.2
        } else {
          ctx.globalAlpha = 1.0
        }

        ctx.beginPath()
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2)
        ctx.fillStyle = n.color
        ctx.fill()
        ctx.strokeStyle = '#141519'
        ctx.lineWidth = 2
        ctx.stroke()

        if (zoom >= 0.5) {
          ctx.fillStyle = '#D8DAE0'
          ctx.font = '10px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText(n.title, n.x, n.y + n.radius + 12)
        }
      }

      ctx.restore()
      animFrameRef.current = requestAnimationFrame(loop)
    }

    animFrameRef.current = requestAnimationFrame(loop)
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [edges, zoom, pan, filterType])

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
    setZoom((z) => Math.max(0.2, Math.min(2.5, z * factor)))
  }

  return (
    <div className="h-full w-full bg-[#0B0C0E] relative overflow-hidden select-none">
      <div className="absolute top-4 left-4 z-30 flex items-center gap-1.5 p-1 rounded-lg bg-[#141519]/90 border border-[#22242b] text-xs">
        <button
          onClick={loadGraph}
          className="p-1 rounded text-[#727683] hover:text-[#D8DAE0] hover:bg-[#1b1c22]"
          title="Odśwież"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-3 bg-[#22242b] mx-0.5" />
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
