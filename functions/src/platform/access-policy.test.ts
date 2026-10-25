import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkEmailAccess, checkInvited, isDemoEmail } from './access-policy';

const PROD = { allowedEmailDomain: '@moderntech.co.za', demoMode: false };
const DEMO = { allowedEmailDomain: '@moderntech.co.za', demoMode: true };

test('foreign domains are refused regardless of demo mode', () => {
  assert.equal(checkEmailAccess('x@gmail.com', PROD)?.code, 'auth/domain-not-permitted');
  assert.equal(checkEmailAccess('x@gmail.com', DEMO)?.code, 'auth/domain-not-permitted');
});

test('demo accounts are refused unless demo mode is on', () => {
  const denial = checkEmailAccess('demo.admin@moderntech.co.za', PROD);
  assert.equal(denial?.code, 'auth/demo-disabled');
  assert.equal(denial?.error, 'Demo accounts are disabled in this environment.');
  assert.equal(checkEmailAccess('demo.admin@moderntech.co.za', DEMO), null);
});

test('ordinary company accounts pass the email checks', () => {
  assert.equal(checkEmailAccess('thandi@moderntech.co.za', PROD), null);
});

test('isDemoEmail matches only the demo. prefix', () => {
  assert.equal(isDemoEmail(' Demo.Agent@moderntech.co.za'), true);
  assert.equal(isDemoEmail('demographics@moderntech.co.za'), false);
  assert.equal(isDemoEmail('ademo.x@moderntech.co.za'), false);
  assert.equal(isDemoEmail(undefined), false);
});

test('accounts without a profile are not invited', () => {
  assert.equal(checkInvited(false)?.code, 'auth/not-invited');
  assert.equal(checkInvited(true), null);
});
