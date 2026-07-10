// Real client-side tool implementations with JSON Schema definitions
// The "host" side of the function-calling loop — the model never executes these

export type ToolCategory = 'read' | 'write' | 'destructive';

// Using plain object for schema so ajv can compile it without complex generic constraints
export interface ToolDefinition<TArgs = Record<string, unknown>, TResult = unknown> {
  name: string;
  description: string;
  schema: Record<string, unknown>;
  implementation: (args: TArgs) => Promise<TResult>;
  category: ToolCategory;
}

// ──────────────────────────────────────────────
// get_weather
// ──────────────────────────────────────────────

interface WeatherArgs {
  location: string;
}
interface WeatherResult {
  location: string;
  temp_c: number;
  condition: string;
}

const WEATHER_DB: Record<string, { temp_c: number; condition: string }> = {
  bengaluru: { temp_c: 27, condition: 'Partly cloudy' },
  bangalore: { temp_c: 27, condition: 'Partly cloudy' },
  delhi: { temp_c: 38, condition: 'Hazy sunshine' },
  mumbai: { temp_c: 31, condition: 'Humid, chance of rain' },
  london: { temp_c: 15, condition: 'Overcast' },
  'new york': { temp_c: 22, condition: 'Sunny' },
  tokyo: { temp_c: 25, condition: 'Clear' },
  paris: { temp_c: 18, condition: 'Light rain' },
  sydney: { temp_c: 19, condition: 'Sunny' },
  dubai: { temp_c: 42, condition: 'Hot and sunny' },
};

const weatherTool: ToolDefinition<WeatherArgs, WeatherResult> = {
  name: 'get_weather',
  description: 'Get current weather for a city. Returns temperature in Celsius and condition.',
  category: 'read',
  schema: {
    type: 'object',
    properties: {
      location: {
        type: 'string',
        description: 'City name (e.g. "Bengaluru", "Delhi")',
      },
    },
    required: ['location'],
    additionalProperties: false,
  },
  async implementation({ location }) {
    const key = location.toLowerCase().trim();
    const data = WEATHER_DB[key];
    if (!data) {
      return { location, temp_c: 20, condition: `No data for "${location}" — using default` };
    }
    return { location, temp_c: data.temp_c, condition: data.condition };
  },
};

// ──────────────────────────────────────────────
// search_flights
// ──────────────────────────────────────────────

interface FlightArgs {
  from: string;
  to: string;
  date: string;
}
interface Flight {
  flight: string;
  dep: string;
  arr: string;
  price_usd: number;
}
interface FlightResult {
  from: string;
  to: string;
  date: string;
  flights: Flight[];
}

const FLIGHT_DB: Record<string, Flight[]> = {
  'del-bom': [
    { flight: 'AI-865', dep: '06:30', arr: '08:45', price_usd: 55 },
    { flight: '6E-101', dep: '11:00', arr: '13:20', price_usd: 42 },
    { flight: 'SG-342', dep: '18:30', arr: '20:50', price_usd: 48 },
  ],
  'bom-del': [
    { flight: 'AI-660', dep: '07:00', arr: '09:15', price_usd: 52 },
    { flight: '6E-502', dep: '14:30', arr: '16:45', price_usd: 45 },
  ],
  'blr-del': [
    { flight: 'AI-503', dep: '05:55', arr: '08:30', price_usd: 63 },
    { flight: '6E-235', dep: '13:15', arr: '15:50', price_usd: 51 },
    { flight: 'UK-810', dep: '20:00', arr: '22:40', price_usd: 58 },
  ],
  'del-blr': [
    { flight: 'AI-508', dep: '09:00', arr: '11:45', price_usd: 61 },
    { flight: '6E-904', dep: '17:30', arr: '20:10', price_usd: 49 },
  ],
};

const flightTool: ToolDefinition<FlightArgs, FlightResult> = {
  name: 'search_flights',
  description: 'Search available flights between two cities on a given date.',
  category: 'read',
  schema: {
    type: 'object',
    properties: {
      from: { type: 'string', description: 'IATA code or city name (e.g. "DEL", "Delhi")' },
      to: { type: 'string', description: 'IATA code or city name (e.g. "BLR", "Bengaluru")' },
      date: { type: 'string', description: 'Travel date in YYYY-MM-DD format' },
    },
    required: ['from', 'to', 'date'],
    additionalProperties: false,
  },
  async implementation({ from, to, date }) {
    const normalize = (s: string) => {
      const m: Record<string, string> = {
        delhi: 'del', new_delhi: 'del', 'new delhi': 'del',
        mumbai: 'bom', bombay: 'bom',
        bengaluru: 'blr', bangalore: 'blr',
      };
      const lower = s.toLowerCase().trim();
      return m[lower] ?? lower.slice(0, 3);
    };
    const key = `${normalize(from)}-${normalize(to)}`;
    const flights = FLIGHT_DB[key] ?? [
      { flight: 'XX-999', dep: '10:00', arr: '12:00', price_usd: 99 },
    ];
    return { from, to, date, flights };
  },
};

// ──────────────────────────────────────────────
// convert_currency
// ──────────────────────────────────────────────

interface CurrencyArgs {
  amount: number;
  from: string;
  to: string;
}
interface CurrencyResult {
  amount: number;
  from: string;
  to: string;
  converted: number;
  rate: number;
}

// All rates expressed relative to USD
const FX_USD: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  INR: 83.5,
  JPY: 154.2,
  AUD: 1.53,
  CAD: 1.36,
  SGD: 1.34,
  AED: 3.67,
  CHF: 0.91,
};

const currencyTool: ToolDefinition<CurrencyArgs, CurrencyResult> = {
  name: 'convert_currency',
  description: 'Convert a monetary amount between two currencies using fixed reference rates.',
  category: 'read',
  schema: {
    type: 'object',
    properties: {
      amount: { type: 'number', description: 'Amount to convert' },
      from: { type: 'string', description: 'Source currency code (e.g. "INR")' },
      to: { type: 'string', description: 'Target currency code (e.g. "USD")' },
    },
    required: ['amount', 'from', 'to'],
    additionalProperties: false,
  },
  async implementation({ amount, from, to }) {
    const fromRate = FX_USD[from.toUpperCase()];
    const toRate = FX_USD[to.toUpperCase()];
    if (!fromRate) throw new Error(`Unknown currency: ${from}`);
    if (!toRate) throw new Error(`Unknown currency: ${to}`);
    const rate = toRate / fromRate;
    const converted = parseFloat((amount * rate).toFixed(4));
    return { amount, from: from.toUpperCase(), to: to.toUpperCase(), converted, rate };
  },
};

// ──────────────────────────────────────────────
// get_time
// ──────────────────────────────────────────────

interface TimeArgs {
  timezone: string;
}
interface TimeResult {
  timezone: string;
  time: string;
  date: string;
  offset: string;
}

const timeTool: ToolDefinition<TimeArgs, TimeResult> = {
  name: 'get_time',
  description: 'Get the current date and time in a given IANA timezone.',
  category: 'read',
  schema: {
    type: 'object',
    properties: {
      timezone: { type: 'string', description: 'IANA timezone string (e.g. "Asia/Kolkata")' },
    },
    required: ['timezone'],
    additionalProperties: false,
  },
  async implementation({ timezone }) {
    const now = new Date();
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const dateFmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const offsetFmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    });
    const offsetParts = offsetFmt.formatToParts(now);
    const offset = offsetParts.find((p) => p.type === 'timeZoneName')?.value ?? '';
    return { timezone, time: fmt.format(now), date: dateFmt.format(now), offset };
  },
};

// ──────────────────────────────────────────────
// calculate — safe AST-based arithmetic evaluator
// Only allows: numbers, +, -, *, /, (, )
// No eval, no Function constructor.
// ──────────────────────────────────────────────

interface CalcArgs {
  expression: string;
}
interface CalcResult {
  expression: string;
  result: number;
}

// Tokeniser + recursive-descent parser — no eval, no regex eval tricks
type Token = { type: 'num'; val: number } | { type: 'op'; val: string };

function tokenise(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/[0-9.]/.test(ch)) {
      let num = '';
      while (i < expr.length && /[0-9.]/.test(expr[i])) num += expr[i++];
      tokens.push({ type: 'num', val: parseFloat(num) });
    } else if ('+-*/()'.includes(ch)) {
      tokens.push({ type: 'op', val: ch });
      i++;
    } else {
      throw new Error(`Disallowed character: "${ch}". Only numbers and +-*/() are permitted.`);
    }
  }
  return tokens;
}

class Parser {
  private pos = 0;
  constructor(private tokens: Token[]) {}
  private peek() { return this.tokens[this.pos]; }
  private consume() { return this.tokens[this.pos++]; }
  parse(): number { const v = this.expr(); if (this.peek()) throw new Error('Unexpected token'); return v; }
  private expr(): number {
    let left = this.term();
    while (this.peek()?.type === 'op' && (this.peek().val === '+' || this.peek().val === '-')) {
      const op = this.consume().val;
      const right = this.term();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }
  private term(): number {
    let left = this.unary();
    while (this.peek()?.type === 'op' && (this.peek().val === '*' || this.peek().val === '/')) {
      const op = this.consume().val;
      const right = this.unary();
      if (op === '/' && right === 0) throw new Error('Division by zero');
      left = op === '*' ? left * right : left / right;
    }
    return left;
  }
  private unary(): number {
    if (this.peek()?.type === 'op' && this.peek().val === '-') {
      this.consume();
      return -this.primary();
    }
    return this.primary();
  }
  private primary(): number {
    const t = this.peek();
    if (!t) throw new Error('Unexpected end of expression');
    if (t.type === 'num') { this.consume(); return t.val; }
    if (t.type === 'op' && t.val === '(') {
      this.consume();
      const v = this.expr();
      const close = this.consume();
      if (!close || close.val !== ')') throw new Error('Missing closing parenthesis');
      return v;
    }
    throw new Error(`Unexpected token: "${t.val}"`);
  }
}

const calculateTool: ToolDefinition<CalcArgs, CalcResult> = {
  name: 'calculate',
  description:
    'Evaluate a safe arithmetic expression. Supports +, -, *, /, parentheses, and numeric literals only. No variables, no functions.',
  category: 'read',
  schema: {
    type: 'object',
    properties: {
      expression: { type: 'string', description: 'Arithmetic expression, e.g. "(3 + 5) * 2"' },
    },
    required: ['expression'],
    additionalProperties: false,
  },
  async implementation({ expression }) {
    const tokens = tokenise(expression);
    const result = new Parser(tokens).parse();
    return { expression, result };
  },
};

// ──────────────────────────────────────────────
// Catalog export — order matters for display
// ──────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TOOL_CATALOG: ToolDefinition<any, any>[] = [
  weatherTool,
  flightTool,
  currencyTool,
  timeTool,
  calculateTool,
];

export type { ToolDefinition as Tool };
