import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMemory } from '../api';
import type { MemoryProject } from '../types';

export const MemoryPage: React.FC = () => {
  const [projects, setProjects] = useState<MemoryProject[] | null>(null);

  useEffect(() => {
    getMemory().then(setProjects);
  }, []);

  return (
    <>
      <h1 className="forge-h1">Engineering memory</h1>
      <p className="forge-sub">Completed forge jobs stored on the server (JSON). Firebase can replace this later.</p>

      {projects === null ? null : projects.length === 0 ? (
        <div className="forge-empty">
          <p>No completed jobs yet.</p>
          <Link to="/forge" className="forge-btn">
            Start a brief
          </Link>
        </div>
      ) : (
        projects.map((p) => (
          <Link key={p.jobId} to={`/forge/results/${p.jobId}`} className="forge-memory-row">
            <strong style={{ textTransform: 'capitalize' }}>{p.application}</strong>
            <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>
              {new Date(p.createdAt).toLocaleString()} · {p.alternativeCount} alts
              {p.hasStl ? ' · STL' : ''}
            </span>
            <span style={{ fontWeight: 800 }}>best {p.bestScore}</span>
            <span style={{ color: '#2563eb', fontWeight: 800 }}>Open →</span>
          </Link>
        ))
      )}
    </>
  );
};
