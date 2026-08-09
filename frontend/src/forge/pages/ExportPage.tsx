import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useForgeStore } from '../store';
import { exportJob } from '../api';

export const ExportPage: React.FC = () => {
  const { jobId, altId } = useParams();
  const job = useForgeStore((s) => s.job);
  const loadJob = useForgeStore((s) => s.loadJob);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (jobId && (!job || job.id !== jobId)) loadJob(jobId);
  }, [jobId, job, loadJob]);

  const alt = job?.alternatives.find((a) => a.id === altId);

  if (!job || !alt) {
    return (
      <div className="forge-empty">
        <p>Design not found.</p>
        <Link to="/forge" className="forge-btn">
          New brief
        </Link>
      </div>
    );
  }

  const downloadStl = () => {
    if (!alt.stlUrl) {
      setStatus('No STL available for this alternative.');
      return;
    }
    const a = document.createElement('a');
    a.href = alt.stlUrl;
    a.download = `${alt.name.replace(/\s+/g, '-')}-${job.id}.stl`;
    a.click();
    setStatus('STL download started.');
  };

  const downloadReport = async () => {
    try {
      const data = await exportJob(job.id, alt.id);
      const blob = new Blob([data.reportMarkdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${alt.name.replace(/\s+/g, '-')}-report.md`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus('Report downloaded.');
    } catch (e: any) {
      setStatus(e?.message || 'Export failed');
    }
  };

  const total = alt.bom.reduce((s, l) => s + l.price, 0);

  return (
    <>
      <h1 className="forge-h1">{alt.name} — export</h1>
      <p className="forge-sub">Job {job.id} · score {alt.score}/100</p>

      <div className="forge-grid-2">
        <div className="forge-card">
          <h3 style={{ marginTop: 0 }}>Chassis STL</h3>
          <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
            {alt.chassisParams.wheelbaseMm}mm · cage Ø{alt.chassisParams.motorCageDiameter}mm · wall{' '}
            {alt.chassisParams.wallThickness}mm · {alt.chassisParams.manufacturing}
          </p>
          <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{alt.stlUrl || 'STL missing'}</p>
          <button type="button" className="forge-btn" onClick={downloadStl} disabled={!alt.stlUrl}>
            Download STL
          </button>
        </div>

        <div className="forge-card">
          <h3 style={{ marginTop: 0 }}>Engineering report</h3>
          <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>{alt.justification}</p>
          <button type="button" className="forge-btn secondary" onClick={downloadReport}>
            Download report (.md)
          </button>
        </div>

        <div className="forge-card" style={{ gridColumn: '1 / -1' }}>
          <h3 style={{ marginTop: 0 }}>Bill of materials</h3>
          {alt.bom.map((line) => (
            <div key={line.label} className="forge-bom-line">
              <span>{line.label}</span>
              <span style={{ color: '#2563eb' }}>{line.detail}</span>
              <span>₹{line.price.toLocaleString('en-IN')}</span>
            </div>
          ))}
          <div className="forge-bom-line" style={{ borderTop: '1px solid #e5e7eb', marginTop: 8, paddingTop: 10 }}>
            <span>
              <strong>Total</strong>
            </span>
            <span />
            <span>₹{total.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {status && <p style={{ marginTop: '1rem', color: '#059669', fontWeight: 700 }}>{status}</p>}

      <div style={{ marginTop: '1.25rem' }}>
        <Link to={`/forge/inspect/${job.id}/${alt.id}`} className="forge-btn linkish">
          ← Back to inspector
        </Link>
      </div>
    </>
  );
};
