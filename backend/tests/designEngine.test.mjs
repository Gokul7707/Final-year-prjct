import assert from 'node:assert/strict';
import { planAlternatives } from '../src/jobs/designEngine.ts';

const baseBrief = {
  application: 'freestyle',
  payloadG: 200,
  flightTimeMin: 5,
  budgetInr: 30000,
  material: 'carbon',
  manufacturing: '3d-print',
  notes: '',
};

const heavyBrief = {
  ...baseBrief,
  payloadG: 700,
  flightTimeMin: 12,
  budgetInr: 120000,
  notes: 'carry a heavy camera and quiet ducts',
};

const lightBrief = {
  ...baseBrief,
  payloadG: 80,
  flightTimeMin: 3,
  budgetInr: 18000,
  notes: 'tight indoor racing',
};

const heavyVariants = planAlternatives(heavyBrief).map((alt) => alt.partIds);
const lightVariants = planAlternatives(lightBrief).map((alt) => alt.partIds);

assert.notDeepStrictEqual(heavyVariants, lightVariants, 'planner should produce different variants for different briefs');
console.log('designEngine brief-aware variants passed');
