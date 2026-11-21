import React, { useState } from 'react';
import { CommandLogEntry, OperationState } from '../types';
import { Terminal, Send, Play, Radio, Sparkles, Database, Disc, CornerDownLeft, RotateCcw, AlertOctagon, HelpCircle } from 'lucide-react';

interface CommandConsoleProps {
  operation: OperationState;
  commandLogs: CommandLogEntry[];
  onExecuteCommand: (command: string, params?: Record<string, any>, source?: 'CLI' | 'UI_BUTTON' | 'KEYBOARD_SHORTCUT') => void;
}

export const CommandConsole: React.FC<CommandConsoleProps> = ({
  operation,
  commandLogs,
  onExecuteCommand,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  // Global keyboard shortcuts (when input is not focused)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      const k = e.key.toUpperCase();
      if (k === 'W' || k === 'A' || k === 'S' || k === 'D' || e.key.startsWith('Arrow')) {
        e.preventDefault();
        if (k === 'W' || e.key === 'ArrowUp') onExecuteCommand('MOVE_FORWARD', {}, 'KEYBOARD_SHORTCUT');
        else if (k === 'S' || e.key === 'ArrowDown') onExecuteCommand('MOVE_BACKWARD', {}, 'KEYBOARD_SHORTCUT');
        else if (k === 'A' || e.key === 'ArrowLeft') onExecuteCommand('STRAFE_LEFT', {}, 'KEYBOARD_SHORTCUT');
        else if (k === 'D' || e.key === 'ArrowRight') onExecuteCommand('STRAFE_RIGHT', {}, 'KEYBOARD_SHORTCUT');
      }
      else if (k === 'N') onExecuteCommand('MOVE_TO', { target: 'NEXT_WAYPOINT' }, 'KEYBOARD_SHORTCUT');
      else if (k === 'M') onExecuteCommand('SCAN_SURFACE', {}, 'KEYBOARD_SHORTCUT');
      else if (k === 'C') onExecuteCommand('COLLECT_SAMPLE', {}, 'KEYBOARD_SHORTCUT');
      else if (k === 'E') onExecuteCommand('DRILL_EXCAVATE', { targetDepth: 1.5 }, 'KEYBOARD_SHORTCUT');
      else if (k === 'P') onExecuteCommand('PROCESS_MATERIAL', {}, 'KEYBOARD_SHORTCUT');
      else if (k === 'R') onExecuteCommand('RETURN_TO_BASE', {}, 'KEYBOARD_SHORTCUT');
      else if (k === 'X') onExecuteCommand('EMERGENCY_STOP', {}, 'KEYBOARD_SHORTCUT');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExecuteCommand]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const parts = inputVal.trim().split(' ');
    const cmd = parts[0].toUpperCase();
    const params: Record<string, any> = {};

    if (parts.length > 1) {
      parts.slice(1).forEach((arg) => {
        const [k, v] = arg.split('=');
        if (k && v) params[k] = isNaN(Number(v)) ? v : Number(v);
        else params.arg = arg;
      });
    }

    onExecuteCommand(cmd, params, 'CLI');
    setInputVal('');
  };

  return (
    <div className="w-full bg-[#111619] border-t border-[#293235] p-2.5 flex flex-col md:flex-row gap-2.5 select-none text-xs">
      {/* Left: Quick Command Action Buttons */}
      <div className="flex flex-wrap items-center gap-1.5 md:max-w-[480px]">
        <button
          type="button"
          onClick={() => onExecuteCommand('MOVE_TO', { target: 'NEXT_WAYPOINT' }, 'UI_BUTTON')}
          className="px-2.5 py-1.5 rounded bg-[#191f22] hover:bg-[#293235] border border-[#3c494d] text-white font-mono font-semibold flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-sm"
          title="Shortcut: W or N / Click to navigate"
        >
          <Play className="w-3.5 h-3.5 text-[#75d8cc]" />
          <span>NAVIGATE</span>
          <span className="text-[9px] text-gray-400 font-mono">[W]</span>
        </button>

        <button
          type="button"
          onClick={() => onExecuteCommand('SCAN_SURFACE', {}, 'UI_BUTTON')}
          className="px-2.5 py-1.5 rounded bg-[#191f22] hover:bg-[#293235] border border-[#3c494d] text-white font-mono font-semibold flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-sm"
          title="Shortcut: M to scan"
        >
          <Radio className="w-3.5 h-3.5 text-[#a7d9df]" />
          <span>SCAN</span>
          <span className="text-[9px] text-gray-400 font-mono">[M]</span>
        </button>

        <button
          type="button"
          onClick={() => onExecuteCommand('COLLECT_SAMPLE', {}, 'UI_BUTTON')}
          className="px-2.5 py-1.5 rounded bg-[#191f22] hover:bg-[#293235] border border-[#3c494d] text-white font-mono font-semibold flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-sm"
          title="Shortcut: C to collect sample"
        >
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span>SAMPLE</span>
          <span className="text-[9px] text-gray-400 font-mono">[C]</span>
        </button>

        <button
          type="button"
          onClick={() => onExecuteCommand('DRILL_EXCAVATE', { targetDepth: 1.5 }, 'UI_BUTTON')}
          className="px-2.5 py-1.5 rounded bg-[#191f22] hover:bg-[#293235] border border-[#3c494d] text-white font-mono font-semibold flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-sm"
          title="Shortcut: E to drill"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>DRILL</span>
          <span className="text-[9px] text-gray-400 font-mono">[E]</span>
        </button>

        <button
          type="button"
          onClick={() => onExecuteCommand('PROCESS_MATERIAL', {}, 'UI_BUTTON')}
          className="px-2.5 py-1.5 rounded bg-[#191f22] hover:bg-[#293235] border border-[#3c494d] text-white font-mono font-semibold flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-sm"
          title="Shortcut: P to process"
        >
          <Disc className="w-3.5 h-3.5 text-purple-400" />
          <span>PROCESS</span>
          <span className="text-[9px] text-gray-400 font-mono">[P]</span>
        </button>

        <button
          type="button"
          onClick={() => onExecuteCommand('RETURN_TO_BASE', {}, 'UI_BUTTON')}
          className="px-2.5 py-1.5 rounded bg-[#191f22] hover:bg-[#293235] border border-[#3c494d] text-white font-mono font-semibold flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-sm"
          title="Shortcut: R to return"
        >
          <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
          <span>RETURN</span>
          <span className="text-[9px] text-gray-400 font-mono">[R]</span>
        </button>

        <button
          type="button"
          onClick={() => onExecuteCommand('EMERGENCY_STOP', {}, 'UI_BUTTON')}
          className="px-2.5 py-1.5 rounded bg-red-950/70 hover:bg-red-900 border border-red-800 text-red-300 font-mono font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-[0_0_10px_rgba(239,68,68,0.3)]"
          title="Shortcut: X to emergency stop"
        >
          <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
          <span>E-STOP</span>
          <span className="text-[9px] text-red-300 font-mono">[X]</span>
        </button>
      </div>

      {/* Center: Command Log Stream with Timestamps & Precondition Feedback */}
      <div className="flex-1 bg-[#080b0e] rounded border border-[#293235] p-1.5 flex flex-col justify-between h-[84px] overflow-hidden">
        <div className="overflow-y-auto space-y-1 font-telemetry text-[11px] pr-1">
          {commandLogs.slice(-3).map((log) => (
            <div key={log.id} className="flex items-center space-x-2">
              <span className="text-gray-500 text-[10px]">{log.timestamp}</span>
              <span
                className={`font-bold ${
                  log.accepted ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                [{log.accepted ? 'OK' : 'REJECTED'}]
              </span>
              <span className="text-white font-mono font-semibold">{log.command}</span>
              <span className="text-gray-400 truncate text-[10px]">- {log.resultMessage}</span>
            </div>
          ))}
          {commandLogs.length === 0 && (
            <span className="text-gray-500 italic">
              Mission Command Validator standing by. Ready for telecommands.
            </span>
          )}
        </div>

        {/* Command Input Field with Auto-Suggestion */}
        <form onSubmit={handleSubmit} className="flex items-center space-x-1.5 mt-1 pt-1 border-t border-[#293235]">
          <Terminal className="w-3.5 h-3.5 text-[#a7d9df] shrink-0" />
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Type telecommand (e.g. MOVE_TO, SCAN_SURFACE, DRILL depth=1.5, HELP)..."
            className="flex-1 bg-transparent text-white font-telemetry text-[11px] focus:outline-none placeholder-gray-600"
          />
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="text-gray-400 hover:text-white p-1"
            title="Show Supported Commands"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
          <button
            type="submit"
            className="bg-[#293235] hover:bg-[#3c494d] text-[#a7d9df] px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1"
          >
            <Send className="w-2.5 h-2.5" /> SEND
          </button>
        </form>
      </div>

      {/* Command Syntax Help Modal / Popover */}
      {showHelp && (
        <div className="absolute bottom-16 left-4 z-50 bg-[#191f22] border border-[#3c494d] rounded-lg p-3 shadow-2xl max-w-sm text-[11px] font-mono text-gray-300">
          <div className="flex justify-between items-center mb-1 text-white font-bold">
            <span>SUPPORTED TELECOMMANDS</span>
            <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-white">✕</button>
          </div>
          <ul className="space-y-1 text-[10px]">
            <li><strong className="text-[#a7d9df]">W / A / S / D</strong> - Drive forward, left, backward and right</li>
            <li><strong className="text-[#a7d9df]">MOVE_TO</strong> - Traverse along planned route [W]</li>
            <li><strong className="text-[#a7d9df]">SCAN_SURFACE</strong> - Holographic spectral query [M]</li>
            <li><strong className="text-[#a7d9df]">COLLECT_SAMPLE</strong> - Scoop surface regolith [C]</li>
            <li><strong className="text-[#a7d9df]">DRILL_EXCAVATE</strong> - Subsurface rotary drill [E]</li>
            <li><strong className="text-[#a7d9df]">PROCESS_MATERIAL</strong> - Beneficiate ilmenite/silicates [P]</li>
            <li><strong className="text-[#a7d9df]">RETURN_TO_BASE</strong> - Navigate back to base dock [R]</li>
            <li><strong className="text-[#a7d9df]">EMERGENCY_STOP</strong> - Immediate rover safe stop [X]</li>
          </ul>
        </div>
      )}
    </div>
  );
};
