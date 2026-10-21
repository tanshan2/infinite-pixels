import { describe, expect, it } from 'vitest';
import { parseTreasury } from './publicData';
import { PUBLIC_BONDS } from '../src/data/publicBonds';
const entry=(date:string,rate:string)=>`<entry><content><m:properties><d:NEW_DATE>${date}T00:00:00</d:NEW_DATE><d:BC_5YEAR>${rate}</d:BC_5YEAR><d:BC_10YEAR m:null="true"/></m:properties></content></entry>`;
describe('free official data',()=>{
  it('selects latest non-future observation and converts percent to decimal',()=>{const xml=`<feed>${entry('2026-10-19','4.10')}${entry('2026-10-20','4.20')}${entry('2026-10-21','4.30')}</feed>`;const r=parseTreasury(xml,'2026-10-20');expect(r.date).toBe('2026-10-20');expect(r.points).toHaveLength(1);expect(r.points[0].yield).toBe(.042);});
  it('does not turn missing values into zero and rejects malformed feeds',()=>{expect(()=>parseTreasury(`<feed>${entry('2026-10-20','')}</feed>`,'2026-10-20')).toThrow();expect(()=>parseTreasury('<!DOCTYPE x><feed/>','2026-10-20')).toThrow();});
  it('keeps every real market price absent and incomplete dates explicit',()=>{expect(PUBLIC_BONDS.every(b=>b.marketPrice===null&&b.sourceUrl.startsWith('https://'))).toBe(true);expect(PUBLIC_BONDS.filter(b=>b.issuer==='菲律宾共和国').every(b=>b.maturity===null)).toBe(true);});
});
