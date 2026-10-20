import { useMemo, useRef, useState, type FormEvent } from 'react';
import { NumberField } from '../components/NumberField';
import { ReserveResult } from '../components/results/ReserveResult';
import { StatusBadge } from '../components/Badges';
import { useAppState } from '../state/AppState';
import { CURRENCIES, validatePlan, type Currency, type PlanInput } from '../lib/finance/planning';
import { DEFAULT_FX_NOTE, DEFAULT_PLAN } from '../data/defaultPlan';

let seq = 0;
const newId = (p: string) => `${p}-${Date.now().toString(36)}-${seq++}`;

export function PlanPage() {
  const { plan, planIsSample, setPlan, resetPlan } = useAppState();
  const [draft, setDraft] = useState<PlanInput>(plan);
  const [showErrors, setShowErrors] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  const issues = useMemo(() => validatePlan(draft), [draft]);
  const err = (field: string) => (showErrors ? issues.find((i) => i.field === field)?.message : undefined);
  const dirty = JSON.stringify(draft) !== JSON.stringify(plan);

  const update = (patch: Partial<PlanInput>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setMessage(null);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (issues.length) {
      setShowErrors(true);
      setMessage({ type: 'error', text: `有 ${issues.length} 处输入需要修改，结果未更新。` });
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setShowErrors(false);
    setPlan(draft);
    setMessage({ type: 'success', text: '已按新参数重新计算。右侧（手机端为下方）结果已更新。' });
  };

  const reset = () => {
    resetPlan();
    setDraft(DEFAULT_PLAN);
    setShowErrors(false);
    setMessage({ type: 'success', text: '已恢复示例参数。' });
  };

  return (
    <>
      <header className="page-head">
        <p className="eyebrow">香港落地资金规划</p>
        <h1>赴港第一年，需要准备多少钱</h1>
        <p>
          填写家庭的资金、收入和支出，计算收支缺口、备用金和各币种需求。剩余资金只标为“未分配”，它不等于适合投资的金额。
        </p>
        <p className="btn-row small">
          <StatusBadge status="sample" label={planIsSample ? '当前为示例家庭参数' : '当前为你的输入'} />
          <span className="muted">数字只在本页内存中计算，刷新后清除，不保存、不上传。</span>
          <button type="button" className="btn ghost" onClick={() => document.getElementById('plan-result')?.scrollIntoView({ behavior: 'smooth' })}>
            直接看结果 ↓
          </button>
        </p>
      </header>

      <div className="split">
        <form ref={formRef} id="plan-form" onSubmit={submit} noValidate className="panel" aria-label="规划参数">
          {showErrors && issues.length > 0 && (
            <div ref={summaryRef} tabIndex={-1} className="notice error" role="alert" style={{ marginBottom: 16 }}>
              <p><b>请修改以下输入：</b></p>
              <ul style={{ margin: 0 }}>{issues.map((i) => <li key={i.field}>{i.message}</li>)}</ul>
            </div>
          )}

          <h3 className="form-group-title">可用资金</h3>
          {CURRENCIES.map((c) => (
            <NumberField
              key={c}
              label={`${c === 'HKD' ? '港元' : c === 'CNY' ? '人民币' : '美元'}资金`}
              prefix={c}
              value={draft.holdings[c]}
              min={0}
              step={1000}
              error={err(`holdings.${c}`)}
              onChange={(v) => update({ holdings: { ...draft.holdings, [c]: v } })}
            />
          ))}

          <h3 className="form-group-title">收入</h3>
          <NumberField label="家庭税后月收入" prefix="HKD" value={draft.monthlyIncomeHKD} min={0} step={1000} error={err('monthlyIncomeHKD')} onChange={(v) => update({ monthlyIncomeHKD: v })} />
          <NumberField
            label="抵港后多少个月开始有收入"
            suffix="个月"
            value={draft.incomeStartMonth}
            min={0}
            step={1}
            hint="0 表示第一个月即有收入；这段时间按全部支出计算"
            error={err('incomeStartMonth')}
            onChange={(v) => update({ incomeStartMonth: v })}
          />

          <h3 className="form-group-title">每月家庭支出（港元）</h3>
          {draft.expenses.map((e, i) => (
            <div className="line-item two" key={e.id}>
              <div className="li-label">
                <label className="visually-hidden" htmlFor={`${e.id}-l`}>支出项目名称</label>
                <input id={`${e.id}-l`} type="text" maxLength={30} value={e.label} onChange={(ev) => {
                  const next = [...draft.expenses];
                  next[i] = { ...e, label: ev.target.value };
                  update({ expenses: next });
                }} />
              </div>
              <NumberField hideLabel label={`${e.label || '支出'}金额（港元/月）`} value={e.monthlyHKD} min={0} step={500} error={err(`expense.${e.id}`)} onChange={(v) => {
                const next = [...draft.expenses];
                next[i] = { ...e, monthlyHKD: v };
                update({ expenses: next });
              }} />
              <button type="button" className="icon-btn" aria-label={`删除支出项：${e.label}`} onClick={() => update({ expenses: draft.expenses.filter((x) => x.id !== e.id) })}>×</button>
            </div>
          ))}
          <button type="button" className="btn ghost" onClick={() => update({ expenses: [...draft.expenses, { id: newId('exp'), label: '其他支出', monthlyHKD: 0 }] })}>
            ＋ 添加支出项
          </button>

          <h3 className="form-group-title">一次性搬迁与落地成本</h3>
          {draft.oneOffCosts.map((c, i) => (
            <div className="line-item" key={c.id}>
              <div className="li-label">
                <label className="visually-hidden" htmlFor={`${c.id}-l`}>成本项目名称</label>
                <input id={`${c.id}-l`} type="text" maxLength={30} value={c.label} onChange={(ev) => {
                  const next = [...draft.oneOffCosts];
                  next[i] = { ...c, label: ev.target.value };
                  update({ oneOffCosts: next });
                }} />
              </div>
              <NumberField hideLabel label={`${c.label || '成本'}金额`} value={c.amount} min={0} step={1000} error={err(`oneoff.${c.id}`)} onChange={(v) => {
                const next = [...draft.oneOffCosts];
                next[i] = { ...c, amount: v };
                update({ oneOffCosts: next });
              }} />
              <div>
                <label className="visually-hidden" htmlFor={`${c.id}-c`}>币种</label>
                <select id={`${c.id}-c`} value={c.currency} onChange={(ev) => {
                  const next = [...draft.oneOffCosts];
                  next[i] = { ...c, currency: ev.target.value as Currency };
                  update({ oneOffCosts: next });
                }}>
                  {CURRENCIES.map((x) => <option key={x}>{x}</option>)}
                </select>
              </div>
              <button type="button" className="icon-btn" aria-label={`删除成本项：${c.label}`} onClick={() => update({ oneOffCosts: draft.oneOffCosts.filter((x) => x.id !== c.id) })}>×</button>
            </div>
          ))}
          <button type="button" className="btn ghost" onClick={() => update({ oneOffCosts: [...draft.oneOffCosts, { id: newId('one'), label: '其他一次性支出', amount: 0, currency: 'HKD' }] })}>
            ＋ 添加成本项
          </button>

          <h3 className="form-group-title">期限与汇率假设</h3>
          <div className="grid-2" style={{ gap: 12 }}>
            <NumberField label="规划期" suffix="个月" value={draft.horizonMonths} min={1} max={60} error={err('horizonMonths')} onChange={(v) => update({ horizonMonths: v })} />
            <NumberField label="备用金覆盖" suffix="个月" value={draft.reserveMonths} min={0} max={36} hint="常见做法为 3–12 个月" error={err('reserveMonths')} onChange={(v) => update({ reserveMonths: v })} />
            <NumberField label="1 人民币 =" suffix="港元" step={0.001} value={draft.fx.CNYHKD} error={err('fx.CNYHKD')} onChange={(v) => update({ fx: { ...draft.fx, CNYHKD: v } })} />
            <NumberField label="1 美元 =" suffix="港元" step={0.001} value={draft.fx.USDHKD} error={err('fx.USDHKD')} onChange={(v) => update({ fx: { ...draft.fx, USDHKD: v } })} />
          </div>
          <NumberField label="人民币兑换的汇率缓冲" suffix="%" percent step={0.5} value={draft.fxBufferPct} hint="为应对兑换前人民币贬值多准备的比例" error={err('fxBufferPct')} onChange={(v) => update({ fxBufferPct: v })} />
          <p className="small muted">{DEFAULT_FX_NOTE}</p>

          <div className="btn-row" style={{ marginTop: 16 }}>
            <button type="submit" className="btn">重新计算</button>
            <button type="button" className="btn secondary" onClick={reset}>恢复示例参数</button>
          </div>
          <div aria-live="polite" style={{ marginTop: 12 }}>
            {message && <p className={`notice ${message.type}`}>{message.text}</p>}
            {!message && dirty && <p className="notice">参数已修改，点击“重新计算”后结果才会更新。</p>}
          </div>
        </form>

        <div id="plan-result">
          <ReserveResult
            plan={plan}
            isSample={planIsSample}
            onEdit={() => {
              formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              formRef.current?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
            }}
          />
        </div>
      </div>
    </>
  );
}

