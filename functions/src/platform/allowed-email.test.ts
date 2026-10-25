import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasAllowedDomain } from './allowed-email';

const DOMAIN = '@moderntech.co.za';

test('allows emails on the domain, case-insensitively', () => {
  assert.equal(hasAllowedDomain('agent@moderntech.co.za', DOMAIN), true);
  assert.equal(hasAllowedDomain(' Agent@ModernTech.co.za ', DOMAIN), true);
});

test('rejects other domains and look-alikes', () => {
  assert.equal(hasAllowedDomain('admin@gmail.com', DOMAIN), false);
  assert.equal(hasAllowedDomain('x@moderntech.co.za.evil.com', DOMAIN), false);
  assert.equal(hasAllowedDomain('x@notmoderntech.co.za', DOMAIN), false);
});

test('rejects a missing email', () => {
  assert.equal(hasAllowedDomain(undefined, DOMAIN), false);
  assert.equal(hasAllowedDomain('', DOMAIN), false);
});

test('an empty domain allows any email', () => {
  assert.equal(hasAllowedDomain('anyone@example.com', ''), true);
});
