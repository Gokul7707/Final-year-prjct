import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/forge/router';
import { PublicViewer } from '@/components/phases/PublicViewer';
import './index.css';

const viewId = new URLSearchParams(window.location.search).get('view');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {viewId ? <PublicViewer buildId={viewId} /> : <RouterProvider router={router} />}
  </React.StrictMode>
);
