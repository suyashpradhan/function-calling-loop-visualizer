// Provider wire-format renderers — same semantic content, three different formats.
// Demonstrates that OpenAI tool_calls, Anthropic tool_use, and Gemini functionCall
// are isomorphic representations of the same function-calling loop.

import type { Message, ToolCall } from './loop';

export type Provider = 'openai' | 'anthropic' | 'gemini';

// ──────────────────────────────────────────────
// OpenAI format
// ──────────────────────────────────────────────
export function toOpenAIFormat(messages: Message[]) {
  return messages.map((msg) => {
    if (msg.role === 'user') {
      return { role: 'user', content: msg.content };
    }
    if (msg.role === 'assistant') {
      const out: Record<string, unknown> = { role: 'assistant' };
      if (msg.content) out.content = msg.content;
      if (msg.tool_calls) {
        out.tool_calls = msg.tool_calls.map((tc: ToolCall) => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
        }));
      }
      return out;
    }
    // tool result
    return {
      role: 'tool',
      tool_call_id: msg.tool_call_id,
      content: msg.content,
    };
  });
}

// ──────────────────────────────────────────────
// Anthropic format
// ──────────────────────────────────────────────
export function toAnthropicFormat(messages: Message[]) {
  return messages.map((msg) => {
    if (msg.role === 'user') {
      return { role: 'user', content: [{ type: 'text', text: msg.content }] };
    }
    if (msg.role === 'assistant') {
      const content: unknown[] = [];
      if (msg.content) content.push({ type: 'text', text: msg.content });
      if (msg.tool_calls) {
        for (const tc of msg.tool_calls) {
          content.push({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.arguments });
        }
      }
      return { role: 'assistant', content };
    }
    // tool result
    return {
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: msg.tool_call_id,
          content: msg.content,
        },
      ],
    };
  });
}

// ──────────────────────────────────────────────
// Gemini format
// ──────────────────────────────────────────────
export function toGeminiFormat(messages: Message[]) {
  return messages.map((msg) => {
    if (msg.role === 'user') {
      return { role: 'user', parts: [{ text: msg.content }] };
    }
    if (msg.role === 'assistant') {
      const parts: unknown[] = [];
      if (msg.content) parts.push({ text: msg.content });
      if (msg.tool_calls) {
        for (const tc of msg.tool_calls) {
          parts.push({ functionCall: { name: tc.name, args: tc.arguments } });
        }
      }
      return { role: 'model', parts };
    }
    // tool result
    return {
      role: 'user',
      parts: [
        {
          functionResponse: {
            name: msg.name,
            response: { content: msg.content },
          },
        },
      ],
    };
  });
}

export function formatForProvider(messages: Message[], provider: Provider) {
  switch (provider) {
    case 'openai': return toOpenAIFormat(messages);
    case 'anthropic': return toAnthropicFormat(messages);
    case 'gemini': return toGeminiFormat(messages);
  }
}
