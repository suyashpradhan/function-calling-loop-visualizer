'use client';

import React, { useState } from 'react';
import type { ToolResultMessage } from '@/lib/loop';
import type { Provider } from '@/lib/providerFormats';

interface ToolResultCardProps {
  message: ToolResultMessage;
  provider: Provider;
}

function providerResultLabel(provider: Provider, name: string): string {
  switch (provider) {
    case 'openai': return `role: "tool", tool_call_id: "…", name: "${name}"`;
    case 'anthropic': return `role: "user", type: "tool_result", tool_use_id: "…"`;
    case 'gemini': return `role: "user", functionResponse.name: "${name}"`;
  }
}

export default function ToolResultCard({ message, provider }: ToolResultCardProps) {
  const [expanded, setExpanded] = useState(true);

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(message.content);
  } catch {
    parsed = message.content;
  }

  const isError = message.isError;

  return (
    <div className={`rounded-xl border p-4 ${
      isError ? 'border-red-800 bg-red-950/30' : 'border-green-800 bg-green-950/20'
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-5 h-5 rounded flex items-center justify-center text-white text-xs ${
          isError ? 'bg-red-700' : 'bg-green-700'
        }`}>
          {isError ? '✗' : '✓'}
        </div>
        <span className={`text-xs font-medium uppercase tracking-wide ${
          isError ? 'text-red-400' : 'text-green-400'
        }`}>
          Tool Result — {message.name}
        </span>
        <button
          onClick={() => setExpanded(!expanded)}
          className="ml-auto text-xs text-gray-500 hover:text-gray-300"
        >
          {expanded ? 'collapse' : 'expand'}
        </button>
      </div>

      <p className="text-xs text-gray-500 font-mono mb-2">{providerResultLabel(provider, message.name)}</p>

      {expanded && (
        <pre className={`rounded-lg p-3 text-xs font-mono overflow-x-auto border ${
          isError
            ? 'bg-red-950 border-red-900 text-red-300'
            : 'bg-gray-950 border-gray-800 text-gray-300'
        }`}>
          {typeof parsed === 'object' ? JSON.stringify(parsed, null, 2) : String(parsed)}
        </pre>
      )}

      <p className="text-xs text-gray-600 mt-2 italic">
        Result appended to context — model sees this on the next round.
      </p>
    </div>
  );
}
