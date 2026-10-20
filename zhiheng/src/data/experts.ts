// 专家领域与资质说明。当前没有任何专家真实入驻，因此不包含人物、评价或可预约时段。

export type ExpertDomain = 'hk-family' | 'cross-border-tax' | 'insurance' | 'usd-bond';

export interface DomainInfo {
  id: ExpertDomain;
  name: string;
  helpsWith: string[];
  /** 在香港提供该类服务通常涉及的牌照或执业资格 */
  localCredentials: { name: string; regulator: string; verifyUrl: string | null }[];
  /** 常见的专业资格，本身不构成当地业务许可 */
  professionalTitles: string[];
  feeQuestions: string[];
}

export const EXPERT_DOMAINS: DomainInfo[] = [
  {
    id: 'hk-family',
    name: '香港家庭财务',
    helpsWith: ['落地资金与备用金安排', '家庭收支与现金流规划', '强积金与退休储备的基础梳理'],
    localCredentials: [
      { name: '证监会持牌代表（如涉及就证券提供意见，第 4 类受规管活动）', regulator: '证券及期货事务监察委员会', verifyUrl: 'https://apps.sfc.hk/publicregWeb/' },
      { name: '强积金中介人（如涉及强积金产品）', regulator: '强制性公积金计划管理局', verifyUrl: 'https://www.mpfa.org.hk' },
    ],
    professionalTitles: ['CFP（认可财务策划师）', 'CFA'],
    feeQuestions: ['按小时收费还是按方案收费？', '是否会推荐具体产品？推荐产品是否收取佣金或返佣？'],
  },
  {
    id: 'cross-border-tax',
    name: '跨境税务',
    helpsWith: ['内地与香港税务居民身份判断', '两地收入与境外所得申报', '个人资产跨境转移的税务影响'],
    localCredentials: [
      { name: '香港执业会计师（CPA (practising)）', regulator: '香港会计专业局', verifyUrl: 'https://www.hkicpa.org.hk' },
      { name: '内地税务师／注册会计师（处理内地申报部分）', regulator: '内地行业主管机构', verifyUrl: null },
    ],
    professionalTitles: ['CTA（香港税务学会资深会员）', 'ACCA'],
    feeQuestions: ['是否同时熟悉两地规则？如只熟悉一地，另一地由谁负责？', '收费是否包含申报代办？'],
  },
  {
    id: 'insurance',
    name: '保险',
    helpsWith: ['医疗与危疾保障缺口梳理', '已有内地保单与香港保单的衔接', '储蓄型保单条款解读'],
    localCredentials: [
      { name: '持牌保险中介人（代理人或经纪）', regulator: '保险业监管局', verifyUrl: 'https://iir.ia.org.hk' },
    ],
    professionalTitles: ['CFP', 'FLMI'],
    feeQuestions: ['您代表保险公司（代理人）还是代表客户（经纪）？', '收入是否主要来自产品佣金？'],
  },
  {
    id: 'usd-bond',
    name: '美元债与信用分析',
    helpsWith: ['单只债券条款与风险逐条解读', '发行人信用与债务顺位分析', '持仓利率与信用风险复核'],
    localCredentials: [
      { name: '证监会持牌代表（第 1 类证券交易 / 第 4 类就证券提供意见）', regulator: '证券及期货事务监察委员会', verifyUrl: 'https://apps.sfc.hk/publicregWeb/' },
    ],
    professionalTitles: ['CFA', 'FRM'],
    feeQuestions: ['是否所在机构自营或承销该债券（利益冲突）？', '咨询后是否通过您所在机构成交？成交是否有佣金？'],
  },
];

export const BOOKING_STEPS = [
  { id: 'question', name: '问题整理', available: true },
  { id: 'expert', name: '专家选择', available: false },
  { id: 'time', name: '时间选择', available: false },
  { id: 'fee', name: '费用确认', available: false },
  { id: 'consent', name: '资料共享授权', available: true },
  { id: 'confirm', name: '预约确认', available: false },
  { id: 'record', name: '咨询记录', available: false },
] as const;
