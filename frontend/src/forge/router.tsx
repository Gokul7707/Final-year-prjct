import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import App from '@/App';
import { ForgeShell } from './ForgeShell';
import { BriefPage } from './pages/BriefPage';
import { PipelinePage } from './pages/PipelinePage';
import { ResultsPage } from './pages/ResultsPage';
import { InspectPage } from './pages/InspectPage';
import { ExportPage } from './pages/ExportPage';
import { MemoryPage } from './pages/MemoryPage';

export const router = createBrowserRouter([
  { path: '/', element: <App /> },
  {
    path: '/forge',
    element: <ForgeShell />,
    children: [
      { index: true, element: <BriefPage /> },
      { path: 'pipeline/:jobId', element: <PipelinePage /> },
      { path: 'results/:jobId', element: <ResultsPage /> },
      { path: 'inspect/:jobId/:altId', element: <InspectPage /> },
      { path: 'export/:jobId/:altId', element: <ExportPage /> },
      { path: 'memory', element: <MemoryPage /> },
    ],
  },
]);
