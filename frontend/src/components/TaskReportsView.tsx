import React, { useState } from 'react';
import { ArrowLeft, Download, FileText } from 'lucide-react';
import { TaskReport } from '../types';

interface TaskReportsViewProps {
  reports: TaskReport[];
  onBack: () => void;
}

const durationLabel = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
};

export const TaskReportsView: React.FC<TaskReportsViewProps> = ({ reports, onBack }) => {
  const [selectedId, setSelectedId] = useState(reports[0]?.id ?? '');
  const selected = reports.find((report) => report.id === selectedId) ?? reports[0];

  const exportReports = () => {
    const blob = new Blob([JSON.stringify(reports, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'luna-mine-task-reports.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="task-reports-page">
      <div className="report-page-heading">
        <button className="quiet-action" onClick={onBack}><ArrowLeft size={16} /> Back to simulator</button>
        <div className="report-title-row">
          <div>
            <span className="eyebrow">LUNA-MINE · MISSION ARCHIVE</span>
            <h1>Mission Report</h1>
            <p>{reports.length} completed {reports.length === 1 ? 'task' : 'tasks'} saved on this device.</p>
          </div>
          <button className="primary-action" onClick={exportReports}><Download size={16} /> Export reports</button>
        </div>
      </div>

      <div className="task-report-layout">
        <aside className="task-report-list" aria-label="Saved tasks">
          {reports.map((report) => (
            <button
              className={`task-report-list-item ${selected?.id === report.id ? 'selected' : ''}`}
              key={report.id}
              onClick={() => setSelectedId(report.id)}
            >
              <span className="task-report-list-top">
                <span>Task {String(report.taskNumber).padStart(2, '0')}</span>
                <span className="task-report-status">Complete</span>
              </span>
              <span className="task-report-list-sub">{report.siteName}</span>
              <span className="task-report-list-sub">{new Date(report.endedAt).toLocaleString()}</span>
            </button>
          ))}
        </aside>

        {selected ? (
          <article className="task-report-detail">
            <div className="task-report-detail-heading">
              <div>
                <span className="eyebrow">{selected.regionName}</span>
                <h2>Task {String(selected.taskNumber).padStart(2, '0')}</h2>
                <p>{selected.siteName} · {new Date(selected.startedAt).toLocaleString()} – {new Date(selected.endedAt).toLocaleTimeString()}</p>
              </div>
              <span className="completed-pill">COMPLETED</span>
            </div>

            <div className="task-report-metrics">
              <div><span>Duration</span><strong>{durationLabel(selected.durationSeconds)}</strong></div>
              <div><span>Distance</span><strong>{Math.max(0, selected.endTelemetry.distanceTravelledM - selected.startTelemetry.distanceTravelledM).toFixed(1)} m</strong></div>
              <div><span>Scans</span><strong>{selected.actions.filter((action) => action.kind === 'SCAN').length}</strong></div>
              <div><span>Drill depth</span><strong>{Math.max(0, selected.endTelemetry.drillDepthM - selected.startTelemetry.drillDepthM).toFixed(2)} m</strong></div>
              <div><span>Samples</span><strong>{Math.max(0, selected.endTelemetry.coreSamplesCount - selected.startTelemetry.coreSamplesCount)}</strong></div>
              <div><span>Battery used</span><strong>{Math.max(0, selected.startTelemetry.batterySoc - selected.endTelemetry.batterySoc).toFixed(1)}%</strong></div>
              <div><span>Energy recovered</span><strong>{Math.max(0, (selected.endTelemetry.mineralEnergyRecoveredKwh ?? 0) - (selected.startTelemetry.mineralEnergyRecoveredKwh ?? 0)).toFixed(2)} kWh</strong></div>
            </div>

            <section className="task-report-section">
              <div className="task-report-section-heading">
                <h3><FileText size={17} /> Activity log</h3>
                <span>{selected.actions.length} actions</span>
              </div>
              {selected.actions.length ? (
                <ol className="task-report-timeline">
                  {selected.actions.map((action, index) => (
                    <li key={action.id}>
                      <span className="timeline-index">{String(index + 1).padStart(2, '0')}</span>
                      <div className="timeline-content">
                        <div className="timeline-title-row"><strong>{action.kind}</strong><time>{new Date(action.recordedAt).toLocaleTimeString()}</time></div>
                        <p>{action.summary}</p>
                        <span className="timeline-telemetry">{action.latitude.toFixed(4)}°, {action.longitude.toFixed(4)}° · {action.elevationM} m · heading {action.headingDeg}° · {action.speedMs.toFixed(1)} m/s</span>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="empty-task-log">No discrete actions were recorded during this task.</p>
              )}
            </section>
          </article>
        ) : (
          <div className="task-report-empty">No task report selected.</div>
        )}
      </div>
    </main>
  );
};
