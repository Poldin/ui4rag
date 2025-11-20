"use client";

import { useEffect, useState } from "react";
import ReactFlow, {
  Node,
  Edge,
  Background,
  useNodesState,
  useEdgesState,
} from "reactflow";
import "reactflow/dist/style.css";
import { Sparkles, Zap, Database, Search, MessageSquare, Cpu } from "lucide-react";

// Custom Node Components
const AgentNode = () => (
  <div className="relative group">
    <div className="relative w-24 h-24 rounded-full bg-gray-900 flex items-center justify-center shadow-xl border-4 border-white">
      <div className="absolute inset-2 rounded-full bg-white/10 backdrop-blur-sm"></div>
      <Sparkles className="w-10 h-10 text-white relative z-10" />
    </div>
    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap">
      <span className="text-sm font-bold text-white bg-gray-900 px-4 py-1.5 rounded-full shadow-lg">
        AI Agent
      </span>
    </div>
  </div>
);

const RagNode = ({ data }: { data: any }) => {
  const Icon = data.icon;
  const isActive = data.isActive;

  return (
    <div
      className={`bg-white border-2 rounded-xl p-4 shadow-xl transition-all duration-500 w-60 ${
        isActive
          ? "border-gray-900 ring-4 ring-gray-200 scale-105"
          : "border-gray-300"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className={`w-11 h-11 rounded-lg flex items-center justify-center ${
            isActive ? "bg-gray-900" : "bg-gray-100"
          }`}
        >
          <Icon
            className={`w-6 h-6 ${isActive ? "text-white" : "text-gray-600"}`}
          />
        </div>
        {isActive && (
          <div className="flex items-center gap-1.5 text-xs text-gray-900 font-bold">
            <div className="w-2 h-2 rounded-full bg-gray-900 animate-pulse"></div>
            ACTIVE
          </div>
        )}
      </div>

      <h4 className="text-sm font-bold text-gray-900 mb-2">{data.label}</h4>

      <div className="flex items-center gap-2">
        <span className="text-xs px-2.5 py-1 bg-gray-900 text-white rounded font-mono font-bold">
          {data.protocol}
        </span>
        <span className="text-xs text-gray-600 font-semibold">Gimme_RAG</span>
      </div>
    </div>
  );
};

const ToolNode = ({ data }: { data: any }) => {
  const Icon = data.icon || Database;
  
  return (
    <div className="bg-white/60 border border-gray-300 rounded-xl p-3 shadow-sm transition-all opacity-40 hover:opacity-60 w-40">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100">
          <Icon className="w-4 h-4 text-gray-500" />
        </div>
      </div>
      <h4 className="text-xs font-semibold text-gray-700">{data.label}</h4>
    </div>
  );
};

const nodeTypes = {
  agent: AgentNode,
  rag: RagNode,
  tool: ToolNode,
};

export default function AgentRagDiagram() {
  const [activeRag, setActiveRag] = useState(0);

  const initialNodes: Node[] = [
    // Agent al centro
    {
      id: "agent",
      type: "agent",
      position: { x: 400, y: 250 },
      data: { label: "AI Agent" },
      draggable: false,
    },
    // RAG nodes in cerchio (posizioni superiori e laterali)
    {
      id: "rag1",
      type: "rag",
      position: { x: 50, y: 250 },
      data: {
        label: "User Docs RAG",
        protocol: "MCP",
        icon: Database,
        isActive: false,
      },
      draggable: false,
    },
    {
      id: "rag2",
      type: "rag",
      position: { x: 320, y: 50 },
      data: {
        label: "Product KB RAG",
        protocol: "API",
        icon: Search,
        isActive: false,
      },
      draggable: false,
    },
    {
      id: "rag3",
      type: "rag",
      position: { x: 670, y: 250 },
      data: {
        label: "Support RAG",
        protocol: "MCP",
        icon: MessageSquare,
        isActive: false,
      },
      draggable: false,
    },
    // Tool nodes in cerchio (posizioni inferiori)
    {
      id: "tool1",
      type: "tool",
      position: { x: 120, y: 450 },
      data: { label: "Database", icon: Database },
      draggable: false,
    },
    {
      id: "tool2",
      type: "tool",
      position: { x: 280, y: 450 },
      data: { label: "APIs", icon: Zap },
      draggable: false,
    },
    {
      id: "tool3",
      type: "tool",
      position: { x: 440, y: 450 },
      data: { label: "Files", icon: Database },
      draggable: false,
    },
    {
      id: "tool4",
      type: "tool",
      position: { x: 600, y: 450 },
      data: { label: "Web Search", icon: Search },
      draggable: false,
    },
  ];

  const initialEdges: Edge[] = [
    // Agent to RAGs (primary connections)
    {
      id: "e-agent-rag1",
      source: "agent",
      target: "rag1",
      type: "smoothstep",
      animated: false,
      style: { stroke: "#374151", strokeWidth: 4, strokeDasharray: "12,8" },
    },
    {
      id: "e-agent-rag2",
      source: "agent",
      target: "rag2",
      type: "smoothstep",
      animated: false,
      style: { stroke: "#374151", strokeWidth: 4, strokeDasharray: "12,8" },
    },
    {
      id: "e-agent-rag3",
      source: "agent",
      target: "rag3",
      type: "smoothstep",
      animated: false,
      style: { stroke: "#374151", strokeWidth: 4, strokeDasharray: "12,8" },
    },
    // Agent to Tools (secondary connections)
    {
      id: "e-agent-tool1",
      source: "agent",
      target: "tool1",
      type: "smoothstep",
      animated: false,
      style: { stroke: "#9ca3af", strokeWidth: 2.5, strokeDasharray: "8,6" },
    },
    {
      id: "e-agent-tool2",
      source: "agent",
      target: "tool2",
      type: "smoothstep",
      animated: false,
      style: { stroke: "#9ca3af", strokeWidth: 2.5, strokeDasharray: "8,6" },
    },
    {
      id: "e-agent-tool3",
      source: "agent",
      target: "tool3",
      type: "smoothstep",
      animated: false,
      style: { stroke: "#9ca3af", strokeWidth: 2.5, strokeDasharray: "8,6" },
    },
    {
      id: "e-agent-tool4",
      source: "agent",
      target: "tool4",
      type: "smoothstep",
      animated: false,
      style: { stroke: "#9ca3af", strokeWidth: 2.5, strokeDasharray: "8,6" },
    },
  ];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveRag((prev) => (prev + 1) % 3);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Update RAG nodes
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === "rag1") {
          return {
            ...node,
            data: { ...node.data, isActive: activeRag === 0 },
          };
        }
        if (node.id === "rag2") {
          return {
            ...node,
            data: { ...node.data, isActive: activeRag === 1 },
          };
        }
        if (node.id === "rag3") {
          return {
            ...node,
            data: { ...node.data, isActive: activeRag === 2 },
          };
        }
        return node;
      })
    );

    // Update edges
    setEdges((eds) =>
      eds.map((edge) => {
        // Check if this is an active RAG connection
        const isActiveRag =
          (edge.id === "e-agent-rag1" && activeRag === 0) ||
          (edge.id === "e-agent-rag2" && activeRag === 1) ||
          (edge.id === "e-agent-rag3" && activeRag === 2);

        // RAG connections
        if (edge.id.includes("rag")) {
          return {
            ...edge,
            animated: isActiveRag,
            style: {
              stroke: isActiveRag ? "#000000" : "#374151",
              strokeWidth: isActiveRag ? 6 : 4,
              strokeDasharray: "12,8",
            },
          };
        }

        // Tool connections (always visible but secondary)
        return {
          ...edge,
          animated: false,
          style: {
            stroke: "#9ca3af",
            strokeWidth: 2.5,
            strokeDasharray: "8,6",
          },
        };
      })
    );
  }, [activeRag, setNodes, setEdges]);

  return (
    <div className="relative max-w-5xl mx-auto">
      {/* Desktop Version */}
      <div className="hidden md:block">
        <div style={{ height: "580px" }} className="overflow-hidden bg-white rounded-2xl">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            proOptions={{ hideAttribution: true }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            zoomOnScroll={false}
            panOnDrag={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
          >
            <Background color="#d1d5db" gap={20} size={1} />
          </ReactFlow>
        </div>

        {/* Info Badges Outside */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-md">
            <div className="w-2 h-2 rounded-full bg-gray-900"></div>
            <span className="text-sm font-semibold text-gray-900">Reliable Results</span>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg shadow-md">
            <Cpu className="w-4 h-4" />
            <span className="text-sm font-semibold">MCP + API Ready</span>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-md">
            <Zap className="w-4 h-4 text-gray-900" />
            <span className="text-sm font-semibold text-gray-900">Fast Responses</span>
          </div>
        </div>
      </div>

      {/* Mobile Version */}
      <div className="md:hidden" style={{ minHeight: '500px' }}>
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4" style={{ minHeight: '500px' }}>
          {/* Agent Node */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative w-20 h-20 rounded-full bg-gray-900 flex items-center justify-center shadow-xl border-4 border-white mb-3">
              <div className="absolute inset-2 rounded-full bg-white/10 backdrop-blur-sm"></div>
              <Sparkles className="w-8 h-8 text-white relative z-10" />
            </div>
            <span className="text-sm font-bold text-gray-900">AI Agent</span>
          </div>

          {/* RAG Nodes */}
          <div className="space-y-3">
            {[
              { id: "rag1", label: "User Docs RAG", protocol: "MCP", icon: Database, isActive: activeRag === 0 },
              { id: "rag2", label: "Product KB RAG", protocol: "API", icon: Search, isActive: activeRag === 1 },
              { id: "rag3", label: "Support RAG", protocol: "MCP", icon: MessageSquare, isActive: activeRag === 2 },
            ].map((rag, idx) => {
              const RagIcon = rag.icon;
              return (
                <div
                  key={rag.id}
                  className={`bg-white border-2 rounded-lg p-3 transition-all ${
                    rag.isActive
                      ? "border-gray-900 ring-2 ring-gray-200 shadow-md"
                      : "border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      rag.isActive ? "bg-gray-900" : "bg-gray-100"
                    }`}>
                      <RagIcon className={`w-4 h-4 ${rag.isActive ? "text-white" : "text-gray-600"}`} />
                    </div>
                    {rag.isActive && (
                      <div className="flex items-center gap-1 text-xs text-gray-900 font-bold">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-900 animate-pulse"></div>
                        ACTIVE
                      </div>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-gray-900 mb-1.5">{rag.label}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 bg-gray-900 text-white rounded font-mono font-bold">
                      {rag.protocol}
                    </span>
                    <span className="text-[10px] text-gray-600 font-semibold">Gimme_RAG</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Connection Indicator */}
          <div className="flex items-center justify-center gap-2 pt-2 border-t border-gray-200">
            <div className="flex-1 h-0.5 bg-gray-300"></div>
            <div className="w-2 h-2 rounded-full bg-gray-900 animate-pulse"></div>
            <div className="flex-1 h-0.5 bg-gray-300"></div>
          </div>

          {/* Info Badges */}
          <div className="flex flex-col gap-2 pt-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg shadow-sm justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-900"></div>
              <span className="text-xs font-semibold text-gray-900">Reliable Results</span>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white rounded-lg shadow-sm justify-center">
              <Cpu className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">MCP + API Ready</span>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg shadow-sm justify-center">
              <Zap className="w-3.5 h-3.5 text-gray-900" />
              <span className="text-xs font-semibold text-gray-900">Fast Responses</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

