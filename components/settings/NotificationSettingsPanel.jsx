/**
 * Notification Settings Panel
 *
 * Controls for push notifications and sound alerts
 */

'use client';

import { Bell, BellOff, Volume2, VolumeX, Mail } from 'lucide-react';

export default function NotificationSettingsPanel({ settings, onUpdate, onUpdateAll }) {
  return (
    <div className="notification-settings">
      <div className="settings-section">
        <div className="section-header">
          <Bell size={20} />
          <h3>Push Notifications</h3>
        </div>
        <p className="section-description">
          Configure which events trigger push notifications to your devices.
        </p>

        <div className="settings-grid">
          {/* Incoming Calls */}
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">Incoming Calls</span>
              <span className="setting-description">Get notified when someone calls you</span>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.incomingCalls}
                onChange={(e) => onUpdate('incomingCalls', e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          {/* Missed Calls */}
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">Missed Calls</span>
              <span className="setting-description">Get notified about calls you missed</span>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.missedCalls}
                onChange={(e) => onUpdate('missedCalls', e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          {/* Voicemails */}
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">Voicemails</span>
              <span className="setting-description">Get notified when you receive a voicemail</span>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.voicemails}
                onChange={(e) => onUpdate('voicemails', e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>
      </div>

      {/* Email Notifications */}
      <div className="settings-section">
        <div className="section-header">
          <Mail size={20} />
          <h3>Email Notifications</h3>
        </div>
        <p className="section-description">Receive call activity summaries via email.</p>

        <div className="settings-grid">
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">Email Alerts</span>
              <span className="setting-description">Receive daily summary of call activity</span>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.email}
                onChange={(e) => onUpdate('email', e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>
      </div>

      {/* Sound Settings */}
      <div className="settings-section">
        <div className="section-header">
          {settings.soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          <h3>Sound Alerts</h3>
        </div>
        <p className="section-description">
          Configure sound notifications for incoming calls and events.
        </p>

        <div className="settings-grid">
          {/* Sound Enabled */}
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">Enable Sounds</span>
              <span className="setting-description">Play sounds for notifications</span>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(e) => onUpdate('soundEnabled', e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          {/* Volume Slider */}
          <div className="setting-item setting-item-full">
            <div className="setting-info">
              <span className="setting-label">Volume Level</span>
              <span className="setting-description">
                Adjust notification sound volume ({settings.soundVolume}%)
              </span>
            </div>
            <div className="volume-control">
              <input
                type="range"
                min="0"
                max="100"
                value={settings.soundVolume}
                onChange={(e) => onUpdate('soundVolume', parseInt(e.target.value, 10))}
                className="volume-slider"
                disabled={!settings.soundEnabled}
              />
              <span className="volume-value">{settings.soundVolume}%</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .notification-settings {
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

        .toggle {
          position: relative;
          display: inline-block;
          width: 48px;
          height: 24px;
          flex-shrink: 0;
        }

        .toggle input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #475569;
          transition: 0.3s;
          border-radius: 24px;
        }

        .toggle-slider:before {
          position: absolute;
          content: '';
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: 0.3s;
          border-radius: 50%;
        }

        .toggle input:checked + .toggle-slider {
          background-color: #3b82f6;
        }

        .toggle input:checked + .toggle-slider:before {
          transform: translateX(24px);
        }

        .toggle input:focus + .toggle-slider {
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
        }

        .volume-control {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-top: 0.5rem;
        }

        .volume-slider {
          flex: 1;
          height: 6px;
          background: #475569;
          border-radius: 3px;
          outline: none;
          -webkit-appearance: none;
          appearance: none;
        }

        .volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          background: #3b82f6;
          border-radius: 50%;
          cursor: pointer;
          transition: background 0.2s;
        }

        .volume-slider::-webkit-slider-thumb:hover {
          background: #2563eb;
        }

        .volume-slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          background: #3b82f6;
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }

        .volume-slider:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .volume-slider:disabled::-webkit-slider-thumb {
          cursor: not-allowed;
        }

        .volume-value {
          color: #94a3b8;
          font-size: 0.875rem;
          min-width: 40px;
          text-align: right;
        }
      `}</style>
    </div>
  );
}
