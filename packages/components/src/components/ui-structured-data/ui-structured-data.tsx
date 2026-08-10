import { Component, Prop, State, Watch, h, Element } from '@stencil/core';

/**
 * @component ui-structured-data
 * @description A dual-mode component for exploring and editing complex JSON data. Appears as a tree view (Explorer) or a form (Writer).
 */
@Component({
    tag: 'ui-structured-data',
    styleUrl: 'ui-structured-data.css',
    shadow: true,
})
export class UiStructuredData {
    @Element() el: HTMLElement;

    // --- PROPS ---

    /** The Data to display. Can be a JSON string or an Object. */
    @Prop() data: any = {};

    /** Optional JSON Schema to drive the Writer form mode. */
    @Prop() schema: any = null;

    /** Display mode: 'explorer' (tree) | 'writer' (form) | 'json' (raw code). Default 'explorer'. */
    @Prop() mode: 'explorer' | 'writer' | 'json' = 'explorer';

    /** If true, allows editing in Explorer mode (inline). Writer mode is always editable. */
    @Prop() editable: boolean = false;

    /** Thing Description URL for automatic fetching/writing. */
    @Prop({ attribute: 'td-url' }) tdUrl: string;

    /** Generic source URL for fetching JSON directly (alternative to td-url). */
    @Prop() src: string;

    /** Title/Name of the root node or component. */
    @Prop() name: string;

    /** Property Name to bind to (if tdUrl is set). */
    @Prop({ attribute: 'td-property' }) tdProperty: string;

    /** Action Name to bind to (if tdUrl is set). */
    @Prop({ attribute: 'td-action' }) tdAction: string;

    /** Whether to show a save button (controlled) or auto-save. */
    @Prop() autoSave: boolean = false;

    /** Enable dark mode themes */
    @Prop({ reflect: true }) dark: boolean = false;

    // --- STATE ---

    @State() internalData: any = null;
    @State() internalSchema: any = null;
    @State() activeMode: 'explorer' | 'writer' | 'json' = 'explorer';
    @State() expandedPaths: Set<string> = new Set(['root']); // Open root by default
    @State() status: 'idle' | 'loading' | 'saving' | 'success' | 'error' = 'idle';
    @State() statusMessage: string = '';
    @State() lastUpdated: string = '';

    // For inline editing in Explorer
    @State() editingPath: string | null = null;
    @State() editValue: any = null;

    // --- LIFECYCLE ---

    async componentWillLoad() {
        // Ensure ui-text is available for the JSON mode
        if (customElements.get('ui-text') === undefined) {
            await customElements.whenDefined('ui-text').catch(() => { });
        }

        this.parseData();
        this.activeMode = this.mode;

        if (this.tdUrl || this.src) {
            await this.fetchData();
        }
    }

    @Watch('data')
    dataChanged() {
        this.parseData();
    }

    @Watch('schema')
    schemaChanged() {
        // If schema is string, parse it
        if (typeof this.schema === 'string') {
            try {
                this.internalSchema = JSON.parse(this.schema);
            } catch (e) {
                console.error('Invalid schema JSON', e);
            }
        } else {
            this.internalSchema = this.schema;
        }
    }

    @Watch('src')
    @Watch('tdUrl')
    urlChanged() {
        this.fetchData();
    }

    @Watch('mode')
    modePropChanged(newValue: 'explorer' | 'writer' | 'json') {
        this.activeMode = newValue;
    }

    parseData() {
        // If data is passed as prop, use it. If internalData is set from fetch, it might override unless prop updates.
        // We prioritize the prop if it changes, but if we are "live" (tdUrl), we prioritize the fetch result.
        // Only parse if we don't have partial edits?
        if (this.data !== undefined) {
            this.internalData = typeof this.data === 'string' ? JSON.parse(this.data) : this.data;
        }
    }

    // --- METHODS ---

    async fetchData() {
        const urlToFetch = this.src || this.tdUrl;
        if (!urlToFetch) return;

        this.status = 'loading';
        this.statusMessage = 'Fetching...';

        try {
            let url = urlToFetch;

            // If using tdUrl and specific property, construct the property URL
            // If just src, use as is.
            if (this.tdUrl && !this.src) {
                if (this.tdProperty) {
                    url = url.endsWith('/') ? url : url + '/';
                    url = `${url}properties/${this.tdProperty}`;
                } else if (this.tdAction) {
                    // Actions usually don't have state to fetch via GET usually, but maybe we want the schema?
                    // For now, assume we just want to send data for actions.
                    this.status = 'idle';
                    this.statusMessage = 'Ready to send';
                    return;
                }
            }

            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();

            this.internalData = json;
            this.status = 'success';
            this.statusMessage = 'Updated';
            this.lastUpdated = new Date().toLocaleTimeString();
        } catch (err) {
            this.status = 'error';
            this.statusMessage = err.message;
        }
    }

    async saveData() {
        if (!this.tdUrl) {
            console.warn('No TD URL provided for saving');
            return;
        }

        this.status = 'saving';
        this.statusMessage = 'Saving...';

        try {
            let url = this.tdUrl;
            let method = 'PUT'; // Default for properties

            if (this.tdProperty) {
                url = url.endsWith('/') ? url : url + '/';
                url = `${url}properties/${this.tdProperty}`;
            } else if (this.tdAction) {
                url = url.endsWith('/') ? url : url + '/';
                url = `${url}actions/${this.tdAction}`;
                method = 'POST';
            }

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.internalData)
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            this.status = 'success';
            this.statusMessage = 'Saved';
            this.lastUpdated = new Date().toLocaleTimeString();

            // Emit event
            const event = new CustomEvent('valueSubmitted', { detail: this.internalData });
            this.el.dispatchEvent(event);

        } catch (err) {
            this.status = 'error';
            this.statusMessage = err.message;
        }
    }

    // --- HELPERS ---

    getType(val: any): string {
        if (val === null) return 'null';
        if (Array.isArray(val)) return 'array';
        return typeof val;
    }

    updateDataAtPath(path: string[], value: any) {
        // Immutable update of internalData at specific path
        const newData = JSON.parse(JSON.stringify(this.internalData || {}));

        // If root
        if (path.length === 0 || (path.length === 1 && path[0] === 'root')) {
            this.internalData = value;
            return;
        }

        // Travel down
        let current = newData;
        for (let i = 0; i < path.length - 1; i++) {
            const key = path[i];
            if (key === 'root') continue; // skip root marker if present at start
            current = current[key];
        }
        const lastKey = path[path.length - 1];
        current[lastKey] = value;

        this.internalData = newData;
    }

    // --- EXPLORER RENDERERS ---

    toggleExpand(path: string, e: Event) {
        e.stopPropagation();
        const newSet = new Set(this.expandedPaths);
        if (newSet.has(path)) {
            newSet.delete(path);
        } else {
            newSet.add(path);
        }
        this.expandedPaths = newSet;
    }

    startEditing(path: string, value: any, e: Event) {
        e.stopPropagation();
        if (!this.editable) return;
        this.editingPath = path;
        this.editValue = value;
    }

    saveEdit(path: string, value: any) {
        // path is like "root.user.name"
        // We need to parse this path relative to internalData
        const cleanPath = path.split('.').slice(1); // remove 'root'
        this.updateDataAtPath(cleanPath, value);
        this.editingPath = null;
        this.editValue = null;
        if (this.autoSave) this.saveData();
    }

    renderExplorerNode(key: string, value: any, path: string, level: number = 0) {
        const type = this.getType(value);
        const isExpandable = type === 'object' || type === 'array';
        const isExpanded = this.expandedPaths.has(path);
        const indent = level * 20; // 20px indent

        if (isExpandable) {
            const count = type === 'array' ? value.length : Object.keys(value).length;
            const meta = type === 'array' ? `Array(${count})` : `{Object}`;

            return (
                <div class="tree-node">
                    <div class="node-row" onClick={(e) => this.toggleExpand(path, e)} style={{ paddingLeft: `${indent}px` }}>
                        <span class="expander">{isExpanded ? '▼' : '▶'}</span>
                        <span class="key">{key}:</span>
                        <span class="value-preview">{meta}</span>
                    </div>
                    {isExpanded && (
                        <div class="children">
                            {Object.entries(value).map(([k, v]) =>
                                this.renderExplorerNode(k, v, `${path}.${k}`, level + 1)
                            )}
                        </div>
                    )}
                </div>
            );
        } else {
            // Primitive
            const isEditing = this.editingPath === path;

            return (
                <div class="tree-node">
                    <div class="node-row" style={{ paddingLeft: `${indent}px` }}>
                        <span class="expander"></span> {/* Spacer */}
                        <span class="key">{key}:</span>
                        {isEditing ? (
                            <div class="edit-wrapper">
                                {type === 'boolean' ? (
                                    <input type="checkbox" checked={!!this.editValue} onChange={(e: any) => this.editValue = e.target.checked} />
                                ) : (
                                    <input
                                        class="tree-input"
                                        type={type === 'number' ? 'number' : 'text'}
                                        value={this.editValue}
                                        onInput={(e: any) => this.editValue = type === 'number' ? parseFloat(e.target.value) : e.target.value}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') this.saveEdit(path, this.editValue);
                                            if (e.key === 'Escape') this.editingPath = null;
                                        }}
                                    />
                                )}
                                <button class="btn-icon" onClick={() => this.saveEdit(path, this.editValue)}>✓</button>
                                <button class="btn-icon" onClick={() => this.editingPath = null}>✕</button>
                            </div>
                        ) : (
                            <span
                                class={`val ${type} ${this.editable ? 'editable' : ''}`}
                                onClick={(e) => this.startEditing(path, value, e)}
                                title={this.editable ? "Click to edit" : ""}
                            >
                                {String(value)}
                            </span>
                        )}
                    </div>
                </div>
            );
        }
    }

    // --- WRITER RENDERERS ---

    renderFormInput(key: string, value: any, schema: any, path: string[]) {
        // Determine type from schema or value
        let type = 'string';
        if (schema && schema.type) type = schema.type;
        else if (value !== undefined) type = this.getType(value);

        // Label
        const label = (schema && schema.title) || key;
        const desc = (schema && schema.description) || '';

        // Recursive Object
        if (type === 'object') {
            const properties = (schema && schema.properties) || (value ? Object.keys(value).reduce((acc, k) => ({ ...acc, [k]: {} }), {}) : {});
            return (
                <div class="form-field">
                    <div class="field-label">{label}</div>
                    {desc && <div class="field-desc">{desc}</div>}
                    <div class="nested">
                        {Object.keys(properties).map(propKey =>
                            this.renderFormInput(propKey, value ? value[propKey] : undefined, properties[propKey], [...path, propKey])
                        )}
                    </div>
                </div>
            );
        }

        // Recursive Array
        if (type === 'array') {
            const items = value || [];
            const itemSchema = schema ? schema.items : {};
            return (
                <div class="form-field">
                    <div class="field-label">
                        {label}
                        <button class="btn-icon" onClick={() => {
                            const newArr = [...items, null]; // Add placeholder
                            this.updateDataAtPath(path, newArr);
                        }}>+</button>
                    </div>
                    {desc && <div class="field-desc">{desc}</div>}
                    <div class="nested">
                        {items.map((item, idx) => (
                            <div class="array-item">
                                <div class="array-item-content">
                                    {this.renderFormInput(`${idx}`, item, itemSchema, [...path, idx.toString()])}
                                </div>
                                <button class="btn-icon" onClick={() => {
                                    const newArr = [...items];
                                    newArr.splice(idx, 1);
                                    this.updateDataAtPath(path, newArr);
                                }}>trash</button>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        // Primitives
        return (
            <div class="form-field">
                <label class="field-label">{label}</label>
                {desc && <div class="field-desc">{desc}</div>}

                {type === 'boolean' ? (
                    <input
                        type="checkbox"
                        checked={!!value}
                        onChange={(e: any) => this.updateDataAtPath(path, e.target.checked)}
                    />
                ) : type === 'number' || type === 'integer' ? (
                    <input
                        class="form-input"
                        type="number"
                        value={value}
                        onInput={(e: any) => this.updateDataAtPath(path, parseFloat(e.target.value))}
                    />
                ) : (
                    <input
                        class="form-input"
                        type="text"
                        value={value || ''}
                        onInput={(e: any) => this.updateDataAtPath(path, e.target.value)}
                    />
                )}
            </div>
        );
    }


    render() {
        return (
            <div class="container">
                {/* Toolbar */}
                <div class="toolbar">
                    <div class="toolbar-group">
                        <div class="mode-toggle">
                            <button
                                class={`mode-btn ${this.activeMode === 'explorer' ? 'active' : ''}`}
                                onClick={() => this.activeMode = 'explorer'}
                            >Explorer</button>
                            <button
                                class={`mode-btn ${this.activeMode === 'writer' ? 'active' : ''}`}
                                onClick={() => this.activeMode = 'writer'}
                            >Writer</button>
                            <button
                                class={`mode-btn ${this.activeMode === 'json' ? 'active' : ''}`}
                                onClick={() => this.activeMode = 'json'}
                            >JSON</button>
                        </div>
                    </div>
                    <div class="toolbar-group">
                        {/* Save Button only if manual save is needed (tdUrl present) */}
                        {this.tdUrl && !this.autoSave && (
                            <button class="action-btn primary" onClick={() => this.saveData()}>
                                Save
                            </button>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div class="content">
                    {this.name && <div style={{ fontWeight: 'bold', marginBottom: '8px', borderBottom: '1px solid #eee', paddingBottom: '4px' }}>{this.name}</div>}

                    {this.activeMode === 'explorer' && (
                        this.renderExplorerNode('root', this.internalData || {}, 'root')
                    )}

                    {this.activeMode === 'writer' && (
                        this.renderFormInput('Root', this.internalData, this.internalSchema, [])
                    )}

                    {this.activeMode === 'json' && (
                        <ui-text
                            key={this.lastUpdated || 'json-view'} // Force re-render on updates
                            mode="structured"
                            value={this.internalData ? JSON.stringify(this.internalData, null, 2) : '{}'}
                            showLineNumbers={true}
                            variant="minimal"
                            dark={this.dark}
                            style={{ '--ui-text-font-size': '12px' }}
                        ></ui-text>
                    )}
                </div>

                {/* Status Bar */}
                <div class="status-bar">
                    <span>Status: {this.status} {this.statusMessage ? `- ${this.statusMessage}` : ''}</span>
                    <span>{this.lastUpdated ? `Last updated: ${this.lastUpdated}` : ''}</span>
                </div>
            </div>
        );
    }
}
