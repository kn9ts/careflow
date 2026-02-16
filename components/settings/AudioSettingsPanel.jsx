/**
 * Audio Settings Panel
 *
 * Controls for audio device selection and audio processing features
 */

'use client';

import { useState, useEffect } from 'react';
import { Mic, Speaker, Waves, VolumeX } from 'lucide-react';

export default function AudioSettingsPanel({ settings, onUpdate, onUpdateAll }) {
  const [devices, setDevices] = useState({ inputs: [], outputs: [] });
  const [permissionStatus, setPermissionStatus] = useState('prompt');

  // Enumerate available audio devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        // Request permission first
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        setPermissionStatus('granted');

        // Enumerate devices
        const deviceList = await navigator.mediaDevices.enumerateDevices();
        const inputs = deviceList.filter((d) => d.kind === 'audioinput');
        const outputs = deviceList.filter((d) => d.kind === 'audiooutput');

        setDevices({ inputs, outputs });
      } catch (err) {
        console.error('Error accessing audio devices:', err);
        setPermissionStatus('denied');
      }
    };

    getDevices();
  }, []);

  // Request microphone permission
  const requestPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setPermissionStatus('granted');

      // Re-enumerate devices
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const inputs = deviceList.filter((d) => d.kind === 'audioinput');
      const outputs = deviceList.filter((d) => d.kind === 'audiooutput');
      setDevices({ inputs, outputs });
    } catch (err) {
      console.error('Permission denied:', err);
      setPermissionStatus('denied');
    }
  };

  return (
    <div className="audio-settings">
      {/* Device Selection */}
      <div className="settings-section">
        <div className="section-header">
          <Mic size={20} />
          <h3>Audio Devices</h3>
        </div>
        <p className="section-description">
          Select your preferred microphone and speaker for calls.
        </p>

        {permissionStatus === 'denied' && (
          <div className="permission-warning">
            <VolumeX size={18} />
            <span>
              Microphone access denied. Please enable microphone permissions in your browser
              settings to select audio devices.
            </span>
          </div>
        )}

        {permissionStatus === 'prompt' && (
          <button onClick={requestPermission} className="permission-btn">
            <Mic size={16} />
            Grant Microphone Access
          </button>
        )}

        <div className="settings-grid">
          {/* Microphone Selection */}
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">Microphone</span>
              <span className="setting-description">Select your input device for calls</span>
            </div>
            <select
              value={settings.inputDevice}
              onChange={(e) => onUpdate('inputDevice', e.target.value)}
              className="device-select"
              disabled={permissionStatus !== 'granted'}
            >
              <option value="default">Default Microphone</option>
              {devices.inputs.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>

          {/* Speaker Selection */}
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">Speaker</span>
              <span className="setting-description">Select your output device for calls</span>
            </div>
            <select
              value={settings.outputDevice}
              onChange={(e) => onUpdate('outputDevice', e.target.value)}
              className="device-select"
              disabled={permissionStatus !== 'granted'}
            >
              <option value="default">Default Speaker</option>
              {devices.outputs.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Speaker ${device.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Audio Processing */}
      <div className="settings-section">
        <div className="section-header">
          <Waves size={20} />
          <h3>Audio Processing</h3>
        </div>
        <p className="section-description">Enable audio enhancements to improve call quality.</p>

        <div className="settings-grid">
          {/* Echo Cancellation */}
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">Echo Cancellation</span>
              <span className="setting-description">Reduce echo from your microphone</span>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.echoCancellation}
                onChange={(e) => onUpdate('echoCancellation', e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          {/* Noise Suppression */}
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">Noise Suppression</span>
              <span className="setting-description">Filter out background noise</span>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.noiseSuppression}
                onChange={(e) => onUpdate('noiseSuppression', e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          {/* Auto Gain Control */}
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">Auto Gain Control</span>
              <span className="setting-description">Automatically adjust microphone volume</span>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.autoGainControl}
                onChange={(e) => onUpdate('autoGainControl', e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>
      </div>

      <style jsx>{`
        .audio-settings {
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

        .permission-warning {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 0.5rem;
          color: #f87171;
          font-size: 0.875rem;
        }

        .permission-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          cursor: pointer;
          transition: background 0.2s;
        }

        .permission-btn:hover {
          background: #2563eb;
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

        .device-select {
          padding: 0.5rem 0.75rem;
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 0.375rem;
          color: #f8fafc;
          font-size: 0.875rem;
          min-width: 200px;
          cursor: pointer;
        }

        .device-select:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .device-select:disabled {
          opacity: 0.5;
          cursor: not-allowed;
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
      `}</style>
    </div>
  );
}
