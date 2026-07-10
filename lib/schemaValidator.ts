// Real JSON Schema validation using ajv in strict mode
// Used to validate tool call arguments before execution

import Ajv from 'ajv';

const ajv = new Ajv({
  strict: true,
  allErrors: true,
  verbose: false,
});

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export function validateArgs(
  schema: Record<string, unknown>,
  args: unknown
): ValidationResult {
  const validate = ajv.compile(schema);
  const valid = validate(args) as boolean;
  if (valid) return { valid: true };
  const errors = validate.errors?.map((e) => {
    const path = e.instancePath || '(root)';
    return `${path}: ${e.message}`;
  }) ?? ['Unknown validation error'];
  return { valid: false, errors };
}
