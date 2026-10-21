// Manually checked public issuer facts. Missing fields stay null; never manufacture a quote.
export interface PublicBond {
  id:string; name:string; issuer:string; market:string; currency:'USD'; isin:string|null;
  couponRate:number; maturity:string|null; maturityYear:number;
  marketPrice:null; source:string; sourceUrl:string; checkedOn:string; note:string;
}
const hk='https://www.hkgb.gov.hk/en/greenbond/institutionaloutstanding.html';
const ph='https://www.treasury.gov.ph/wp-content/uploads/2025/11/Mid-Year-Debt-Report-FY-2025.pdf';
export const PUBLIC_BONDS:PublicBond[]=[
  ...([
    ['hk-usd-2028','USY3422VCV81',.045,'2028-01-11'],
    ['hk-usd-2033','USY3422VCW64',.04625,'2033-01-11'],
    ['hk-usd-2027','USY3422VDC91',.0425,'2027-07-24'],
    ['hk-usd-2030','USY3422VDD74',.04125,'2030-06-10'],
  ] as const).map(([id,isin,couponRate,maturity])=>({id,isin,couponRate,maturity,maturityYear:Number(maturity.slice(0,4)),name:`香港政府 ${(couponRate*100).toFixed(3)}% ${maturity.slice(0,4)} 美元绿色债券`,issuer:'香港特别行政区政府',market:'香港政府美元债（非新兴市场债分类）',currency:'USD' as const,marketPrice:null,source:'香港政府债券网站 · 未偿还债券表',sourceUrl:hk,checkedOn:'2026-10-20',note:'仅摘录票息、到期日和 Reg S ISIN；没有市场价格。付息频率、赎回条款和计息规则须核对发行文件。'})),
  ...([{id:'ph-2035',couponRate:.055,maturityYear:2035},{id:'ph-2050',couponRate:.059,maturityYear:2050}]).map(v=>({...v,name:`菲律宾共和国 ${(v.couponRate*100).toFixed(2)}% ${v.maturityYear} 美元全球债`,issuer:'菲律宾共和国',market:'新兴市场主权美元债',currency:'USD' as const,isin:null,maturity:null,marketPrice:null,source:'菲律宾国库局 · 2025年中债务报告，表10',sourceUrl:ph,checkedOn:'2026-10-20',note:'报告确认美元计价、票息及到期年份；具体到期日、ISIN 与完整条款未核实，暂不计算收益率。'})),
];
export interface TreasuryCurve {date:string;points:{tenor:string;years:number;yield:number}[];sourceUrl:string}
