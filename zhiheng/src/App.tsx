import { createHashRouter, createMemoryRouter, RouterProvider, type RouteObject } from 'react-router-dom';
import { EMBED } from './env';
import { Layout } from './components/Layout';
import { AppStateProvider } from './state/AppState';
import { HomePage } from './pages/HomePage';
import { PlanPage } from './pages/PlanPage';
import { BondsPage } from './pages/BondsPage';
import { BondDetailPage } from './pages/BondDetailPage';
import { AnalysisPage } from './pages/AnalysisPage';
import { NewsPage } from './pages/NewsPage';
import { ExpertsPage } from './pages/ExpertsPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Hash 路由：构建产物可直接作为静态文件打开，无需服务端路由配置；嵌入模式用内存路由
const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/plan', element: <PlanPage /> },
      { path: '/bonds', element: <BondsPage /> },
      { path: '/bonds/:id', element: <BondDetailPage /> },
      { path: '/analysis', element: <AnalysisPage /> },
      { path: '/news', element: <NewsPage /> },
      { path: '/experts', element: <ExpertsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
const router = EMBED ? createMemoryRouter(routes) : createHashRouter(routes);

export function App() {
  return (
    <AppStateProvider>
      <RouterProvider router={router} />
    </AppStateProvider>
  );
}
