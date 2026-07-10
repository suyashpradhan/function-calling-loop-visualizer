// Deterministic pattern-matching "model" — a stand-in for LLM constrained-decoding tool selection.
// This is NOT a real LLM. It uses keyword rules + regex entity extraction.
// Labeled honestly everywhere it appears in the UI.

import type { AssistantMessage, ToolCall } from './loop';
import type { Message } from './loop';

export type ExecutionMode = 'sequential' | 'parallel';

interface MatchedTool {
  name: string;
  args: Record<string, unknown>;
}

// ──────────────────────────────────────────────
// Entity dictionaries for argument extraction
// ──────────────────────────────────────────────

const CITY_ALIASES: Record<string, string> = {
  bengaluru: 'Bengaluru',
  bangalore: 'Bengaluru',
  delhi: 'Delhi',
  'new delhi': 'Delhi',
  mumbai: 'Mumbai',
  london: 'London',
  'new york': 'New York',
  tokyo: 'Tokyo',
  paris: 'Paris',
  sydney: 'Sydney',
  dubai: 'Dubai',
};

const CURRENCY_CODES = new Set([
  'USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD', 'SGD', 'AED', 'CHF',
]);

const TIMEZONE_MAP: Record<string, string> = {
  india: 'Asia/Kolkata',
  kolkata: 'Asia/Kolkata',
  bengaluru: 'Asia/Kolkata',
  bangalore: 'Asia/Kolkata',
  delhi: 'Asia/Kolkata',
  mumbai: 'Asia/Kolkata',
  london: 'Europe/London',
  uk: 'Europe/London',
  'new york': 'America/New_York',
  'new_york': 'America/New_York',
  ny: 'America/New_York',
  nyc: 'America/New_York',
  tokyo: 'Asia/Tokyo',
  japan: 'Asia/Tokyo',
  paris: 'Europe/Paris',
  france: 'Europe/Paris',
  sydney: 'Australia/Sydney',
  australia: 'Australia/Sydney',
  dubai: 'Asia/Dubai',
  uae: 'Asia/Dubai',
  utc: 'UTC',
  gmt: 'GMT',
  est: 'America/New_York',
  pst: 'America/Los_Angeles',
  cst: 'America/Chicago',
  ist: 'Asia/Kolkata',
};

function extractCity(text: string): string | null {
  const lower = text.toLowerCase();
  // Try longer matches first to avoid partial matches
  const sorted = Object.keys(CITY_ALIASES).sort((a, b) => b.length - a.length);
  for (const alias of sorted) {
    if (lower.includes(alias)) return CITY_ALIASES[alias];
  }
  return null;
}

function extractAllCities(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  const sorted = Object.keys(CITY_ALIASES).sort((a, b) => b.length - a.length);
  const used = new Set<string>();
  for (const alias of sorted) {
    const canonical = CITY_ALIASES[alias];
    if (!used.has(canonical) && lower.includes(alias)) {
      found.push(canonical);
      used.add(canonical);
    }
  }
  return found;
}

function extractCurrencies(text: string): string[] {
  const upper = text.toUpperCase();
  return Array.from(CURRENCY_CODES).filter((code) => {
    const idx = upper.indexOf(code);
    if (idx === -1) return false;
    // Make sure it's a word boundary
    const before = upper[idx - 1];
    const after = upper[idx + code.length];
    const isBoundary = (c?: string) => !c || /\W/.test(c);
    return isBoundary(before) && isBoundary(after);
  });
}

function extractAmount(text: string): number | null {
  const m = text.match(/[\d,]+(?:\.\d+)?/);
  if (!m) return null;
  return parseFloat(m[0].replace(/,/g, ''));
}

function extractDate(text: string): string {
  // Match explicit YYYY-MM-DD
  const iso = text.match(/\d{4}-\d{2}-\d{2}/);
  if (iso) return iso[0];
  // "tomorrow"
  if (/tomorrow/i.test(text)) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }
  // "today"
  if (/today/i.test(text)) {
    return new Date().toISOString().slice(0, 10);
  }
  // Default to tomorrow
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function extractTimezone(text: string): string {
  const lower = text.toLowerCase();
  // Full IANA match first
  const iana = text.match(/[A-Z][a-z]+\/[A-Z][a-z_]+/);
  if (iana) return iana[0];
  // Keyword lookup
  const sorted = Object.keys(TIMEZONE_MAP).sort((a, b) => b.length - a.length);
  for (const key of sorted) {
    if (lower.includes(key)) return TIMEZONE_MAP[key];
  }
  return 'UTC';
}

function extractArithmeticExpression(text: string): string | null {
  // Match things like "12 + 34", "(3+5)*2", "100/4"
  const m = text.match(/[\d\s\+\-\*\/\(\)\.]+/);
  if (!m) return null;
  const expr = m[0].trim();
  // Must have an operator to be an expression
  if (/[+\-*\/]/.test(expr) && /\d/.test(expr)) return expr;
  return null;
}

// ──────────────────────────────────────────────
// Tool matching — returns matched tools per clause
// ──────────────────────────────────────────────

function matchClause(clause: string): MatchedTool[] {
  const lower = clause.toLowerCase();
  const matched: MatchedTool[] = [];

  // get_weather
  if (/weather|temperature|temp|forecast|climate|hot|cold|raining/.test(lower)) {
    const cities = extractAllCities(clause);
    if (cities.length === 0) cities.push('Delhi'); // fallback
    for (const city of cities) {
      matched.push({ name: 'get_weather', args: { location: city } });
    }
  }

  // search_flights
  if (/flight|fly|book.*flight|travel.*from|depart|arrive|ticket/.test(lower)) {
    const cities = extractAllCities(clause);
    const date = extractDate(clause);
    matched.push({
      name: 'search_flights',
      args: {
        from: cities[0] ?? 'Delhi',
        to: cities[1] ?? 'Mumbai',
        date,
      },
    });
  }

  // convert_currency
  if (/convert|exchange|rate|currency|how much.*in|inr|usd|eur|gbp|jpy/.test(lower)) {
    const currencies = extractCurrencies(clause);
    const amount = extractAmount(clause);
    matched.push({
      name: 'convert_currency',
      args: {
        amount: amount ?? 100,
        from: currencies[0] ?? 'INR',
        to: currencies[1] ?? 'USD',
      },
    });
  }

  // get_time
  if (/time|clock|timezone|what time|current time/.test(lower) && !/timeline|sometime|pastime/.test(lower)) {
    matched.push({ name: 'get_time', args: { timezone: extractTimezone(clause) } });
  }

  // calculate
  if (/calculat|compute|evaluat|math|arithmetic|what is \d|how much is \d/.test(lower) ||
      /[\d\s]+[+\-*\/][\d\s]+/.test(lower)) {
    const expr = extractArithmeticExpression(clause);
    if (expr) {
      matched.push({ name: 'calculate', args: { expression: expr.trim() } });
    } else {
      // try to extract from "calculate X"
      const afterCalc = clause.match(/calculat\w*\s+(.+)/i);
      if (afterCalc) {
        matched.push({ name: 'calculate', args: { expression: afterCalc[1].trim() } });
      }
    }
  }

  return matched;
}

// Split query into independent clauses
function splitClauses(query: string): string[] {
  // Split on " and " / " & " / commas — but keep "convert X to Y" together
  const parts = query.split(/\s+and\s+|\s*,\s*|\s*&\s*/i);
  return parts.map((p) => p.trim()).filter(Boolean);
}

// ──────────────────────────────────────────────
// Unique ID generator for tool calls
// ──────────────────────────────────────────────
let _callCounter = 0;
export function makeToolCallId(): string {
  return `call_${Date.now()}_${++_callCounter}`;
}

// ──────────────────────────────────────────────
// Main mock model entry point
//
// The model receives the full message history and returns an AssistantMessage.
// In sequential mode with pending clauses, it returns one tool call at a time.
// In parallel mode, all independent tool calls come in a single message.
// ──────────────────────────────────────────────

export interface MockModelOptions {
  mode: ExecutionMode;
  // Clauses not yet resolved (for sequential re-entry)
  remainingClauses?: string[];
}

export interface MockModelOutput {
  message: AssistantMessage;
  // Remaining clauses to process after current tool results land (sequential only)
  remainingClauses: string[];
}

export function runMockModel(
  messages: Message[],
  options: MockModelOptions
): MockModelOutput {
  const { mode, remainingClauses: incoming } = options;

  // On first call, derive clauses from the latest user message
  let clauses: string[];
  if (incoming !== undefined) {
    clauses = incoming;
  } else {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user') as
      | { role: 'user'; content: string }
      | undefined;
    if (!lastUser) {
      return {
        message: { role: 'assistant', content: "I didn't receive a message to process." },
        remainingClauses: [],
      };
    }
    clauses = splitClauses(lastUser.content);
  }

  // Collect all tool matches across all remaining clauses
  const allMatches: { clause: string; tools: MatchedTool[] }[] = clauses.map((c) => ({
    clause: c,
    tools: matchClause(c),
  }));

  const toolMatches = allMatches.flatMap((m) => m.tools);

  if (toolMatches.length === 0) {
    // No tools matched — return a direct response
    return {
      message: {
        role: 'assistant',
        content: synthesizeDirectResponse(messages),
      },
      remainingClauses: [],
    };
  }

  if (mode === 'parallel') {
    // Emit all tool calls together in one message
    const tool_calls: ToolCall[] = toolMatches.map((t) => ({
      id: makeToolCallId(),
      name: t.name,
      arguments: t.args,
    }));
    return {
      message: { role: 'assistant', tool_calls },
      remainingClauses: [],
    };
  } else {
    // Sequential: emit only the first tool call, pass remaining clauses back
    const first = toolMatches[0];
    const restTools = toolMatches.slice(1);
    // Reconstruct remaining clauses from unmatched tools
    // (simplified: carry remaining tool matches as synthetic clauses)
    const remainingClauses = restTools.map((t) => `${t.name}:${JSON.stringify(t.args)}`);
    return {
      message: {
        role: 'assistant',
        tool_calls: [{ id: makeToolCallId(), name: first.name, arguments: first.args }],
      },
      remainingClauses,
    };
  }
}

// Re-entry point after tool results arrive — for sequential mode
export function continueAfterResults(
  messages: Message[],
  remainingClauses: string[],
  mode: ExecutionMode
): MockModelOutput {
  if (remainingClauses.length === 0) {
    // All clauses resolved — synthesize final response
    return {
      message: { role: 'assistant', content: synthesizeFinalResponse(messages) },
      remainingClauses: [],
    };
  }

  if (mode === 'parallel') {
    // Shouldn't happen in normal flow, but handle gracefully
    return continueAfterResults(messages, [], mode);
  }

  // Parse the first remaining synthetic clause
  const first = remainingClauses[0];
  const rest = remainingClauses.slice(1);

  // Check if it's a synthetic "name:{args}" clause from sequential splitting
  const syntheticMatch = first.match(/^(\w+):(\{.+\})$/);
  if (syntheticMatch) {
    const name = syntheticMatch[1];
    const args = JSON.parse(syntheticMatch[2]) as Record<string, unknown>;
    return {
      message: {
        role: 'assistant',
        tool_calls: [{ id: makeToolCallId(), name, arguments: args }],
      },
      remainingClauses: rest,
    };
  }

  // Natural language clause — run matching
  const tools = matchClause(first);
  if (tools.length === 0) {
    return continueAfterResults(messages, rest, mode);
  }

  return {
    message: {
      role: 'assistant',
      tool_calls: [{ id: makeToolCallId(), name: tools[0].name, arguments: tools[0].args }],
    },
    remainingClauses: [...rest, ...tools.slice(1).map((t) => `${t.name}:${JSON.stringify(t.args)}`)],
  };
}

// ──────────────────────────────────────────────
// Final response synthesis — reads tool results from messages
// ──────────────────────────────────────────────

function synthesizeFinalResponse(messages: Message[]): string {
  const results: string[] = [];

  for (const msg of messages) {
    if (msg.role !== 'tool') continue;
    try {
      const data = JSON.parse(msg.content) as Record<string, unknown>;

      if ('temp_c' in data) {
        results.push(
          `The weather in ${data.location} is ${data.temp_c}°C with ${data.condition}.`
        );
      } else if ('flights' in data) {
        const flights = data.flights as { flight: string; dep: string; arr: string; price_usd: number }[];
        const summary = flights
          .slice(0, 2)
          .map((f) => `${f.flight} (${f.dep}→${f.arr}, $${f.price_usd})`)
          .join(', ');
        results.push(`Available flights from ${data.from} to ${data.to} on ${data.date}: ${summary}.`);
      } else if ('converted' in data) {
        results.push(
          `${data.amount} ${data.from} = ${data.converted} ${data.to} (rate: ${data.rate}).`
        );
      } else if ('time' in data) {
        results.push(`Current time in ${data.timezone}: ${data.time} on ${data.date} (${data.offset}).`);
      } else if ('result' in data) {
        results.push(`${data.expression} = ${data.result}`);
      } else {
        results.push(JSON.stringify(data));
      }
    } catch {
      results.push(msg.content);
    }
  }

  if (results.length === 0) return 'I was unable to find the information you requested.';
  return results.join(' ');
}

function synthesizeDirectResponse(messages: Message[]): string {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user') as
    | { role: 'user'; content: string }
    | undefined;
  const query = lastUser?.content?.toLowerCase() ?? '';

  if (/meaning of life|42|philosophy|existence/.test(query)) {
    return "The meaning of life is a profound philosophical question that has occupied thinkers for millennia. The most famous tongue-in-cheek answer is 42 (from The Hitchhiker's Guide to the Galaxy). More seriously, many find meaning through connection, purpose, and contribution to others — though the answer varies deeply by worldview.";
  }
  if (/hello|hi|hey/.test(query)) {
    return "Hello! I'm ready to help. I can check weather, search flights, convert currencies, look up the time in any timezone, or calculate arithmetic expressions. What would you like to know?";
  }
  if (/who are you|what are you/.test(query)) {
    return "I'm a deterministic pattern-matching stand-in for an LLM — used here to demonstrate the function-calling loop without making real API calls. In a real system, an actual language model would occupy this role.";
  }
  return "I'm not sure how to help with that specific query using my available tools. I can check weather, search flights, convert currencies, look up time zones, or evaluate arithmetic. Try one of those!";
}
