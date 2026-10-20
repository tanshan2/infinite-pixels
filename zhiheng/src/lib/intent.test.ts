import { describe, expect, it } from 'vitest';
import { classifyQuestion, EXAMPLE_QUESTIONS } from './intent';

describe('问题分流', () => {
  it('示例问题分别命中三个模板', () => {
    expect(EXAMPLE_QUESTIONS.map(classifyQuestion)).toEqual(['reserve', 'coupon-yield', 'rate-impact']);
  });
  it('无法匹配时返回 unknown，而不是猜测', () => {
    expect(classifyQuestion('帮我看看比特币')).toBe('unknown');
  });
});
