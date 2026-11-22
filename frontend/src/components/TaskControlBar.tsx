import React from 'react';
import { Activity, Clock3, Drill, FlaskConical, MoveUpRight, RotateCw, ScanLine, Square } from 'lucide-react';
import { TaskActionRecord } from '../types';

interface TaskControlBarProps {
  taskNumber: number;
  elapsedSeconds: number;
  actions: TaskActionRecord[];
  speedMs: number;
  heading: number;
  onEnd: () => void;
  onMove: () => void;
  onRotate: () => void;
  onScan: () => void;
  onDrill: () => void;
  onSample: () => void;
}

const formatElapsed = (seconds: number) => {
  const n = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
};

export const TaskControlBar: React.FC<TaskControlBarProps> = ({
  taskNumber, elapsedSeconds, actions, speedMs, heading,
  onEnd, onMove, onRotate, onScan, onDrill, onSample,
}) => (
  <footer className="task-footer" aria-label="Active task controls">
    <div className="task-footer-status">
      <span className="live-indicator" />
      <strong>TASK {String(taskNumber).padStart(2, '0')}</strong>
      <span className="task-footer-meta"><Clock3 size={14} /> {formatElapsed(elapsedSeconds)}</span>
      <span className="task-footer-meta"><Activity size={14} /> {speedMs.toFixed(1)} m/s · {Math.round(heading)}°</span>
      <span className="task-footer-count">{actions.length} logged</span>
    </div>
    <div className="task-footer-actions">
      <button onClick={onMove}><MoveUpRight size={15} /> Move</button>
      <button onClick={onRotate}><RotateCw size={15} /> Rotate</button>
      <button onClick={onScan}><ScanLine size={15} /> Scan</button>
      <button onClick={onDrill}><Drill size={15} /> Drill</button>
      <button onClick={onSample}><FlaskConical size={15} /> Sample</button>
      <button className="end-task-action" onClick={onEnd}><Square size={13} fill="currentColor" /> End task</button>
    </div>
    {actions.length > 0 && (
      <div className="task-footer-log" aria-live="polite">
        <span>LAST</span>
        <strong>{actions[actions.length - 1].kind}</strong>
        <span>{actions[actions.length - 1].summary}</span>
      </div>
    )}
  </footer>
);
