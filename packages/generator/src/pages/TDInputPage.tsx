import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { dashboardService } from '../services/dashboardService';
import { parseTDFromSource, parseAffordances } from '../services/tdService';

export function TDInputPage() {
  const { state, dispatch } = useAppContext();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function postTDToHost(td: any): Promise<string> {
    const resp = await fetch('http://localhost:8088/serve-td', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(td),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || `TD host error (${resp.status})`);
    }
    const data = await resp.json();
    return data.url as string;
  }

  // Common TD setup logic after parsing from any source
  const setupTD = async (parsedTD: any, opts: { originalUrl?: string; file?: File }) => {
    let finalUrl: string;
    if (opts.file) {
      finalUrl = await postTDToHost(parsedTD);
    } else if (opts.originalUrl) {
      finalUrl = opts.originalUrl;
    } else {
      finalUrl = URL.createObjectURL(new Blob([JSON.stringify(parsedTD)], { type: 'application/json' }));
    }

    const affordances = parseAffordances(parsedTD);

    // Create TD info object with URL source for consistent downstream wiring
    const tdInfo = {
      id: Date.now().toString(),
      title: parsedTD.title || 'Untitled TD',
      td: parsedTD,
      source: { type: 'url' as const, content: finalUrl },
    };

    // Update context state
    dispatch({ type: 'SET_TD_SOURCE', payload: { type: 'url', content: finalUrl } });
    dispatch({ type: 'SET_PARSED_TD', payload: parsedTD });
    dispatch({ type: 'SET_AFFORDANCES', payload: affordances });
    dispatch({ type: 'ADD_TD', payload: tdInfo });

    navigate('/affordances');
  };

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setError(null);
      setLoading(true);

      try {
        const parsedTD = await parseTDFromSource({ type: 'file' as const, content: file });
        // console.log('[generator][td] file TD parsed', { title: parsedTD?.title });
        await setupTD(parsedTD, { file });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse Thing Description');
      } finally {
        setLoading(false);
      }
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.json'],
      'application/ld+json': ['.jsonld'],
    },
    maxFiles: 1,
  });

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setError(null);
    setLoading(true);

    try {
      const originalUrl = urlInput.trim();
      const parsedTD = await parseTDFromSource({ type: 'url' as const, content: originalUrl });
      // console.log('[generator][td] url TD parsed', { title: parsedTD?.title, originalUrl });
      await setupTD(parsedTD, { originalUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch Thing Description');
    } finally {
      setLoading(false);
    }
  };

  const handleImportDashboard = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setLoading(true);

    try {
      const dashboardData = await dashboardService.importDashboard(file);

      dispatch({
        type: 'LOAD_DASHBOARD',
        payload: {
          tdInfos: dashboardData.tdInfos,
          components: dashboardData.components,
          availableAffordances: dashboardData.availableAffordances,
          groups: dashboardData.groups || [], // Include groups if available
        },
      });

      // If the imported file contains a React Flow layout snapshot, store it
      if (dashboardData.layoutSnapshot) {
        dispatch({ type: 'SET_LAYOUT_SNAPSHOT', payload: dashboardData.layoutSnapshot });
      }

      navigate('/components');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import dashboard. Please check the file format.');
    } finally {
      setLoading(false);
    }

    // Reset the file input
    event.target.value = '';
  };

  return (
    <div className={`min-h-screen py-6 transition-colors duration-300`} style={{ backgroundColor: 'var(--bg-color)' }}>
      <div className="max-w-2xl mx-auto px-4">
        {/* Add to navbar, when adding to existing dashboard */}
        {state.components.length > 0 && (
          <div className={`mb-6 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} transition-colors duration-300`}>
            Adding to existing dashboard with {state.components.length} components from {state.tdInfos.length} TD{state.tdInfos.length !== 1 ? 's' : ''}
          </div>
        )}

        {error && (
          <div className={`mb-6 p-4 ${theme === 'dark' ? 'bg-red-900/50 border-red-700' : 'bg-red-50 border-red-200'} border rounded-lg transition-colors duration-300`}>
            <p className={`${theme === 'dark' ? 'text-red-300' : 'text-red-800'} transition-colors duration-300`}>{error}</p>
          </div>
        )}

        {/* URL Input */}
        <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border p-6 mb-6 transition-colors duration-300`}>
          <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4 transition-colors duration-300`}>From URL</h2>
          <form onSubmit={handleUrlSubmit} className="space-y-4">
            <div>
              <label htmlFor="url" className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2 transition-colors duration-300`}>
                Thing Description URL
              </label>
              <input
                type="url"
                id="url"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                placeholder="https://example.com/thing-description.json"
                className={`w-full px-3 py-2 border rounded-lg transition-colors duration-300 ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
                style={
                  {
                    '--tw-ring-color': 'var(--color-primary)',
                    'borderColor': 'var(--color-border)',
                  } as React.CSSProperties
                }
                onFocus={e => {
                  e.target.style.outline = '2px solid var(--color-primary)';
                  e.target.style.outlineOffset = '2px';
                }}
                onBlur={e => {
                  e.target.style.outline = 'none';
                }}
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !urlInput.trim()}
              className="w-full text-white font-medium py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100"
              style={{
                backgroundColor: loading || !urlInput.trim() ? (theme === 'dark' ? '#4B5563' : '#D1D5DB') : 'var(--color-primary)',
                cursor: loading || !urlInput.trim() ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={e => {
                if (!loading && urlInput.trim()) {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary-dark)';
                }
              }}
              onMouseLeave={e => {
                if (!loading && urlInput.trim()) {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary)';
                }
              }}
            >
              {loading ? 'Loading...' : 'Consume'}
            </button>
          </form>
        </div>

        {/* File Upload */}
        <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border p-6 transition-colors duration-300`}>
          <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4 transition-colors duration-300`}>From File</h2>

          {/* Thing Description Upload */}
          <div className="mb-6">
            <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'} mb-3 transition-colors duration-300`}>Thing Description</h3>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-300 cursor-pointer transform hover:scale-105 ${
                isDragActive
                  ? theme === 'dark'
                    ? 'border-gray-400 bg-gray-800/60'
                    : 'border-gray-500 bg-gray-100'
                  : theme === 'dark'
                    ? 'border-gray-600 hover:border-gray-500'
                    : 'border-gray-300 hover:border-gray-400'
              } ${loading ? 'pointer-events-none opacity-50' : ''}`}
              style={
                isDragActive
                  ? {
                      borderColor: 'var(--color-primary)',
                      backgroundColor: theme === 'dark' ? 'rgba(6, 115, 98, 0.1)' : 'rgba(6, 115, 98, 0.05)',
                    }
                  : {}
              }
            >
              <input {...getInputProps()} />
              <div className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                {loading ? (
                  <div>
                    <div className="text-lg font-medium">Processing...</div>
                  </div>
                ) : isDragActive ? (
                  <div>
                    <div className="text-lg font-medium">Drop the TD file here</div>
                  </div>
                ) : (
                  <div>
                    <div className="text-lg font-medium mb-2">Drag & drop a Thing Description file here</div>
                    <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-4 transition-colors duration-300`}>or click to select a file</div>
                    <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'} transition-colors duration-300`}>Supports .json and .jsonld files</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Dashboard Import */}
          <div>
            <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'} mb-3 transition-colors duration-300`}>Dashboard</h3>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-300 transform hover:scale-105 ${
                theme === 'dark' ? 'border-gray-600 hover:border-gray-500' : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <label className="cursor-pointer block">
                <div className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                  <div className="text-lg font-medium mb-2">Import Saved Dashboard</div>
                  <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-4 transition-colors duration-300`}>
                    Upload a previously exported dashboard file
                  </div>
                  <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'} transition-colors duration-300`}>Supports .json dashboard files</div>
                </div>
                <input type="file" accept=".json" onChange={handleImportDashboard} className="hidden" disabled={loading} />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
