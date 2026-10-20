import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { PlanInput } from '../lib/finance/planning';
import { DEFAULT_PLAN } from '../data/defaultPlan';

// 财务输入只保存在内存中：刷新页面即清除，不写入本地存储、不发送到任何服务。
interface AppState {
  plan: PlanInput;
  planIsSample: boolean;
  setPlan: (p: PlanInput) => void;
  resetPlan: () => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [plan, setPlanState] = useState<PlanInput>(DEFAULT_PLAN);
  const [planIsSample, setPlanIsSample] = useState(true);
  const value = useMemo<AppState>(
    () => ({
      plan,
      planIsSample,
      setPlan: (p) => {
        setPlanState(p);
        setPlanIsSample(false);
      },
      resetPlan: () => {
        setPlanState(DEFAULT_PLAN);
        setPlanIsSample(true);
      },
    }),
    [plan, planIsSample],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAppState 必须在 AppStateProvider 内使用');
  return v;
}
