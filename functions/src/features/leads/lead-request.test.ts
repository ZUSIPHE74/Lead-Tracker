import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DomainError } from './lead';
import { parseCreateLeadRequest } from './lead-request';

test('accepts a minimal valid lead', () => {
  const input = parseCreateLeadRequest({ company: 'Acme', industry: 'Mining' });
  assert.equal(input.company, 'Acme');
  assert.equal(input.email, '');
});

test('invalid input throws a DomainError so the API answers 400, not 500', () => {
  assert.throws(
    () => parseCreateLeadRequest({ industry: 'Mining' }),
    (err: unknown) => err instanceof DomainError && err.code === 'lead.invalid-request',
  );
  assert.throws(
    () => parseCreateLeadRequest({ company: 'Acme', industry: 'Mining', priority: 'urgent' }),
    DomainError,
  );
});
