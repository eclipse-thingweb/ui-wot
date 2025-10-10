import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { WoTComponent } from '../types';
import { getSuggestedComponentOrder } from '../utils/component-integration';
import { useNavbar } from '../context/NavbarContext';

export function AffordanceSelectionPage() {
  const { state, dispatch } = useAppContext();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { setContent, clear } = useNavbar();
  const [selectedAffordances, setSelectedAffordances] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedComponentMap, setSelectedComponentMap] = useState<Record<string, string>>({});

  const handleAffordanceToggle = (affordanceKey: string) => {
    setSelectedAffordances(prev => (prev.includes(affordanceKey) ? prev.filter(key => key !== affordanceKey) : [...prev, affordanceKey]));
  };

  const handleSelectAll = () => {
    setSelectedAffordances(state.availableAffordances.map(a => a.key));
  };

  const handleSelectNone = () => {
    setSelectedAffordances([]);
  };

  const handleComponentChoice = (affordanceKey: string, componentType: string) => {
    setSelectedComponentMap(prev => ({ ...prev, [affordanceKey]: componentType }));
  };

  const handleLoad = async () => {
    if (selectedAffordances.length === 0) return;
    if (!state.parsedTD) return;

    setLoading(true);

    try {
      // Reset previous selection if loading a new TD
      dispatch({ type: 'SELECT_AFFORDANCES', payload: [] });
      setSelectedComponentMap({});
      // Active TD URL for components wiring
      const foundTdInfo = state.tdInfos.find(t => t.td === state.parsedTD) || state.tdInfos[0];
      const tdUrl = (foundTdInfo?.source.type === 'url' ? (foundTdInfo.source.content as string) : undefined) || undefined;
      const activeTdId = state.activeTdId || foundTdInfo?.id || (state.tdInfos.length > 0 ? state.tdInfos[0].id : 'default');
      const activeTdInfo = state.tdInfos.find(td => td.id === activeTdId);

      // Create components for selected affordances
      const components: WoTComponent[] = selectedAffordances
        .map((affordanceKey, index) => {
          const affordance = state.availableAffordances.find(a => a.key === affordanceKey);
          if (!affordance) return null;

          return {
            id: `${affordanceKey}-${Date.now()}-${index}`,
            type: affordance.type,
            title: affordance.title || affordanceKey,
            name: affordanceKey,
            description: affordance.description,
            schema: affordance.schema,
            uiComponent: selectedComponentMap[affordance.key] || affordance.suggestedComponent,
            layout: {
              i: `${affordanceKey}-${Date.now()}-${index}`,
              x: (index % 6) * 2,
              y: Math.floor(index / 6) * 2,
              w: 2,
              h: 2,
              minW: 2,
              minH: 2,
            },
            thing: undefined,
            affordanceKey,
            tdId: activeTdId,
            tdUrl: tdUrl,
          };
        })
        .filter(Boolean) as WoTComponent[];

      // Create a group for these components
      if (components.length > 0) {
        const groupId = `group-${activeTdId}-${Date.now()}`;

        // Create the affordance group
        const group = {
          id: groupId,
          tdId: activeTdId,
          title: activeTdInfo?.title || state.parsedTD?.title || 'Device Group',
          description: `Components from ${activeTdInfo?.title || state.parsedTD?.title}`,
          layout: {
            i: groupId,
            x: 0,
            y: Math.max(0, ...state.components.map(c => c.layout.y + c.layout.h), ...state.groups.map(g => g.layout.y + g.layout.h)),
            w: Math.max(10, Math.min(16, components.length * 2 + 4)),
            h: Math.ceil(components.length / 6) * 3 + 3,
            minW: 8,
            minH: 6,
          },
          options: {
            visible: true,
            borderStyle: 'solid' as const,
            backgroundColor: '#f8fafc',
            headerColor: '#f8fafc',
            collapsed: false,
            hideWrapper: false,
          },
          affordanceIds: components.map(c => c.id),
          innerLayout: components.map((comp, idx) => ({
            i: comp.id,
            // Place items in 6-column rows by default to avoid overlap
            x: (idx * 6) % 24,
            y: Math.floor((idx * 6) / 24) * 4,
            w: Math.max(4, comp.layout.w || 4),
            h: Math.max(3, comp.layout.h || 3),
          })),
          minSize: {
            width: 400,
            height: 300,
          },
        };

        // Add group to state
        dispatch({ type: 'ADD_GROUP', payload: group });
      }

      // Add components to state
      components.forEach(component => {
        dispatch({ type: 'ADD_COMPONENT', payload: component });
      });

      dispatch({ type: 'SELECT_AFFORDANCES', payload: selectedAffordances });
      navigate('/components');
    } catch (error) {
      console.error('Failed to load affordances:', error);
    } finally {
      setLoading(false);
    }
  };

  const navbarInfo = useMemo(() => {
    const tdTitle = state.parsedTD?.title || 'Thing';
    const suffix = state.components.length > 0 ? ` (Adding to existing dashboard with ${state.components.length} components)` : '';
    return (
      <span>
        {tdTitle} – Choose which affordances to include{suffix}
      </span>
    );
  }, [state.parsedTD, state.components.length]);

  useEffect(() => {
    setContent({
      info: navbarInfo,
      actions: (
        <>
          <button
            onClick={handleSelectAll}
            className="font-medium transition-colors duration-300"
            style={{ color: 'var(--color-primary)' }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--color-primary-dark)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--color-primary)';
            }}
          >
            Select All
          </button>
          <span className={theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}>|</span>
          <button
            onClick={handleSelectNone}
            className={`${theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-700'} font-medium transition-colors duration-300`}
          >
            Select None
          </button>
          <span className={theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}>|</span>
          <button
            onClick={handleLoad}
            disabled={selectedAffordances.length === 0 || loading || !state.parsedTD}
            className="text-white font-medium py-1.5 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100"
            style={{
              backgroundColor: selectedAffordances.length === 0 || loading || !state.parsedTD ? (theme === 'dark' ? '#4B5563' : '#D1D5DB') : 'var(--color-primary)',
              cursor: selectedAffordances.length === 0 || loading || !state.parsedTD ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={e => {
              if (selectedAffordances.length > 0 && !loading && state.parsedTD) {
                e.currentTarget.style.backgroundColor = 'var(--color-primary-dark)';
              }
            }}
            onMouseLeave={e => {
              if (selectedAffordances.length > 0 && !loading && state.parsedTD) {
                e.currentTarget.style.backgroundColor = 'var(--color-primary)';
              }
            }}
          >
            {loading ? 'Loading…' : `Load (${selectedAffordances.length})`}
          </button>
        </>
      ),
    });
    return () => clear();
  }, [navbarInfo, selectedAffordances.length, loading, state.parsedTD, setContent, clear, theme]);

  return (
    <div className={`min-h-screen transition-colors duration-300`} style={{ backgroundColor: 'var(--bg-color)' }}>
      {/* Affordances Grid */}
      <div className="page-container affordances-page py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {state.availableAffordances.map(affordance => (
            <div
              key={affordance.key}
              className={`rounded-lg border-2 transition-all duration-300 cursor-pointer hover:shadow-md transform hover:scale-105 ${
                theme === 'dark' ? 'bg-gray-800' : 'bg-white'
              } ${
                selectedAffordances.includes(affordance.key)
                  ? theme === 'dark'
                    ? 'border-gray-500'
                    : 'border-gray-400'
                  : theme === 'dark'
                    ? 'border-gray-700 hover:border-gray-600'
                    : 'border-gray-200 hover:border-gray-300'
              }`}
              style={
                selectedAffordances.includes(affordance.key)
                  ? {
                      borderColor: 'var(--color-primary)',
                      backgroundColor: theme === 'dark' ? 'rgba(6, 115, 98, 0.1)' : 'rgba(6, 115, 98, 0.05)',
                    }
                  : {}
              }
              onClick={() => handleAffordanceToggle(affordance.key)}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    <div>
                      <h3 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'} transition-colors duration-300`}>
                        {affordance.title}
                        {affordance.type === 'property' && (affordance as any).schema && (affordance as any).schema.type ? (
                          <span className={`ml-2 text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>({(affordance as any).schema.type})</span>
                        ) : null}
                      </h3>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} capitalize transition-colors duration-300`}>{affordance.type}</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedAffordances.includes(affordance.key)}
                    onChange={() => handleAffordanceToggle(affordance.key)}
                    className={`w-4 h-4 rounded transition-colors duration-300 ${theme === 'dark' ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-white'}`}
                    style={{
                      accentColor: 'var(--color-primary)',
                    }}
                    onFocus={e => {
                      e.target.style.outline = '2px solid var(--color-primary)';
                      e.target.style.outlineOffset = '2px';
                    }}
                    onBlur={e => {
                      e.target.style.outline = 'none';
                    }}
                  />
                </div>

                {affordance.description && (
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-3 transition-colors duration-300`}>{affordance.description}</p>
                )}

                <div className="flex items-center justify-start">
                  <div className="flex items-center space-x-2">
                    {(() => {
                      const orderedOptions = getSuggestedComponentOrder(affordance);
                      const defaultValue = selectedComponentMap[affordance.key] || affordance.suggestedComponent || orderedOptions[0];
                      return (
                        <select
                          value={defaultValue}
                          onChange={e => handleComponentChoice(affordance.key, e.target.value)}
                          className={`text-sm border rounded px-2 py-1 transition-colors duration-300 ${
                            theme === 'dark' ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-200 bg-white text-gray-900'
                          }`}
                          onClick={e => e.stopPropagation()}
                        >
                          {orderedOptions.map(pc => (
                            <option key={pc} value={pc}>
                              {pc}
                            </option>
                          ))}
                        </select>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {state.availableAffordances.length === 0 && (
          <div className="text-center py-12">
            <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} transition-colors duration-300`}>No affordances found in the Thing Description.</p>
          </div>
        )}
      </div>
    </div>
  );
}
