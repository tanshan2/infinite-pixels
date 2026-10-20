// 虚构示例债券。所有名称、代码、评级、价格均为演示用途，不对应任何真实证券。
// 接入真实数据后，由后端 /api/bonds 返回同一结构并带上真实来源与时间。

import type { BondTerms } from '../lib/finance/bond';

export type IssuerType = 'sovereign' | 'corporate' | 'financial';

export interface BondRecord {
  id: string;
  name: string;
  /** 演示代码，刻意不符合 ISIN 校验格式，避免被误认为真实证券 */
  isin: string;
  isinIsReal: boolean;
  issuer: string;
  issuerType: IssuerType;
  country: string;
  currency: 'USD';
  rating: { value: string; agency: string; asOf: string; outlook: string };
  terms: BondTerms;
  /** 首个票息重置日等，仅用于展示 */
  firstResetDate?: string;
  price: {
    clean: number;
    /** 价格时间（香港时间） */
    time: string;
    kind: 'sample' | 'indicative' | 'executable';
  };
  /** 同期限美国国债收益率（示例），用于估算利差 */
  benchmark: { label: string; yield: number; asOf: string };
  seniority: string;
  guarantee: string;
  callTerms: string;
  governingLaw: string;
  minDenomination: number;
  keyPoints: string[];
  sourceLinks: { label: string; url: string | null; note: string }[];
}

const SAMPLE_TIME = '2026-10-16 16:30 HKT';

export const SAMPLE_BONDS: BondRecord[] = [
  {
    id: 'demo-sov-2034',
    name: '示例共和国 6.25% 2034 美元主权债',
    isin: 'DEMO-SOV-0001',
    isinIsReal: false,
    issuer: '示例共和国（虚构）',
    issuerType: 'sovereign',
    country: '虚构国家 · 拉丁美洲示例',
    currency: 'USD',
    rating: { value: 'BB-', agency: '示例评级', asOf: '2026-08-12', outlook: '稳定' },
    terms: { couponRate: 0.0625, frequency: 2, maturity: '2034-03-15', structure: 'fixed-bullet' },
    price: { clean: 94.2, time: SAMPLE_TIME, kind: 'sample' },
    benchmark: { label: '7 年期美国国债（示例值）', yield: 0.041, asOf: '2026-10-16' },
    seniority: '高级无担保（Senior Unsecured）',
    guarantee: '无担保；以国家完全信用（full faith and credit）支持',
    callTerms: '不可提前赎回',
    governingLaw: '纽约州法律；含集体行动条款（CAC）',
    minDenomination: 200_000,
    keyPoints: [
      '偿债能力取决于财政收支、外汇储备和对外融资渠道，而不是单一企业的盈利。',
      '主权债违约后通常通过重组（展期、降息、削减本金）解决，没有破产清算程序。',
      '集体行动条款意味着达到法定比例的持有人同意后，重组条款对全部持有人生效。',
      '关注：外币债务占比、经常账户、IMF 计划进展、选举与政策连续性。',
    ],
    sourceLinks: [
      { label: '发行文件（Prospectus）', url: null, note: '真实债券可在上市交易所或发行人财政部网站获取' },
      { label: '评级报告', url: null, note: '真实评级以评级机构官网公告为准' },
    ],
  },
  {
    id: 'demo-energy-2029',
    name: '示例能源控股 7.50% 2029 美元债',
    isin: 'DEMO-CORP-0002',
    isinIsReal: false,
    issuer: '示例能源控股有限公司（虚构）',
    issuerType: 'corporate',
    country: '虚构国家 · 东南亚示例',
    currency: 'USD',
    rating: { value: 'B+', agency: '示例评级', asOf: '2026-05-30', outlook: '稳定' },
    terms: {
      couponRate: 0.075,
      frequency: 2,
      maturity: '2029-06-01',
      structure: 'fixed-callable',
      calls: [
        { date: '2027-06-01', price: 102 },
        { date: '2028-06-01', price: 101 },
      ],
    },
    price: { clean: 103.1, time: SAMPLE_TIME, kind: 'sample' },
    benchmark: { label: '3 年期美国国债（示例值）', yield: 0.039, asOf: '2026-10-16' },
    seniority: '高级无担保（Senior Unsecured）',
    guarantee: '由母公司及部分境外子公司提供担保；境内运营子公司不提供担保（存在结构性次级）',
    callTerms: '2027-06-01 起可按 102 赎回；2028-06-01 起可按 101 赎回',
    governingLaw: '纽约州法律',
    minDenomination: 200_000,
    keyPoints: [
      '价格高于首个赎回价时，发行人更可能提前赎回，应以最差收益率（YTW）为参考。',
      '偿债来源是经营现金流和再融资能力；关注 EBITDA 利息覆盖倍数和短期债务到期分布。',
      '境内子公司未提供担保时，美元债持有人在境内资产上的受偿顺序排在境内债权人之后。',
      '能源行业受商品价格与监管政策影响，现金流波动较大。',
    ],
    sourceLinks: [
      { label: '发行人公告', url: null, note: '真实发行人公告可在上市交易所（如香港交易所披露易）查询' },
      { label: '财务报告', url: null, note: '示例发行人无真实财务报告' },
    ],
  },
  {
    id: 'demo-prop-2027',
    name: '示例置业 9.00% 2027 美元债',
    isin: 'DEMO-CORP-0003',
    isinIsReal: false,
    issuer: '示例置业集团（虚构）',
    issuerType: 'corporate',
    country: '虚构国家 · 东亚示例',
    currency: 'USD',
    rating: { value: 'CCC', agency: '示例评级', asOf: '2026-09-28', outlook: '负面' },
    terms: { couponRate: 0.09, frequency: 2, maturity: '2027-09-20', structure: 'fixed-bullet' },
    price: { clean: 62.0, time: SAMPLE_TIME, kind: 'sample' },
    benchmark: { label: '1 年期美国国债（示例值）', yield: 0.037, asOf: '2026-10-16' },
    seniority: '高级无担保（Senior Unsecured）',
    guarantee: '由部分境外子公司提供担保',
    callTerms: '不可提前赎回',
    governingLaw: '纽约州法律',
    minDenomination: 200_000,
    keyPoints: [
      '价格远低于面值时，计算出的到期收益率假设“全部按时足额支付”，这正是市场在怀疑的事。',
      '此时更应关注：现金与短期债务对比、是否已有展期或重组安排、预期回收率。',
      '高收益率是对违约风险的补偿，不是确定的回报。',
    ],
    sourceLinks: [{ label: '信用事件公告', url: null, note: '见信息中心“信用事件”演示条目' }],
  },
  {
    id: 'demo-bank-at1',
    name: '示例银行 8.00% 永续 AT1 资本债',
    isin: 'DEMO-FIN-0004',
    isinIsReal: false,
    issuer: '示例商业银行（虚构）',
    issuerType: 'financial',
    country: '虚构国家 · 中东示例',
    currency: 'USD',
    rating: { value: 'B', agency: '示例评级', asOf: '2026-04-15', outlook: '稳定' },
    terms: { couponRate: 0.08, frequency: 2, maturity: '', structure: 'perpetual-reset' },
    firstResetDate: '2031-04-15',
    price: { clean: 98.5, time: SAMPLE_TIME, kind: 'sample' },
    benchmark: { label: '5 年期美国国债（示例值）', yield: 0.04, asOf: '2026-10-16' },
    seniority: '额外一级资本（AT1），次级于高级债与二级资本债',
    guarantee: '无担保',
    callTerms: '首个重置日起每个付息日可按面值赎回；票息可被发行人取消且不累积；触发条件下可减记',
    governingLaw: '英国法律（示例）',
    minDenomination: 200_000,
    keyPoints: [
      '无固定到期日，是否赎回由发行人决定；票息可以被取消且不补发。',
      '监管资本比率低于触发线时，本金可能被减记或转股。',
      '平台暂不支持对此结构计算收益率与久期，请由专业人士逐条解读条款。',
    ],
    sourceLinks: [{ label: '发行文件（风险因素章节）', url: null, note: 'AT1 条款以发行文件为准' }],
  },
];

export const ISSUER_TYPE_LABEL: Record<IssuerType, string> = {
  sovereign: '主权债',
  corporate: '企业债',
  financial: '金融机构资本债',
};

export const PRICE_KIND_LABEL: Record<BondRecord['price']['kind'], string> = {
  sample: '示例价格 · 非报价',
  indicative: '参考价 · 不可成交',
  executable: '可成交报价',
};

export function findBond(id: string | null | undefined): BondRecord | undefined {
  return SAMPLE_BONDS.find((b) => b.id === id);
}
