import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import ApiClient from '../utils/api';
import './LogsPage.css';
import {
  Search,
  Filter,
  Radio,
  Download,
  Maximize2,
  ArrowDown,
  Terminal,
  AlertTriangle,
  Info,
  XCircle,
  Copy,
  Check,
  RefreshCw,
  Play,
  Pause,
  ChevronRight,
  ChevronDown,
  Layers,
  Trash2
} from 'lucide-react';



export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [serviceFilter, setServiceFilter] = useState('All Services');
  const [levelFilter, setLevelFilter] = useState('All');
  const [timeFilter, setTimeFilter] = useState('Last 1h');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLive, setIsLive] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [wrapLines, setWrapLines] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [expandedTraceIds, setExpandedTraceIds] = useState(new Set());
  const [copiedId, setCopiedId] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const logTerminalRef = useRef(null);

  useEffect(() => {
    const socket = io("http://localhost:5002", {
      withCredentials: true,
    });

    socket.on("system_logs", (newLog) => {
      setLogs((prev) => {
        if (!isLive) return prev;
        const updated = [...prev, newLog];
        // Keep only last 1000 logs
        if (updated.length > 1000) return updated.slice(updated.length - 1000);
        return updated;
      });
      setLoading(false);
    });

    return () => {
      socket.disconnect();
    };
  }, [isLive]);

  // Filter logs based on selection
  const filteredLogs = logs.filter((log) => {
    const matchesService =
      serviceFilter === 'All Services' || log.service === serviceFilter;
    const matchesLevel =
      levelFilter === 'All' || log.level === levelFilter;
    const matchesSearch =
      searchTerm === '' ||
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.level.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.requestId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.traceId.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesService && matchesLevel && matchesSearch;
  });

  // Auto scroll logic
  useEffect(() => {
    if (autoScroll && logTerminalRef.current) {
      logTerminalRef.current.scrollTop = logTerminalRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll]);

  const scrollToBottom = () => {
    if (logTerminalRef.current) {
      logTerminalRef.current.scrollTop = logTerminalRef.current.scrollHeight;
    }
  };

  const toggleTraceExpand = (id, e) => {
    e.stopPropagation();
    setExpandedTraceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCopyText = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopiedId(type);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const handleDownloadLogs = () => {
    const content = filteredLogs
      .map((l) => `[${l.timestamp}] [${l.level}] [${l.service}] ${l.message}`)
      .join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cicd_logs_${new Date().toISOString().slice(0, 10)}.log`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Unique services list for dropdown
  const availableServices = [
    'All Services',
    ...Array.from(new Set(logs.map((l) => l.service)))
  ];

  return (
    <div className={`logs-page-container ${isFullscreen ? 'fullscreen-mode' : ''}`}>
      {/* 1. Page Header */}
      <header className="logs-header">
        <div className="logs-header-left">
          <div className="header-icon-box">
            <Terminal className="header-icon" />
          </div>
          <div>
            <h1 className="logs-title">Logs</h1>
            <p className="logs-subtitle">
              Centralized log viewer for all services and pipelines
            </p>
          </div>
        </div>

        <div className="logs-header-right">
          <button
            className="action-btn secondary"
            onClick={handleDownloadLogs}
            title="Download Logs"
          >
            <Download size={16} />
            <span>Export</span>
          </button>
          <button
            className="action-btn secondary"
            onClick={handleClearLogs}
            title="Clear Current Terminal View"
          >
            <Trash2 size={16} />
            <span>Clear</span>
          </button>
          <button
            className={`action-btn ${isFullscreen ? 'active' : 'secondary'}`}
            onClick={() => setIsFullscreen(!isFullscreen)}
            title="Toggle Fullscreen Mode"
          >
            <Maximize2 size={16} />
            <span>{isFullscreen ? 'Exit Full' : 'Fullscreen'}</span>
          </button>
        </div>
      </header>

      {/* 2. Filter Bar */}
      <div className="logs-filter-bar card">
        <div className="filter-group search-group">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="logs-search-input"
            placeholder="Search logs by keyword, service, request ID, trace ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              className="search-clear-btn"
              onClick={() => setSearchTerm('')}
            >
              ×
            </button>
          )}
        </div>

        <div className="filter-group select-group">
          <div className="filter-item">
            <label>Service:</label>
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
            >
              {availableServices.map((srv) => (
                <option key={srv} value={srv}>
                  {srv}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-item">
            <label>Level:</label>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
            >
              <option value="All">All Levels</option>
              <option value="INFO">INFO</option>
              <option value="WARN">WARN</option>
              <option value="ERROR">ERROR</option>
              <option value="DEBUG">DEBUG</option>
            </select>
          </div>

          <div className="filter-item">
            <label>Time Range:</label>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
            >
              <option value="Last 15m">Last 15m</option>
              <option value="Last 1h">Last 1h</option>
              <option value="Last 6h">Last 6h</option>
              <option value="Last 24h">Last 24h</option>
              <option value="Last 7d">Last 7d</option>
            </select>
          </div>
        </div>

        <div className="filter-actions">
          <button
            className={`live-toggle-btn ${isLive ? 'active' : ''}`}
            onClick={() => setIsLive(!isLive)}
          >
            <span className={`live-pulse-dot ${isLive ? 'streaming' : 'paused'}`}></span>
            <Radio size={15} />
            <span>{isLive ? 'LIVE' : 'PAUSED'}</span>
          </button>
        </div>
      </div>

      <div className="logs-stats-grid">
        <div className="stat-card total-card">
          <div className="stat-icon-wrapper cyan">
            <Terminal size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Logs</span>
            <span className="stat-value">{logs.length}</span>
          </div>
        </div>

        <div className="stat-card info-card">
          <div className="stat-icon-wrapper blue">
            <Info size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Info</span>
            <span className="stat-value info-color">{logs.filter(l => l.level === 'INFO').length}</span>
          </div>
        </div>

        <div className="stat-card warn-card">
          <div className="stat-icon-wrapper yellow">
            <AlertTriangle size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Warnings</span>
            <span className="stat-value warn-color">{logs.filter(l => l.level === 'WARN').length}</span>
          </div>
        </div>

        <div className="stat-card error-card">
          <div className="stat-icon-wrapper red">
            <XCircle size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Errors</span>
            <span className="stat-value error-color">{logs.filter(l => l.level === 'ERROR').length}</span>
          </div>
        </div>
      </div>

      {/* Main Content Split: Terminal Viewer (left) + Log Details Panel (right) */}
      <div className="logs-workspace">
        {/* 4. Terminal-style Log Viewer */}
        <div className="terminal-container">
          <div className="terminal-header-bar">
            <div className="macos-dots">
              <span className="dot dot-red"></span>
              <span className="dot dot-yellow"></span>
              <span className="dot dot-green"></span>
            </div>

            <div className="terminal-title">
              <Terminal size={14} className="title-icon" />
              <span>bash — logs@cicd-cluster-us-east-1 (live-stream)</span>
            </div>

            <div className="terminal-controls">
              <button
                className={`terminal-toggle-btn ${autoScroll ? 'active' : ''}`}
                onClick={() => setAutoScroll(!autoScroll)}
                title="Toggle Auto Scroll"
              >
                Auto-scroll
              </button>
              <button
                className={`terminal-toggle-btn ${wrapLines ? 'active' : ''}`}
                onClick={() => setWrapLines(!wrapLines)}
                title="Toggle Line Wrap"
              >
                Wrap
              </button>
              <span className="log-count-badge">
                {filteredLogs.length} entries
              </span>
            </div>
          </div>

          <div
            className={`terminal-body ${wrapLines ? 'wrap-text' : ''}`}
            ref={logTerminalRef}
          >
            {filteredLogs.length === 0 ? (
              <div className="terminal-empty-state">
                <Terminal size={40} className="empty-icon" />
                <p>No log records found matching the current filters.</p>
                <button
                  className="action-btn secondary sm"
                  onClick={() => {
                    setServiceFilter('All Services');
                    setLevelFilter('All');
                    setSearchTerm('');
                  }}
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              filteredLogs.map((log, index) => {
                const isSelected = selectedLog?.id === log.id;
                const isExpanded = expandedTraceIds.has(log.id);

                return (
                  <div key={log.id} className="log-entry-wrapper">
                    <div
                      className={`log-line ${isSelected ? 'selected' : ''} level-${log.level.toLowerCase()}`}
                      onClick={() => setSelectedLog(log)}
                    >
                      <span className="log-line-num">{index + 1}</span>
                      <span className="log-timestamp">{log.timestamp}</span>
                      <span className={`log-level-badge level-${log.level.toLowerCase()}`}>
                        [{log.level}]
                      </span>
                      <span className="log-service-tag">{log.service}</span>
                      <span className="log-message">{log.message}</span>

                      {log.stackTrace && (
                        <button
                          className="stack-trace-toggle-btn"
                          onClick={(e) => toggleTraceExpand(log.id, e)}
                        >
                          {isExpanded ? (
                            <ChevronDown size={14} />
                          ) : (
                            <ChevronRight size={14} />
                          )}
                          <span>{isExpanded ? 'Hide Trace' : 'Stack Trace'}</span>
                        </button>
                      )}
                    </div>

                    {log.stackTrace && isExpanded && (
                      <div className="stack-trace-block">
                        <pre>{log.stackTrace}</pre>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Sticky Scroll To Bottom Button */}
          <button
            className="scroll-to-bottom-btn"
            onClick={scrollToBottom}
            title="Scroll to bottom"
          >
            <ArrowDown size={16} />
            <span>Scroll to Bottom</span>
          </button>
        </div>

        {/* 5. Log Details Panel (Right side) */}
        {selectedLog && (
          <div className="log-details-panel card animate-fade-in">
            <div className="panel-header">
              <div className="panel-title-area">
                <Layers size={18} className="panel-title-icon" />
                <h3>Log Entry Details</h3>
              </div>
              <span className={`badge level-${selectedLog.level.toLowerCase()}`}>
                {selectedLog.level}
              </span>
            </div>

            <div className="panel-content">
              {/* Full Message Section */}
              <div className="detail-section">
                <div className="detail-label-row">
                  <span className="detail-label">Message</span>
                  <button
                    className="copy-mini-btn"
                    onClick={() => handleCopyText(selectedLog.message, 'msg')}
                  >
                    {copiedId === 'msg' ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedId === 'msg' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="detail-message-box">
                  {selectedLog.message}
                </div>
              </div>

              {/* Stack Trace Section if present */}
              {selectedLog.stackTrace && (
                <div className="detail-section">
                  <div className="detail-label-row">
                    <span className="detail-label error-label">Stack Trace</span>
                    <button
                      className="copy-mini-btn"
                      onClick={() => handleCopyText(selectedLog.stackTrace, 'trace')}
                    >
                      {copiedId === 'trace' ? <Check size={13} /> : <Copy size={13} />}
                      <span>{copiedId === 'trace' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="detail-stack-box">
                    {selectedLog.stackTrace}
                  </pre>
                </div>
              )}

              {/* Metadata Key-Values */}
              <div className="detail-meta-grid">
                <div className="meta-item">
                  <span className="meta-label">Service</span>
                  <span className="meta-value purple-highlight">
                    {selectedLog.service}
                  </span>
                </div>

                <div className="meta-item">
                  <span className="meta-label">Timestamp</span>
                  <span className="meta-value font-mono">
                    {selectedLog.timestamp}
                  </span>
                </div>

                <div className="meta-item">
                  <span className="meta-label">Request ID</span>
                  <div className="meta-value-copy">
                    <span className="font-mono">{selectedLog.requestId}</span>
                    <button
                      className="icon-copy-btn"
                      onClick={() => handleCopyText(selectedLog.requestId, 'req')}
                      title="Copy Request ID"
                    >
                      {copiedId === 'req' ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>

                <div className="meta-item">
                  <span className="meta-label">Trace ID</span>
                  <div className="meta-value-copy">
                    <span className="font-mono cyan-highlight">
                      {selectedLog.traceId}
                    </span>
                    <button
                      className="icon-copy-btn"
                      onClick={() => handleCopyText(selectedLog.traceId, 'trc')}
                      title="Copy Trace ID"
                    >
                      {copiedId === 'trc' ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>

                <div className="meta-item">
                  <span className="meta-label">Environment</span>
                  <span className="meta-value">{selectedLog.environment}</span>
                </div>

                <div className="meta-item">
                  <span className="meta-label">Container ID</span>
                  <span className="meta-value font-mono">
                    {selectedLog.containerId}
                  </span>
                </div>
              </div>

              {/* Quick Actions Footer */}
              <div className="panel-actions">
                <button
                  className="action-btn secondary sm full-width"
                  onClick={() => setSearchTerm(selectedLog.traceId)}
                >
                  <Filter size={14} />
                  <span>Filter by Trace ID</span>
                </button>
                <button
                  className="action-btn secondary sm full-width"
                  onClick={() => setServiceFilter(selectedLog.service)}
                >
                  <Terminal size={14} />
                  <span>Filter by Service</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
