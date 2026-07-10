'use client';

import React from 'react';
import { TOOL_CATALOG } from '@/lib/tools';
import ToolCard from './ToolCard';

interface ToolCatalogProps {
  hoveredTool: string | null;
  onHoverTool: (name: string | null) => void;
}

export default function ToolCatalog({ hoveredTool, onHoverTool }: ToolCatalogProps) {
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Tool Catalog</h2>
        <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{TOOL_CATALOG.length}</span>
      </div>

      <p className="text-xs text-gray-600 leading-relaxed">
        The catalog is serialized into the system prompt. Each tool&apos;s schema + description consumes context tokens.
      </p>

      <div className="space-y-2">
        {TOOL_CATALOG.map((tool) => (
          <ToolCard
            key={tool.name}
            tool={tool}
            isHovered={hoveredTool === tool.name}
            onHover={() => onHoverTool(tool.name)}
            onLeave={() => onHoverTool(null)}
          />
        ))}
      </div>
    </div>
  );
}
