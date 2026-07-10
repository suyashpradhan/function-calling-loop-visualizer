'use client';

import React from 'react';
import { TOOL_CATALOG } from '@/lib/tools';

interface SchemaInspectorProps {
  hoveredTool: string | null;
  catalogTokenCount: number;
  messageTokenCount: number;
}

const BUDGET_LIMIT = 2000;

export default function SchemaInspector({ hoveredTool, catalogTokenCount, messageTokenCount }: SchemaInspectorProps) {
  const tool = TOOL_CATALOG.find((t) => t.name === hoveredTool);
  const catalogPct = Math.min((catalogTokenCount / BUDGET_LIMIT) * 100, 100);

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Schema Inspector</h2>

      {/* Token budget gauges */}
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Catalog tokens</span>
            <span className={catalogTokenCount > BUDGET_LIMIT ? 'text-red-400 font-medium' : 'text-gray-400'}>
              {catalogTokenCount.toLocaleString()} / {BUDGET_LIMIT.toLocaleString()}
            </span>
          </div>
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${catalogPct > 80 ? 'bg-red-500' : catalogPct > 50 ? 'bg-amber-500' : 'bg-green-500'}`}
              style={{ width: `${catalogPct}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-1">cl100k_base (js-tiktoken)</p>
        </div>

        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Message tokens</span>
            <span className="text-gray-400">{messageTokenCount.toLocaleString()}</span>
          </div>
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{ width: `${Math.min((messageTokenCount / 4096) * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-1">approx. vs 4K context window</p>
        </div>
      </div>

      {/* Schema display */}
      <div className="border-t border-gray-800 pt-4">
        {tool ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-300">{tool.name}</p>
            <p className="text-xs text-gray-500">{tool.description}</p>
            <pre className="bg-gray-950 border border-gray-800 rounded-lg p-3 text-xs text-gray-400 font-mono overflow-x-auto max-h-64">
              {JSON.stringify(tool.schema, null, 2)}
            </pre>
          </div>
        ) : (
          <p className="text-xs text-gray-600 italic">Hover a tool in the catalog to inspect its schema here.</p>
        )}
      </div>

      {/* Educational notes */}
      <div className="border-t border-gray-800 pt-4 space-y-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Context budget note</h3>
        <p className="text-xs text-gray-600 leading-relaxed">
          Every tool schema + description is serialized into the system prompt, consuming tokens before any user message is sent. Larger catalogs = less budget for conversation.
        </p>
        <p className="text-xs text-gray-600 leading-relaxed">
          In production: prune rarely-used tools, use tool descriptions to guide selection, and consider dynamic catalog injection.
        </p>
      </div>
    </div>
  );
}
