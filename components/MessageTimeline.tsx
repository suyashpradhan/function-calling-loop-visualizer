'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Message, ToolCallState, LoopStatus } from '@/lib/loop';
import type { Provider } from '@/lib/providerFormats';
import type { ExecutionMode } from '@/lib/mockModel';
import UserCard from './UserCard';
import AssistantCard from './AssistantCard';
import ToolCallCard from './ToolCallCard';
import ToolResultCard from './ToolResultCard';

interface MessageTimelineProps {
  messages: Message[];
  toolCallStates: Record<string, ToolCallState>;
  provider: Provider;
  loopStatus: LoopStatus;
  onExecute: (toolCallId: string) => void;
  onExecuteAll: () => void;
  mode: ExecutionMode;
  iterationCount: number;
}

export default function MessageTimeline({
  messages,
  toolCallStates,
  provider,
  loopStatus,
  onExecute,
  onExecuteAll,
  mode,
  iterationCount,
}: MessageTimelineProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-64 text-center space-y-4 py-16">
        <div className="w-16 h-16 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center text-2xl">⚙</div>
        <div className="space-y-1">
          <p className="text-gray-300 font-medium">The message timeline will appear here</p>
          <p className="text-gray-500 text-sm">Pick a preset or type a query above, then click Run</p>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4 text-xs text-gray-500 max-w-md">
          <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
            <div className="text-blue-400 mb-1">USER</div>
            Your query
          </div>
          <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
            <div className="text-purple-400 mb-1">ASSISTANT</div>
            Tool intents
          </div>
          <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
            <div className="text-green-400 mb-1">HOST</div>
            Executes tools
          </div>
        </div>
      </div>
    );
  }

  // Flatten messages into renderable items
  // Each assistant message with tool_calls becomes: text (if any) + tool call cards
  const items: React.ReactNode[] = [];
  let itemIndex = 0;

  for (const msg of messages) {
    const key = `msg-${itemIndex++}`;

    if (msg.role === 'user') {
      items.push(
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <UserCard message={msg} provider={provider} />
        </motion.div>
      );
    } else if (msg.role === 'assistant') {
      // Text content (final response or prefix)
      if (msg.content && !msg.tool_calls) {
        items.push(
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <AssistantCard message={msg} provider={provider} />
          </motion.div>
        );
      }

      // Tool calls
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        const isParallel = mode === 'parallel' && msg.tool_calls.length > 1;

        items.push(
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* Assistant zone label */}
            <div className="flex items-center gap-2 mb-2 ml-1">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-xs text-purple-400 font-medium uppercase tracking-wide">
                Assistant — emits tool intent{msg.tool_calls.length > 1 ? 's' : ''}
              </span>
              {isParallel && (
                <span className="text-xs text-amber-400 bg-amber-950 border border-amber-800 px-2 py-0.5 rounded-full">
                  Parallel batch
                </span>
              )}
            </div>

            <div className={isParallel ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'space-y-3'}>
              {msg.tool_calls.map((tc, tcIdx) => (
                <motion.div
                  key={tc.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 30,
                    delay: isParallel ? tcIdx * 0.08 : 0,
                  }}
                >
                  <ToolCallCard
                    toolCall={tc}
                    state={toolCallStates[tc.id]}
                    provider={provider}
                    onExecute={() => onExecute(tc.id)}
                    loopStatus={loopStatus}
                  />
                </motion.div>
              ))}
            </div>

            {isParallel && (
              <p className="text-xs text-gray-500 mt-2 ml-1 italic">
                ⚠ Parallel tool calls assume independence — if Tool B needs Tool A&apos;s result, use sequential mode. Idempotency matters here.
              </p>
            )}

            {/* Execute All button when multiple pending tools */}
            {msg.tool_calls.length > 1 && loopStatus === 'awaiting_execute' && (
              <div className="mt-3">
                <button
                  onClick={onExecuteAll}
                  className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  Execute All ({msg.tool_calls.length})
                </button>
              </div>
            )}
          </motion.div>
        );
      }
    } else if (msg.role === 'tool') {
      items.push(
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {/* Host execution zone label */}
          <div className="flex items-center gap-2 mb-2 ml-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-green-400 font-medium uppercase tracking-wide">
              Host — tool result
            </span>
          </div>
          <ToolResultCard message={msg} provider={provider} />
        </motion.div>
      );
    }
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-8">
      {/* Loop iteration indicator */}
      {iterationCount > 0 && (
        <div className="text-xs text-gray-600 text-center">
          Loop iteration {iterationCount} / {5}
        </div>
      )}

      <AnimatePresence mode="popLayout">
        {items}
      </AnimatePresence>

      {/* Status messages */}
      {loopStatus === 'stopped_max_iter' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-orange-950 border border-orange-800 rounded-lg px-4 py-3 text-orange-300 text-sm"
        >
          ⚠ Loop stopped after {5} iterations to prevent infinite recursion. In production, implement a circuit breaker or token budget guard.
        </motion.div>
      )}

      {loopStatus === 'done' && messages.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-xs text-gray-600 py-2"
        >
          — Loop complete —
        </motion.div>
      )}

      {loopStatus === 'error' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-red-950 border border-red-800 rounded-lg px-4 py-3 text-red-300 text-sm"
        >
          Schema validation failed. Fix the arguments above to continue.
        </motion.div>
      )}
    </div>
  );
}
