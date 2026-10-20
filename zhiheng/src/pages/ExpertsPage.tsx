import { PageTitle } from '../components/PageTitle';
import { useId, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BOOKING_STEPS, EXPERT_DOMAINS, type ExpertDomain } from '../data/experts';
import { submitConsultIntent, type ConsultIntent } from '../api/services';
import { useAppState } from '../state/AppState';
import { computePlan } from '../lib/finance/planning';
import { money } from '../lib/format';
import { SAMPLE_BONDS } from '../data/sampleBonds';
import { StatusBadge } from '../components/Badges';
import { EMBED } from '../env';

const LANGS = ['普通话', '粤语', '英语'];
const SHARE_ITEMS = [
  { id: 'plan', label: '落地资金规划的参数与结果' },
  { id: 'bonds', label: '我关注的债券（当前为示例债券）' },
];

export function ExpertsPage() {
  const [params, setParams] = useSearchParams();
  const domainParam = params.get('domain') as ExpertDomain | null;
  const domain = EXPERT_DOMAINS.find((d) => d.id === domainParam) ?? EXPERT_DOMAINS[0];
  const { plan, planIsSample } = useAppState();
  const fid = useId();

  const [question, setQuestion] = useState('');
  const [langs, setLangs] = useState<string[]>(['普通话']);
  const [region, setRegion] = useState('香港');
  const [budget, setBudget] = useState('未定');
  const [commission, setCommission] = useState<ConsultIntent['acceptCommission']>('no');
  const [share, setShare] = useState<string[]>([]);
  const [contact, setContact] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sheet, setSheet] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<{ status: 'idle' | 'loading' | 'done'; ok?: boolean; text?: string }>({ status: 'idle' });

  const planSummary = useMemo(() => {
    const r = computePlan(plan);
    return `规划期 ${plan.horizonMonths} 个月；月支出 ${money(r.monthlyExpenseHKD)}；月收入 ${money(plan.monthlyIncomeHKD)}（第 ${plan.incomeStartMonth + 1} 个月起）；备用金 ${money(r.reserveHKD)}；总需求 ${money(r.totalNeedHKD)}；${r.unallocatedHKD >= 0 ? '未分配' : '缺口'} ${money(Math.abs(r.unallocatedHKD))}${planIsSample ? '（示例参数）' : ''}`;
  }, [plan, planIsSample]);

  const validate = (needContact: boolean) => {
    const e: Record<string, string> = {};
    const q = question.trim();
    if (q.length < 10) e.question = '请至少用 10 个字描述问题和背景。';
    if (q.length > 1000) e.question = '请控制在 1000 字以内。';
    if (langs.length === 0) e.langs = '请至少选择一种语言。';
    if (needContact) {
      const c = contact.trim();
      if (!c) e.contact = '登记意向需要联系方式。';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c) && !/^\+?[\d\s-]{8,16}$/.test(c)) e.contact = '请输入有效的邮箱或电话号码。';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildSheet = () => {
    const lines = [
      '知衡 · 咨询准备单',
      `生成时间：${new Date().toLocaleString('zh-CN', { hour12: false })}`,
      '状态：仅为准备材料，尚未预约任何专家。',
      '',
      `咨询领域：${domain.name}`,
      `希望使用的语言：${langs.join('、')}`,
      `服务地区：${region}`,
      `预算：${budget}`,
      `是否接受收取产品佣金的顾问：${commission === 'no' ? '不接受' : commission === 'yes' ? '接受，但需事先书面披露' : '未确定'}`,
      '',
      '【我的问题】',
      question.trim(),
      '',
      '【请顾问回答的资质问题】',
      ...domain.localCredentials.map((c) => `- 是否持有：${c.name}（监管机构：${c.regulator}）`),
      ...domain.feeQuestions.map((q) => `- ${q}`),
      '',
      '【授权共享的资料】',
      ...(share.length === 0 ? ['（未授权共享任何平台资料）'] : []),
      ...(share.includes('plan') ? [`落地资金规划：${planSummary}`] : []),
      ...(share.includes('bonds') ? [`关注的债券：${SAMPLE_BONDS.slice(0, 3).map((b) => b.name).join('；')}（虚构示例）`] : []),
      '',
      '提示：CFA、CFP 等专业资格不等于香港的业务牌照；请在监管机构公开名册中核实。',
    ];
    return lines.join('\n');
  };

  const onGenerate = (e: FormEvent) => {
    e.preventDefault();
    if (!validate(false)) return;
    setSheet(buildSheet());
    setCopied(null);
    requestAnimationFrame(() => document.getElementById('prep-sheet')?.focus());
  };

  const onRegister = async () => {
    if (!validate(true)) return;
    setSubmitState({ status: 'loading' });
    const r = await submitConsultIntent({
      domain: domain.id,
      question: question.trim(),
      languages: langs,
      region,
      budget,
      acceptCommission: commission,
      shareItems: share,
      contact: contact.trim(),
    });
    setSubmitState(r.ok ? { status: 'done', ok: true, text: `意向已登记，编号 ${r.reference}。这不是预约，专家确认后才会安排时间。` } : { status: 'done', ok: false, text: r.reason });
  };

  const download = () => {
    if (!sheet) return;
    const url = URL.createObjectURL(new Blob([sheet], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `知衡-咨询准备单-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [copied, setCopied] = useState<string | null>(null);
  const copy = async () => {
    if (!sheet) return;
    try {
      await navigator.clipboard.writeText(sheet);
      setCopied('已复制到剪贴板。');
    } catch {
      const range = document.createRange();
      const el = document.getElementById('prep-sheet');
      if (el) {
        range.selectNodeContents(el);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
      }
      setCopied('无法直接复制，已选中全文，请手动复制。');
    }
  };

  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <>
      <PageTitle
        section="真人一对一"
        title="专家咨询"
        desc="按领域分流。入驻专家须公开资质、所属机构、服务地区、语言、费用，以及是否收取产品佣金。"
        meta={[<span className="tag" key="t">未开放预约</span>, '目前无专家入驻', '不展示虚构人物、评价或时段', '可生成咨询准备单']}
      />

      <p className="small muted" style={{ marginBottom: 8 }}>咨询领域</p>
      <div className="tabs" role="tablist" aria-label="咨询领域">
        {EXPERT_DOMAINS.map((d) => (
          <button key={d.id} type="button" role="tab" aria-selected={d.id === domain.id} onClick={() => setParams({ domain: d.id })}>
            {d.name}
          </button>
        ))}
      </div>

      <p>服务范围：{domain.helpsWith.join('；')}。</p>
      <div className="acc-group plain" style={{ marginTop: 12 }}>
        <details className="acc">
          <summary>资质与利益冲突核查</summary>
          <div className="acc-body grid-2">
            <div>
              <h3 style={{ fontSize: '1rem' }}>在香港应具备的许可</h3>
              <ul className="plain-list">
                {domain.localCredentials.map((c) => (
                  <li key={c.name} className="small">
                    {c.name}
                    <div className="muted">
                      {c.regulator}
                      {c.verifyUrl && <> · <a href={c.verifyUrl} target="_blank" rel="noreferrer noopener">查询公开名册<span className="visually-hidden">（在新窗口打开）</span></a></>}
                    </div>
                  </li>
                ))}
              </ul>
              <p className="small muted">{domain.professionalTitles.join('、')} 等是专业资格，本身不等于在香港开展该业务的牌照。</p>
            </div>
            <div>
              <h3 style={{ fontSize: '1rem' }}>费用与利益冲突，先问清楚</h3>
              <ul>{domain.feeQuestions.map((q) => <li key={q}>{q}</li>)}</ul>
              <p className="small muted">专家资料应公开：资质、所属机构、服务地区、语言、费用，以及是否收取产品佣金。</p>
            </div>
          </div>
        </details>
      </div>

      <section className="section" aria-labelledby="flow">
        <h2 id="flow">咨询准备单</h2>
        <p className="small muted">
          完整流程是：{BOOKING_STEPS.map((st) => st.name).join(' → ')}。目前开放“问题整理”和“资料共享授权”，其余步骤要等专家入驻后才开放。
        </p>
        <form onSubmit={onGenerate} noValidate aria-label="咨询准备单" className="panel">
          <div className="field">
            <label htmlFor={`${fid}-q`}>你的问题和背景</label>
            <textarea
              id={`${fid}-q`}
              value={question}
              maxLength={1100}
              aria-invalid={errors.question ? true : undefined}
              aria-describedby={`${fid}-qh${errors.question ? ` ${fid}-qe` : ''}`}
              placeholder="例如：明年 3 月一家三口赴港，持有约 60 万人民币。想确认备用金是否足够，以及人民币分几次兑换更稳妥。"
              onChange={(e) => setQuestion(e.target.value)}
            />
            <span id={`${fid}-qh`} className="hint">{question.trim().length}/1000 字。不要填写身份证号、账户号码或密码。</span>
            {errors.question && <span id={`${fid}-qe`} className="error" role="alert">{errors.question}</span>}
          </div>

          <details className="form-acc" open={errors.langs ? true : undefined}>
            <summary><b>语言、地区、预算与佣金偏好</b><span>{langs.join('、') || '未选'} · {region} · {budget}</span></summary>
            <div className="form-acc-body">
          <div className="grid-2" style={{ gap: 16 }}>
            <fieldset className="field">
              <legend>语言</legend>
              {LANGS.map((l) => (
                <label key={l} className="check"><input type="checkbox" checked={langs.includes(l)} onChange={() => setLangs(toggle(langs, l))} />{l}</label>
              ))}
              {errors.langs && <span className="error" role="alert">{errors.langs}</span>}
            </fieldset>
            <div>
              <div className="field">
                <label htmlFor={`${fid}-r`}>服务地区</label>
                <select id={`${fid}-r`} value={region} onChange={(e) => setRegion(e.target.value)}>
                  <option>香港</option><option>内地</option><option>两地均可</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor={`${fid}-b`}>预算</label>
                <select id={`${fid}-b`} value={budget} onChange={(e) => setBudget(e.target.value)}>
                  <option>未定</option><option>HK$1,000 以下</option><option>HK$1,000–3,000</option><option>HK$3,000 以上</option>
                </select>
              </div>
            </div>
          </div>

          <fieldset className="field">
            <legend>是否接受收取产品佣金的顾问？</legend>
            {([['no', '不接受，只找按服务收费的顾问'], ['yes', '接受，但需事先书面披露佣金'], ['unsure', '还不确定']] as const).map(([v, l]) => (
              <label key={v} className="check"><input type="radio" name={`${fid}-c`} checked={commission === v} onChange={() => setCommission(v)} />{l}</label>
            ))}
          </fieldset>

            </div>
          </details>

          <fieldset className="field" style={{ marginTop: 16 }}>
            <legend>资料共享授权（默认不共享）</legend>
            {SHARE_ITEMS.map((s) => (
              <label key={s.id} className="check"><input type="checkbox" checked={share.includes(s.id)} onChange={() => setShare(toggle(share, s.id))} />{s.label}</label>
            ))}
            <span className="hint">勾选的内容只会写进准备单；专家服务未接入，不会发送给任何人。</span>
          </fieldset>

          <div className="btn-row">
            <button type="submit" className="btn">生成咨询准备单</button>
          </div>

          <details className="form-acc" style={{ marginTop: 20 }} open={errors.contact || submitState.status !== 'idle' ? true : undefined}>
            <summary><b>登记咨询意向</b><span>专家入驻后通知</span></summary>
            <div className="form-acc-body">
              <p className="small muted">登记不等于预约。服务未接入前，意向不会发送给任何人。</p>
              <div className="field" style={{ maxWidth: 420 }}>
                <label htmlFor={`${fid}-ct`}>联系方式</label>
                <input
                  id={`${fid}-ct`}
                  type="text"
                  autoComplete="email"
                  value={contact}
                  aria-invalid={errors.contact ? true : undefined}
                  aria-describedby={errors.contact ? `${fid}-cte` : undefined}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="邮箱或电话"
                />
                {errors.contact && <span id={`${fid}-cte`} className="error" role="alert">{errors.contact}</span>}
              </div>
              <button type="button" className="btn secondary" onClick={onRegister} disabled={submitState.status === 'loading'}>
                {submitState.status === 'loading' ? <><span className="spinner" aria-hidden="true" /> 正在提交…</> : '登记咨询意向'}
              </button>
            </div>
          </details>
          <div aria-live="polite" style={{ marginTop: 12 }}>
            {submitState.status === 'done' && (
              <p className={`notice ${submitState.ok ? 'success' : 'error'}`}>
                {submitState.ok ? '' : '登记未完成：'}{submitState.text}
              </p>
            )}
          </div>
        </form>

        {sheet && (
          <div style={{ marginTop: 20 }}>
            <div className="btn-row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>咨询准备单 <StatusBadge status="unconnected" label="未预约" /></h3>
              <div className="btn-row no-print">
                <button type="button" className="btn secondary" onClick={copy}>复制全文</button>
                {!EMBED && <button type="button" className="btn secondary" onClick={download}>下载 .txt</button>}
                {!EMBED && <button type="button" className="btn ghost" onClick={() => window.print()}>打印</button>}
              </div>
            </div>
            {copied && <p className="small muted" role="status">{copied}</p>}
            <div id="prep-sheet" className="prep-sheet" tabIndex={-1}>{sheet}</div>
          </div>
        )}
      </section>

      <section className="section" aria-labelledby="records">
        <h2 id="records">咨询记录</h2>
        <p className="muted">暂无咨询记录。预约服务开放后，完成的咨询摘要与专家披露信息会保存在这里，并可随时删除。</p>
      </section>
    </>
  );
}
