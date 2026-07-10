'use client';

import React, { useState } from 'react';
import type { ExecutionMode } from '@/lib/mockModel';

interface Preset {
  label: string;
  query: string;
  description: string;
}

const PRESETS: Preset[] = [
  {
    label: 'Single tool',
    query: "What's the weather in Bengaluru?",
    description: 'One tool call → one result → synthesis',
  },
  {
    label: 'Sequential multi-tool',
    query: 'Book me a flight from Bengaluru to Delhi tomorrow — what\'s the weather there?',
    description: 'Flight + weather, one at a time',
  },
  {
    label: 'Parallel tools',
    query: 'Weather in Bengaluru AND Delhi',
    description: 'Two independent calls in one round',
  },
  {
    label: 'Currency',
    query: 'Convert 5000 INR to USD',
    description: 'Numeric args + currency extraction',
  },
  {
    label: 'No tool',
    query: "What's the meaning of life?",
    description: 'Direct assistant response, no tool calls',
  },
];

interface QueryBarProps {
  onSubmit: (query: string) => void;
  onReset: () => void;
  mode: ExecutionMode;
  onModeChange: (mode: ExecutionMode) => void;
  autorun: boolean;
  onAutorunChange: (v: boolean) => void;
  disabled: boolean;
}

export default function QueryBar({
  onSubmit,
  onReset,
  mode,
  onModeChange,
  autorun,
  onAutorunChange,
  disabled,
}: QueryBarProps) {
  const [query, setQuery] = useState('');
  const [activePreset, setActivePreset] = useState<number | null>(null);

  const handlePreset = (i: number) => {
    setQuery(PRESETS[i].query);
    setActivePreset(i);
  };

  const handleSubmit = () => {
    if (!query.trim() || disabled) return;
    onSubmit(query.trim());
  };

  const handleReset = () => {
    setQuery('');
    setActivePreset(null);
    onReset();
  };

  return (
    <div className="space-y-3">
      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p, i) => (
          <button
            key={i}
            onClick={() => handlePreset(i)}
            title={p.description}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activePreset === i
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Input row */}
      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActivePreset(null); }}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Type a query or pick a preset…"
          disabled={disabled}
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !query.trim()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          Run
        </button>
        <button
          onClick={handleReset}
          className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
          title="Clear and reset"
        >
          ↺
        </button>
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        {/* Mode toggle */}
        <div className="flex items-center gap-1 bg-gray-900 rounded-lg p-0.5 border border-gray-700">
          {(['sequential', 'parallel'] as ExecutionMode[]).map((m) => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              className={`px-3 py-1 rounded-md capitalize transition-colors ${
                mode === m ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Autorun toggle */}
        <label className="flex items-center gap-2 cursor-pointer text-gray-400 select-none">
          <button
            role="switch"
            aria-checked={autorun}
            onClick={() => onAutorunChange(!autorun)}
            className={`relative w-8 h-4 rounded-full transition-colors ${autorun ? 'bg-indigo-600' : 'bg-gray-700'}`}
          >
            <span
              className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${autorun ? 'translate-x-4' : 'translate-x-0.5'}`}
            />
          </button>
          Auto-run tools
        </label>

        {activePreset !== null && (
          <span className="text-gray-500 italic">{PRESETS[activePreset].description}</span>
        )}
      </div>
    </div>
  );
}
