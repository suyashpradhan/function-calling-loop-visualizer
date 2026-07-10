'use client';

import React, { useState } from 'react';
import type { ToolDefinition } from '@/lib/tools';

const CATEGORY_STYLES: Record<string, { badge: string; dot: string }> = {
  read: { badge: 'text-green-400 bg-green-950 border-green-800', dot: 'bg-green-500' },
  write: { badge: 'text-amber-400 bg-amber-950 border-amber-800', dot: 'bg-amber-500' },
  destructive: { badge: 'text-red-400 bg-red-950 border-red-800', dot: 'bg-red-500' },
};

const TOOL_ICONS: Record<string, string> = {
  get_weather: '🌤',
  search_flights: '✈',
  convert_currency: '💱',
  get_time: '🕐',
  calculate: '🔢',
};

interface ToolCardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tool: ToolDefinition<any, any>;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
}

export default function ToolCard({ tool, isHovered, onHover, onLeave }: ToolCardProps) {
  const [expanded, setExpanded] = useState(false);
  const styles = CATEGORY_STYLES[tool.category];

  return (
    <div
      className={`rounded-lg border transition-colors cursor-pointer ${
        isHovered ? 'border-indigo-600 bg-indigo-950/30' : 'border-gray-800 bg-gray-900/50 hover:border-gray-700'
      }`}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-3"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{TOOL_ICONS[tool.name] ?? '🔧'}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-mono font-medium text-gray-200">{tool.name}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${styles.badge}`}>
                {tool.category}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{tool.description}</p>
          </div>
          <span className="text-gray-600 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-gray-800">
          <p className="text-xs text-gray-400 mt-2">JSON Schema:</p>
          <pre className="bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-gray-400 font-mono overflow-x-auto max-h-48">
            {JSON.stringify(tool.schema, null, 2)}
          </pre>
          <p className="text-xs text-gray-600">
            Implementation: <span className="font-mono text-gray-500">(args) =&gt; Promise&lt;result&gt;</span>
            {' '}— runs client-side, never on a server.
          </p>
        </div>
      )}
    </div>
  );
}
