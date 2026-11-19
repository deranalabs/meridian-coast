// Unit tests for the dialogue card's name colour: dark faction accents are lifted so the name reads on the card.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readableName } from './dialoguecard.js';

const luma = (hex) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
};

test('bright accents such as the gold keep their colour', () => {
  assert.equal(readableName('#ffc94a'), '#ffc94a');
});

test('police navy and other dark accents are lifted toward white but keep their hue', () => {
  for (const hex of ['#1e3a8a', '#16203a', '#3b6bff', '#000000']) {
    const lifted = readableName(hex);
    assert.ok(luma(lifted) >= 0.42, `${hex} became ${lifted}, still too dark`);
    assert.notEqual(lifted, '#ffffff');
  }
  const navy = Number.parseInt(readableName('#1e3a8a').slice(1), 16);
  assert.ok((navy & 255) > ((navy >> 16) & 255), 'navy stays blue');
});
