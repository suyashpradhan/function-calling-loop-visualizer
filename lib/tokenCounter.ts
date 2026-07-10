// Real token counting via js-tiktoken (cl100k_base)
// Used to measure catalog and message context budget

import { getEncoding } from 'js-tiktoken';

let encoder: ReturnType<typeof getEncoding> | null = null;

function getEncoder() {
  if (!encoder) {
    encoder = getEncoding('cl100k_base');
  }
  return encoder;
}

export function countTokens(text: string): number {
  try {
    const enc = getEncoder();
    return enc.encode(text).length;
  } catch {
    // Fallback: rough approximation if tiktoken fails
    return Math.ceil(text.length / 4);
  }
}

export function countMessagesTokens(messages: { role: string; content?: string; tool_calls?: unknown }[]): number {
  let total = 0;
  for (const msg of messages) {
    total += 4; // Per-message overhead (role tokens)
    if (msg.content) total += countTokens(msg.content);
    if (msg.tool_calls) total += countTokens(JSON.stringify(msg.tool_calls));
  }
  return total;
}

// Serialise a tool catalog as a system message for token counting
export function catalogToSystemPrompt(tools: { name: string; description: string; schema: unknown }[]): string {
  const lines: string[] = ['You have access to the following tools:\n'];
  for (const tool of tools) {
    lines.push(`## ${tool.name}`);
    lines.push(tool.description);
    lines.push('```json');
    lines.push(JSON.stringify(tool.schema, null, 2));
    lines.push('```\n');
  }
  return lines.join('\n');
}
