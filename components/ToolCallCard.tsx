'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ToolCall, ToolCallState, LoopStatus } from '@/lib/loop';
import type { Provider } from '@/lib/providerFormats';
import { TOOL_CATALOG } from '@/lib/tools';

interface ToolCallCardProps {
  toolCall: ToolCall;
  state: ToolCallState | undefined;
  provider: Provider;
  onExecute: () => void;
  loopStatus: LoopStatus;
}

function providerToolCallLabel(provider: Provider, tc: ToolCall): string {
  switch (provider) {
    case 'openai':
      return `tool_calls[].function.name: "${tc.name}"`;
    case 'anthropic':
      return `type: "tool_use", name: "${tc.name}"`;
    case 'gemini':
      return `functionCall.name: "${tc.name}"`;
  }
}

function providerArgsLabel(provider: Provider): string {
  switch (provider) {
    case 'openai': return 'function.arguments (JSON string)';
    case 'anthropic': return 'input (object)';
    case 'gemini': return 'args (object)';
  }
}

const CATEGORY_COLORS: Record<string, string> = {
  read: 'text-green-400 bg-green-950 border-green-800',
  write: 'text-amber-400 bg-amber-950 border-amber-800',
  destructive: 'text-red-400 bg-red-950 border-red-800',
};

export default function ToolCallCard({ toolCall, state, provider, onExecute, loopStatus }: ToolCallCardProps) {
  const tool = TOOL_CATALOG.find((t) => t.name === toolCall.name);
  const isValid = state?.validationStatus.valid ?? true;
  const isPending = state?.status === 'pending';
  const isExecuting = state?.status === 'executing';
  const isDone = state?.status === 'done';
  const isSchemaError = state?.status === 'schema_error';
  const canExecute = isPending && loopStatus === 'awaiting_execute';

  return (
    <motion.div
      className={`rounded-xl border p-4 relative overflow-hidden ${
        isSchemaError
          ? 'border-red-800 bg-red-950/30'
          : isDone
          ? 'border-gray-700 bg-gray-900/50 opacity-75'
          : 'border-purple-800 bg-purple-950/20'
      }`}
      animate={isPending && !isDone ? {
        boxShadow: ['0 0 0 0 rgba(147,51,234,0)', '0 0 0 4px rgba(147,51,234,0.15)', '0 0 0 0 rgba(147,51,234,0)'],
      } : {}}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    >
      {/* Header */}
      <div className="flex items-start gap-2 mb-3">
        <div className="w-5 h-5 rounded bg-purple-700 flex items-center justify-center text-white text-xs mt-0.5">⚡</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-purple-300 uppercase tracking-wide">Tool Call</span>
            <span className="font-mono text-sm text-white font-semibold">{toolCall.name}</span>
            {tool && (
              <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${CATEGORY_COLORS[tool.category]}`}>
                {tool.category}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 font-mono mt-0.5">{providerToolCallLabel(provider, toolCall)}</p>
        </div>

        {/* Validation badge */}
        <AnimatePresence mode="wait">
          <motion.div
            key={isValid ? 'valid' : 'invalid'}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`text-xs px-2 py-1 rounded-full border font-medium shrink-0 ${
              isValid
                ? 'text-green-400 bg-green-950 border-green-800'
                : 'text-red-400 bg-red-950 border-red-800'
            }`}
          >
            {isValid ? '✓ schema valid' : '✗ schema error'}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Arguments */}
      <div className="space-y-1 mb-3">
        <p className="text-xs text-gray-500 font-mono">{providerArgsLabel(provider)}:</p>
        <pre className="bg-gray-950 border border-gray-800 rounded-lg p-3 text-xs text-gray-300 font-mono overflow-x-auto">
          {provider === 'openai'
            ? JSON.stringify(JSON.stringify(toolCall.arguments))
            : JSON.stringify(toolCall.arguments, null, 2)}
        </pre>
      </div>

      {/* Schema validation errors */}
      {isSchemaError && state?.validationStatus.errors && (
        <div className="bg-red-950 border border-red-800 rounded-lg p-3 mb-3 space-y-1">
          <p className="text-xs font-medium text-red-400">Schema validation errors (ajv):</p>
          {state.validationStatus.errors.map((err, i) => (
            <p key={i} className="text-xs text-red-300 font-mono">{err}</p>
          ))}
        </div>
      )}

      {/* Execution state / button */}
      <div className="flex items-center gap-2">
        {isExecuting && (
          <div className="flex items-center gap-2 text-xs text-blue-400">
            <motion.div
              className="w-3 h-3 rounded-full border-2 border-blue-400 border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            />
            Executing…
          </div>
        )}
        {isDone && (
          <div className="text-xs text-green-400 flex items-center gap-1">
            <span>✓</span> Executed
          </div>
        )}
        {canExecute && (
          <button
            onClick={onExecute}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors"
          >
            Execute ▶
          </button>
        )}
        {isPending && loopStatus !== 'awaiting_execute' && (
          <span className="text-xs text-gray-500">Waiting…</span>
        )}
        <span className="ml-auto text-xs text-gray-600 font-mono">id: {toolCall.id.slice(0, 16)}…</span>
      </div>

      {/* Explanation note */}
      <div className="mt-3 pt-3 border-t border-gray-800/50">
        <p className="text-xs text-gray-600 italic">
          The model emits intent only — YOUR app (this host) runs the actual function below.
        </p>
      </div>
    </motion.div>
  );
}
