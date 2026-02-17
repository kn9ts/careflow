/**
 * Display Settings Panel
 *
 * Controls for timezone and date/time formatting preferences
 */

'use client';

import { Globe, Calendar, Clock } from 'lucide-react';

// Common timezones
const COMMON_TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'Africa/Nairobi', label: 'Africa/Nairobi (EAT, UTC+3)' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT)' },
  { value: 'America/Chicago', label: 'America/Chicago (CST/CDT)' },
  { value: 'America/Denver', label: 'America/Denver (MST/MDT)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (CET/CEST)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST, UTC+4)' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST, UTC+5:30)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT, UTC+8)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST, UTC+9)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST/AEDT)' },
  { value: 'Pacific/Auckland', label: 'Pacific/Auckland (NZST/NZDT)' },
];

// Date formats
const DATE_FORMATS = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2024)', example: '12/31/2024' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/12/2024)', example: '31/12/2024' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2024-12-31)', example: '2024-12-31' },
];

// Time formats
const TIME_FORMATS = [
  { value: '12h', label: '12-hour (2:30 PM)' },
  { value: '24h', label: '24-hour (14:30)' },
];

export default function DisplaySettingsPanel({ settings, onUpdate, _onUpdateAll }) {
  // Get current time in selected timezone for preview
  const getCurrentTimePreview = () => {
    try {
      return new Date().toLocaleTimeString('en-US', {
        timeZone: settings.timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: settings.timeFormat === '12h',
      });
    } catch {
      return new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: settings.timeFormat === '12h',
      });
    }
  };

  // Get current date preview
  const getCurrentDatePreview = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();

    switch (settings.dateFormat) {
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      default:
        return `${month}/${day}/${year}`;
    }
  };

  return (
    <div className="display-settings">
      {/* Timezone Settings */}
      <div className="settings-section">
        <div className="section-header">
          <Globe size={20} />
          <h3>Timezone</h3>
        </div>
        <p className="section-description">
          Set your timezone for accurate timestamps in call history and recordings.
        </p>

        <div className="settings-grid">
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">Timezone</span>
              <span className="setting-description">
                All times will be displayed in this timezone
              </span>
            </div>
            <select
              value={settings.timezone}
              onChange={(e) => onUpdate('timezone', e.target.value)}
              className="timezone-select"
            >
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          {/* Time Preview */}
          <div className="preview-card">
            <span className="preview-label">Current Time Preview</span>
            <span className="preview-value">{getCurrentTimePreview()}</span>
            <span className="preview-timezone">{settings.timezone}</span>
          </div>
        </div>
      </div>

      {/* Date Format Settings */}
      <div className="settings-section">
        <div className="section-header">
          <Calendar size={20} />
          <h3>Date Format</h3>
        </div>
        <p className="section-description">
          Choose how dates are displayed throughout the application.
        </p>

        <div className="settings-grid">
          <div className="setting-item setting-item-full">
            <div className="setting-info">
              <span className="setting-label">Date Format</span>
              <span className="setting-description">Select your preferred date format</span>
            </div>
            <div className="format-options">
              {DATE_FORMATS.map((format) => (
                <label key={format.value} className="format-option">
                  <input
                    type="radio"
                    name="dateFormat"
                    value={format.value}
                    checked={settings.dateFormat === format.value}
                    onChange={(e) => onUpdate('dateFormat', e.target.value)}
                  />
                  <span className="format-label">{format.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Date Preview */}
          <div className="preview-card">
            <span className="preview-label">Date Preview</span>
            <span className="preview-value">{getCurrentDatePreview()}</span>
          </div>
        </div>
      </div>

      {/* Time Format Settings */}
      <div className="settings-section">
        <div className="section-header">
          <Clock size={20} />
          <h3>Time Format</h3>
        </div>
        <p className="section-description">Choose between 12-hour and 24-hour time display.</p>

        <div className="settings-grid">
          <div className="setting-item setting-item-full">
            <div className="setting-info">
              <span className="setting-label">Time Format</span>
              <span className="setting-description">Select your preferred time format</span>
            </div>
            <div className="format-options">
              {TIME_FORMATS.map((format) => (
                <label key={format.value} className="format-option">
                  <input
                    type="radio"
                    name="timeFormat"
                    value={format.value}
                    checked={settings.timeFormat === format.value}
                    onChange={(e) => onUpdate('timeFormat', e.target.value)}
                  />
                  <span className="format-label">{format.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .display-settings {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .settings-section {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #f8fafc;
        }

        .section-header h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
        }

        .section-description {
          color: #94a3b8;
          font-size: 0.875rem;
          margin: 0;
        }

        .settings-grid {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          background: #0f172a;
          border-radius: 0.5rem;
          padding: 1rem;
        }

        .setting-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.75rem;
          background: #1e293b;
          border-radius: 0.5rem;
        }

        .setting-item-full {
          flex-direction: column;
          align-items: stretch;
        }

        .setting-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .setting-label {
          color: #f8fafc;
          font-weight: 500;
          font-size: 0.875rem;
        }

        .setting-description {
          color: #64748b;
          font-size: 0.75rem;
        }

        .timezone-select {
          padding: 0.5rem 0.75rem;
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 0.375rem;
          color: #f8fafc;
          font-size: 0.875rem;
          min-width: 280px;
          cursor: pointer;
        }

        .timezone-select:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .format-options {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }

        .format-option {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .format-option:hover {
          border-color: #475569;
        }

        .format-option input {
          accent-color: #3b82f6;
          width: 16px;
          height: 16px;
        }

        .format-option input:checked + .format-label {
          color: #3b82f6;
        }

        .format-label {
          color: #f8fafc;
          font-size: 0.875rem;
        }

        .preview-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 1.5rem;
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          border: 1px solid #334155;
          border-radius: 0.5rem;
          text-align: center;
        }

        .preview-label {
          color: #64748b;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .preview-value {
          color: #f8fafc;
          font-size: 1.5rem;
          font-weight: 600;
          font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
        }

        .preview-timezone {
          color: #94a3b8;
          font-size: 0.75rem;
        }
      `}</style>
    </div>
  );
}
