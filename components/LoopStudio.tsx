'use client';

import React, { useState, useCallback, useRef } from 'react';
import { TOOL_CATALOG } from '@/lib/tools';
import {
  runMockModel,
  continueAfterResults,
} from '@/lib/mockModel';
import type { ExecutionMode } from '@/lib/mockModel';
import type { Message, ToolCall, ToolCallState, LoopStatus } from '@/lib/loop';
import { MAX_LOOP_ITERATIONS } from '@/lib/loop';
import { validateArgs } from '@/lib/schemaValidator';
import { countTokens, catalogToSystemPrompt } from '@/lib/tokenCounter';
import type { Provider } from '@/lib/providerFormats';

import QueryBar from './QueryBar';
import MessageTimeline from './MessageTimeline';
import ToolCatalog from './ToolCatalog';
import SchemaInspector from './SchemaInspector';
import ProviderToggle from './ProviderToggle';
import HonestDisclaimer from './HonestDisclaimer';
import CatalogBudgetWarning from './CatalogBudgetWarning';

export default function LoopStudio() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [toolCallStates, setToolCallStates] = useState<Record<string, ToolCallState>>({});
  const [loopStatus, setLoopStatus] = useState<LoopStatus>('idle');
  const [mode, setMode] = useState<ExecutionMode>('sequential');
  const [autorun, setAutorun] = useState(false);
  const [provider, setProvider] = useState<Provider>('openai');
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);
  const [iterationCount, setIterationCount] = useState(0);

  const remainingClausesRef = useRef<string[]>([]);
  const messagesRef = useRef<Message[]>([]);
  messagesRef.current = messages;

  // Catalog token count (computed once, stable)
  const catalogTokenCount = React.useMemo(() => {
    const prompt = catalogToSystemPrompt(
      TOOL_CATALOG.map((t) => ({ name: t.name, description: t.description, schema: t.schema }))
    );
    return countTokens(prompt);
  }, []);

  const messageTokenCount = React.useMemo(() => {
    const text = messages
      .map((m) => {
        if (m.role === 'user') return m.content;
        if (m.role === 'assistant') {
          return (m.content ?? '') + (m.tool_calls ? JSON.stringify(m.tool_calls) : '');
        }
        return m.content;
      })
      .join('\n');
    return countTokens(text);
  }, [messages]);

  const reset = useCallback(() => {
    setMessages([]);
    setToolCallStates({});
    setLoopStatus('idle');
    setIterationCount(0);
    remainingClausesRef.current = [];
  }, []);

  // After all tool results for current round are present, advance the loop
  const advanceLoop = useCallback(
    async (currentMessages: Message[], remaining: string[], iteration: number) => {
      if (iteration >= MAX_LOOP_ITERATIONS) {
        setLoopStatus('stopped_max_iter');
        return;
      }

      setLoopStatus('running');
      setIterationCount(iteration);

      const output = remaining.length > 0
        ? continueAfterResults(currentMessages, remaining, mode)
        : runMockModel(currentMessages, { mode, remainingClauses: [] });

      const assistantMsg = output.message;
      remainingClausesRef.current = output.remainingClauses;

      const updatedMessages = [...currentMessages, assistantMsg];
      setMessages(updatedMessages);

      if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
        // Final response — loop is done
        setLoopStatus('done');
        return;
      }

      // Validate all tool calls and set up states
      const newStates: Record<string, ToolCallState> = {};
      for (const tc of assistantMsg.tool_calls) {
        const tool = TOOL_CATALOG.find((t) => t.name === tc.name);
        if (!tool) {
          newStates[tc.id] = {
            toolCallId: tc.id,
            status: 'schema_error',
            validationStatus: { valid: false, errors: [`Unknown tool: ${tc.name}`] },
          };
          continue;
        }
        const validation = validateArgs(tool.schema as Record<string, unknown>, tc.arguments);
        newStates[tc.id] = {
          toolCallId: tc.id,
          status: validation.valid ? 'pending' : 'schema_error',
          validationStatus: validation,
        };
      }
      setToolCallStates((prev) => ({ ...prev, ...newStates }));

      const hasErrors = Object.values(newStates).some((s) => s.status === 'schema_error');
      if (hasErrors) {
        setLoopStatus('error');
        return;
      }

      setLoopStatus('awaiting_execute');

      if (autorun) {
        // Auto-execute all tool calls
        await executeAllToolCalls(assistantMsg.tool_calls, updatedMessages, output.remainingClauses, iteration + 1);
      }
    },
    [mode, autorun]
  );

  const executeAllToolCalls = useCallback(
    async (
      toolCalls: ToolCall[],
      currentMessages: Message[],
      remaining: string[],
      iteration: number
    ) => {
      setLoopStatus('running');

      // Mark all as executing
      setToolCallStates((prev) => {
        const next = { ...prev };
        for (const tc of toolCalls) {
          if (next[tc.id]?.status === 'pending') {
            next[tc.id] = { ...next[tc.id], status: 'executing' };
          }
        }
        return next;
      });

      // Execute all (parallel or sequential — in both cases results arrive)
      const resultMessages: Message[] = [];
      for (const tc of toolCalls) {
        const tool = TOOL_CATALOG.find((t) => t.name === tc.name);
        if (!tool) continue;

        try {
          const result = await tool.implementation(tc.arguments);
          const resultMsg: Message = {
            role: 'tool',
            tool_call_id: tc.id,
            name: tc.name,
            content: JSON.stringify(result, null, 2),
          };
          resultMessages.push(resultMsg);
          setToolCallStates((prev) => ({
            ...prev,
            [tc.id]: { ...prev[tc.id], status: 'done', result: JSON.stringify(result) },
          }));
        } catch (err) {
          const errorMsg: Message = {
            role: 'tool',
            tool_call_id: tc.id,
            name: tc.name,
            content: JSON.stringify({ error: String(err) }),
            isError: true,
          };
          resultMessages.push(errorMsg);
          setToolCallStates((prev) => ({
            ...prev,
            [tc.id]: { ...prev[tc.id], status: 'error', result: String(err) },
          }));
        }
      }

      const withResults = [...currentMessages, ...resultMessages];
      setMessages(withResults);

      // Continue loop
      await advanceLoop(withResults, remaining, iteration);
    },
    [advanceLoop]
  );

  const executeSingleToolCall = useCallback(
    async (toolCallId: string) => {
      const currentMsgs = messagesRef.current;
      // Find the tool call
      const assistantMsg = currentMsgs.find(
        (m): m is Extract<Message, { role: 'assistant' }> =>
          m.role === 'assistant' && !!m.tool_calls?.find((tc) => tc.id === toolCallId)
      );
      if (!assistantMsg?.tool_calls) return;

      const tc = assistantMsg.tool_calls.find((c) => c.id === toolCallId);
      if (!tc) return;

      const tool = TOOL_CATALOG.find((t) => t.name === tc.name);
      if (!tool) return;

      setToolCallStates((prev) => ({ ...prev, [toolCallId]: { ...prev[toolCallId], status: 'executing' } }));

      try {
        const result = await tool.implementation(tc.arguments);
        const resultMsg: Message = {
          role: 'tool',
          tool_call_id: tc.id,
          name: tc.name,
          content: JSON.stringify(result, null, 2),
        };

        const withResult = [...currentMsgs, resultMsg];
        setMessages(withResult);
        setToolCallStates((prev) => ({
          ...prev,
          [toolCallId]: { ...prev[toolCallId], status: 'done', result: JSON.stringify(result) },
        }));

        // Check if all tool calls in this assistant message are done
        const allDone = assistantMsg.tool_calls!.every(
          (c) => c.id === toolCallId || toolCallStates[c.id]?.status === 'done'
        );

        if (allDone) {
          await advanceLoop(withResult, remainingClausesRef.current, iterationCount + 1);
        }
      } catch (err) {
        const errorMsg: Message = {
          role: 'tool',
          tool_call_id: tc.id,
          name: tc.name,
          content: JSON.stringify({ error: String(err) }),
          isError: true,
        };
        const withError = [...currentMsgs, errorMsg];
        setMessages(withError);
        setToolCallStates((prev) => ({
          ...prev,
          [toolCallId]: { ...prev[toolCallId], status: 'error', result: String(err) },
        }));
      }
    },
    [advanceLoop, iterationCount, toolCallStates]
  );

  const handleExecuteAll = useCallback(async () => {
    const currentMsgs = messagesRef.current;
    const lastAssistant = [...currentMsgs].reverse().find(
      (m): m is Extract<Message, { role: 'assistant' }> => m.role === 'assistant' && !!m.tool_calls
    );
    if (!lastAssistant?.tool_calls) return;

    const pending = lastAssistant.tool_calls.filter(
      (tc) => toolCallStates[tc.id]?.status === 'pending'
    );
    if (pending.length === 0) return;

    await executeAllToolCalls(pending, currentMsgs, remainingClausesRef.current, iterationCount + 1);
  }, [executeAllToolCalls, iterationCount, toolCallStates]);

  const handleSubmit = useCallback(
    async (query: string) => {
      reset();
      const userMsg: Message = { role: 'user', content: query };
      const initialMessages: Message[] = [userMsg];
      setMessages(initialMessages);
      setLoopStatus('running');
      setIterationCount(0);

      const output = runMockModel(initialMessages, { mode });
      remainingClausesRef.current = output.remainingClauses;

      const assistantMsg = output.message;
      const withAssistant = [...initialMessages, assistantMsg];
      setMessages(withAssistant);

      if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
        setLoopStatus('done');
        return;
      }

      // Validate tool calls
      const newStates: Record<string, ToolCallState> = {};
      for (const tc of assistantMsg.tool_calls) {
        const tool = TOOL_CATALOG.find((t) => t.name === tc.name);
        if (!tool) {
          newStates[tc.id] = {
            toolCallId: tc.id,
            status: 'schema_error',
            validationStatus: { valid: false, errors: [`Unknown tool: ${tc.name}`] },
          };
          continue;
        }
        const validation = validateArgs(tool.schema as Record<string, unknown>, tc.arguments);
        newStates[tc.id] = {
          toolCallId: tc.id,
          status: validation.valid ? 'pending' : 'schema_error',
          validationStatus: validation,
        };
      }
      setToolCallStates(newStates);

      const hasErrors = Object.values(newStates).some((s) => s.status === 'schema_error');
      if (hasErrors) {
        setLoopStatus('error');
        return;
      }

      setLoopStatus('awaiting_execute');

      if (autorun) {
        await executeAllToolCalls(
          assistantMsg.tool_calls,
          withAssistant,
          output.remainingClauses,
          1
        );
      }
    },
    [mode, autorun, reset, executeAllToolCalls]
  );

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-sm">⚙</div>
          <span className="font-semibold text-white text-sm tracking-tight">Function Calling Loop Visualizer</span>
        </div>
        <span className="text-gray-500 text-xs hidden sm:block">— watch the real message-passing loop, live</span>
        <div className="ml-auto flex items-center gap-2 text-xs text-gray-500">
          <span className={`px-2 py-0.5 rounded-full border ${
            loopStatus === 'idle' ? 'border-gray-700 text-gray-500' :
            loopStatus === 'running' ? 'border-blue-700 text-blue-400 bg-blue-950' :
            loopStatus === 'awaiting_execute' ? 'border-amber-700 text-amber-400 bg-amber-950' :
            loopStatus === 'done' ? 'border-green-700 text-green-400 bg-green-950' :
            loopStatus === 'error' ? 'border-red-700 text-red-400 bg-red-950' :
            'border-orange-700 text-orange-400 bg-orange-950'
          }`}>
            {loopStatus === 'idle' ? 'Idle' :
             loopStatus === 'running' ? 'Running…' :
             loopStatus === 'awaiting_execute' ? 'Awaiting execute' :
             loopStatus === 'done' ? 'Done' :
             loopStatus === 'error' ? 'Schema error' :
             'Max iterations hit'}
          </span>
        </div>
      </header>

      {/* QueryBar */}
      <div className="border-b border-gray-800 px-4 py-3">
        <QueryBar
          onSubmit={handleSubmit}
          onReset={reset}
          mode={mode}
          onModeChange={setMode}
          autorun={autorun}
          onAutorunChange={setAutorun}
          disabled={loopStatus === 'running'}
        />
      </div>

      {/* Budget warning */}
      {catalogTokenCount > 2000 && (
        <CatalogBudgetWarning tokenCount={catalogTokenCount} />
      )}

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Tool Catalog */}
        <aside className="hidden lg:flex w-72 xl:w-80 border-r border-gray-800 flex-col overflow-y-auto">
          <ToolCatalog onHoverTool={setHoveredTool} hoveredTool={hoveredTool} />
        </aside>

        {/* Center: Message Timeline */}
        <main className="flex-1 overflow-y-auto px-4 py-4">
          <MessageTimeline
            messages={messages}
            toolCallStates={toolCallStates}
            provider={provider}
            loopStatus={loopStatus}
            onExecute={executeSingleToolCall}
            onExecuteAll={handleExecuteAll}
            mode={mode}
            iterationCount={iterationCount}
          />
        </main>

        {/* Right: Schema Inspector */}
        <aside className="hidden lg:flex w-72 xl:w-80 border-l border-gray-800 flex-col overflow-y-auto">
          <SchemaInspector
            hoveredTool={hoveredTool}
            catalogTokenCount={catalogTokenCount}
            messageTokenCount={messageTokenCount}
          />
        </aside>
      </div>

      {/* Mobile sidebars */}
      <div className="lg:hidden border-t border-gray-800">
        <details className="border-b border-gray-800">
          <summary className="px-4 py-3 text-sm font-medium text-gray-300 cursor-pointer select-none">
            Tool Catalog
          </summary>
          <div className="overflow-y-auto max-h-96">
            <ToolCatalog onHoverTool={setHoveredTool} hoveredTool={hoveredTool} />
          </div>
        </details>
        <details>
          <summary className="px-4 py-3 text-sm font-medium text-gray-300 cursor-pointer select-none">
            Schema Inspector + Token Budget
          </summary>
          <div className="overflow-y-auto max-h-80">
            <SchemaInspector
              hoveredTool={hoveredTool}
              catalogTokenCount={catalogTokenCount}
              messageTokenCount={messageTokenCount}
            />
          </div>
        </details>
      </div>

      {/* Sticky bottom bar */}
      <footer className="border-t border-gray-800 px-4 py-2 flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <ProviderToggle provider={provider} onProviderChange={setProvider} />
        <div className="flex-1" />
        <HonestDisclaimer />
      </footer>
    </div>
  );
}
