import { Component, Prop, h, State, Method, Element } from '@stencil/core';
import { StatusIndicator } from '../../utils/status-indicator';

@Component({
    tag: 'ui-data-explorer',
    styleUrl: 'ui-data-explorer.css',
    shadow: true,
})
export class UiDataExplorer {
    @Element() el: HTMLElement;

    @Prop() data: any;
    /** Label for the root object */
    @Prop() label?: string;
    /** Start expanded? */
    @Prop() expanded: boolean = false;
    /** Show last updated timestamp below the component */
    @Prop() showLastUpdated: boolean = false;
    /** Dark mode */
    @Prop() dark: boolean = false;

    @State() lastUpdatedTs: number = Date.now();
    @State() private timestampCounter: number = 0;
    private timestampUpdateTimer?: number;

    componentWillLoad() {
        if (this.showLastUpdated) this.startTimestampUpdater();
    }

    disconnectedCallback() {
        this.stopTimestampUpdater();
    }

    private startTimestampUpdater() {
        this.stopTimestampUpdater();
        if (this.showLastUpdated) {
            this.timestampUpdateTimer = window.setInterval(() => this.timestampCounter++, 60000);
        }
    }

    private stopTimestampUpdater() {
        if (this.timestampUpdateTimer) {
            clearInterval(this.timestampUpdateTimer);
            this.timestampUpdateTimer = undefined;
        }
    }

    /**
     * Sets the object value.
     */
    @Method()
    async setValue(value: any): Promise<boolean> {
        this.data = value; // Direct update since it's a Prop
        this.lastUpdatedTs = Date.now();
        return true;
    }

    /**
     * Gets the current object value.
     */
    @Method()
    async getValue(): Promise<any> {
        return this.data;
    }

    render() {
        return (
            <div class={`data-explorer ${this.dark ? 'dark' : ''}`}>
                {this.renderData(this.data, this.label, this.expanded)}
                {this.showLastUpdated && <div class="mt-2 text-xs text-gray-500">{StatusIndicator.renderTimestamp(new Date(this.lastUpdatedTs), this.dark ? 'dark' : 'light', h)}</div>}
            </div>
        );
    }

    private renderData(data: any, key?: string, expanded: boolean = false) {
        const isObject = data !== null && typeof data === 'object';
        const isArray = Array.isArray(data);

        if (!isObject) {
            return (
                <div class="node primitive">
                    {key && <span class="key">{key}: </span>}
                    <span class={`value ${typeof data}`}>{JSON.stringify(data)}</span>
                </div>
            );
        }

        const isEmpty = isArray ? data.length === 0 : Object.keys(data).length === 0;
        const preview = isArray ? `Array(${data.length})` : Object.keys(data).length <= 5 ? `{ ${Object.keys(data).join(', ')} }` : 'Object';

        if (isEmpty) {
            return (
                <div class="node">
                    {key && <span class="key">{key}: </span>}
                    <span class="separator">{isArray ? '[]' : '{}'}</span>
                </div>
            )
        }

        return (
            <details class="node" open={expanded}>
                <summary class="toggle-btn">
                    {key && <span class="key">{key}: </span>}
                    <span class="separator">{isArray ? '[' : '{'}</span>
                    {!expanded && <span style={{ fontSize: '0.8em', color: '#666', marginLeft: '5px' }}>{preview}</span>}
                </summary>
                <div style={{ paddingLeft: '1.5rem' }}>
                    {isArray
                        ? data.map((item, index) => this.renderData(item, String(index), false))
                        : Object.keys(data).map((k) => this.renderData(data[k], k, false))}
                </div>
                <div style={{ marginLeft: '0.25rem' }}>
                    <span class="separator">{isArray ? ']' : '}'}</span>
                </div>
            </details>
        );
    }
}
