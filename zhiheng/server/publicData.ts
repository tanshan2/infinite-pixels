import { XMLParser } from 'fast-xml-parser';
import type { TreasuryCurve } from '../src/data/publicBonds';
export const TREASURY_URL='https://home.treasury.gov/sites/default/files/interest-rates/yield.xml';
export function parseTreasury(xml:string,today:string):TreasuryCurve {
  if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('DTD unsupported');
  const parsed=new XMLParser({removeNSPrefix:true,ignoreAttributes:false,parseTagValue:false}).parse(xml);
  const raw=parsed?.feed?.entry;const entries=Array.isArray(raw)?raw:raw?[raw]:[];
  const tenors:[string,string,number][]=[['BC_1MONTH','1个月',1/12],['BC_3MONTH','3个月',.25],['BC_6MONTH','6个月',.5],['BC_1YEAR','1年',1],['BC_2YEAR','2年',2],['BC_3YEAR','3年',3],['BC_5YEAR','5年',5],['BC_7YEAR','7年',7],['BC_10YEAR','10年',10],['BC_20YEAR','20年',20],['BC_30YEAR','30年',30]];
  const rows=entries.flatMap((e:{content?:{properties?:Record<string,unknown>}})=>{const p=e.content?.properties;if(!p)return [];const date=String(p.NEW_DATE??'').slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date>today)return [];
    const points=tenors.flatMap(([key,tenor,years])=>{const v=p[key];if(v===null||v===undefined||v===''||typeof v==='object')return [];const n=Number(v);return Number.isFinite(n)&&n>=0&&n<=100?[{tenor,years,yield:n/100}]:[];});return points.length?[{date,points,sourceUrl:TREASURY_URL}]:[];});
  rows.sort((a,b)=>b.date.localeCompare(a.date));if(!rows[0])throw Error('No valid Treasury rates');return rows[0];
}
