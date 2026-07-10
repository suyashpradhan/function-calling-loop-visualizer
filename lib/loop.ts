// Real message loop state machine for the function-calling protocol.
// This is the "host" runtime — the model never executes tools, only emits intents.

export interface UserMessage {
  role: 'user';
  content: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AssistantMessage {
  role: 'assistant';
  content?: string;
  tool_calls?: ToolCall[];
}

export interface ToolResultMessage {
  role: 'tool';
  tool_call_id: string;
  name: string;
  content: string; // JSON-serialised result or error
  isError?: boolean;
}

export type Message = UserMessage | AssistantMessage | ToolResultMessage;

export type LoopStatus =
  | 'idle'
  | 'running'
  | 'awaiting_execute'
  | 'done'
  | 'stopped_max_iter'
  | 'error';

export type ExecutionMode = 'sequential' | 'parallel';

export const MAX_LOOP_ITERATIONS = 5;

// Schema validation status for a single tool call
export interface ValidationStatus {
  valid: boolean;
  errors?: string[];
}

// Per-call execution state tracked outside the message array
export interface ToolCallState {
  toolCallId: string;
  status: 'pending' | 'executing' | 'done' | 'error' | 'schema_error';
  validationStatus: ValidationStatus;
  result?: string;
}

// Serialise messages into the OpenAI wire format for token counting
export function serializeForTokenCounting(messages: Message[]): string {
  return messages
    .map((m) => {
      if (m.role === 'user') return `<|user|>\n${m.content}`;
      if (m.role === 'assistant') {
        const parts: string[] = [];
        if (m.content) parts.push(m.content);
        if (m.tool_calls) {
          parts.push(JSON.stringify(m.tool_calls));
        }
        return `<|assistant|>\n${parts.join('\n')}`;
      }
      // tool result
      return `<|tool|>\n${m.content}`;
    })
    .join('\n');
}
