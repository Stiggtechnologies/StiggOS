import { afterEach, describe, expect, it } from 'vitest';
import { getProvider, resetProviderForTests } from '../src/provider.js';

afterEach(() => {
  resetProviderForTests();
  delete process.env.LLM_PROVIDER;
  delete process.env.AI_FORCE_MOCK;
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_BASE_URL;
  delete process.env.GOOGLE_API_KEY;
});

describe('provider auto-selection', () => {
  it('falls back to mock when nothing is set', () => {
    expect(getProvider().name).toBe('mock');
  });

  it('honours AI_FORCE_MOCK even with keys present', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-x';
    process.env.AI_FORCE_MOCK = '1';
    expect(getProvider().name).toBe('mock');
  });

  it('prefers anthropic when its key is set', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-x';
    expect(getProvider().name).toBe('anthropic');
  });

  it('prefers openai when its key is set and no anthropic', () => {
    process.env.OPENAI_API_KEY = 'sk-x';
    expect(getProvider().name).toBe('openai');
  });

  it('uses openai_compatible when only OPENAI_BASE_URL is set', () => {
    process.env.OPENAI_BASE_URL = 'http://localhost:11434/v1';
    expect(getProvider().name).toBe('openai_compatible');
  });

  it('uses google when only google key is set', () => {
    process.env.GOOGLE_API_KEY = 'g-x';
    expect(getProvider().name).toBe('google');
  });

  it('throws when forced provider lacks its key', () => {
    process.env.LLM_PROVIDER = 'anthropic';
    expect(() => getProvider()).toThrow(/ANTHROPIC_API_KEY/);
  });

  it('throws when openai_compatible is forced without a base URL', () => {
    process.env.LLM_PROVIDER = 'openai_compatible';
    expect(() => getProvider()).toThrow(/OPENAI_BASE_URL/);
  });
});
