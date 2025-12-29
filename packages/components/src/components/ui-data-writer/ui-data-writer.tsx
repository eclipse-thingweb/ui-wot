import { Component, Prop, State, h, Event, EventEmitter, Method, Element } from '@stencil/core';
import { StatusIndicator, OperationStatus } from '../../utils/status-indicator';

/**
 * A data writer component for editing structured data (JSON) with nested forms.
 */
@Component({
  tag: 'ui-data-writer',
  styleUrl: 'ui-data-writer.css',
  shadow: true,
})
export class UiDataWriter {
  @Element() el: HTMLElement;

  /** The initial data object to edit */
  @Prop() data: any = {};

  /** Label for the root form */
  @Prop() label?: string;

  /** Disable user interaction when true */
  @Prop() disabled: boolean = false;

  /** Read only mode */
  @Prop() readonly: boolean = false;

  /** Show last updated timestamp below the component */
  @Prop() showLastUpdated: boolean = false;

  /** Show visual operation status indicators */
  @Prop() showStatus: boolean = true;

  /** Dark mode */
  @Prop() dark: boolean = false;

  /** Internal editable state */
  @State() editableData: any;

  /** Current operation status */
  @State() operationStatus: OperationStatus = 'idle';

  /** Error message */
  @State() lastError?: string;

  /** Timestamp */
  @State() lastUpdatedTs: number = Date.now();

  /** Internal state counter for timestamp re-rendering */
  @State() private timestampCounter: number = 0;
  private timestampUpdateTimer?: number;

  /** Stores API function */
  private storedWriteOperation?: (value: any) => Promise<any>;

  /** Emitted when data changes */
  @Event() dataChanged: EventEmitter<any>;

  componentWillLoad() {
    this.editableData = this.cloneData(this.data);
    if (this.showLastUpdated) this.startTimestampUpdater();
  }

  disconnectedCallback() {
    this.stopTimestampUpdater();
  }

  private cloneData(data: any) {
    if (!data) return {};
    return JSON.parse(JSON.stringify(data));
  }

  /**
   * Sets the object value with optional device communication api and other options.
   */
  @Method()
  async setValue(
    value: any,
    options?: {
      writeOperation?: (value: any) => Promise<any>;
    }
  ): Promise<boolean> {
    if (options?.writeOperation) {
      this.storedWriteOperation = options.writeOperation;
    }
    this.editableData = this.cloneData(value);
    this.lastUpdatedTs = Date.now();
    return true;
  }

  /**
   * Gets the current object value.
   */
  @Method()
  async getValue(): Promise<any> {
    return this.editableData;
  }

  /**
   * Saving functionality
   */
  @Method()
  async save(): Promise<boolean> {
    if (!this.storedWriteOperation) {
      console.warn('No write operation configured via setValue');
      // Just simulate success for local demo if no operation
      StatusIndicator.applyStatus(this, 'success');
      return true;
    }
    try {
      StatusIndicator.applyStatus(this, 'loading');
      await this.storedWriteOperation(this.editableData);
      StatusIndicator.applyStatus(this, 'success');
      this.lastUpdatedTs = Date.now();
      return true;
    } catch (e: any) {
      StatusIndicator.applyStatus(this, 'error', e.message);
      return false;
    }
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

  private handleFieldChange(path: string[], value: any) {
    if (this.disabled || this.readonly) return;
    this.editableData = this.updateNestedValue(this.editableData, path, value);
    this.dataChanged.emit(this.editableData);
  }

  private updateNestedValue(obj: any, path: string[], value: any): any {
    if (path.length === 0) return value;
    const [head, ...tail] = path;
    const newObj = Array.isArray(obj) ? [...obj] : { ...obj };
    newObj[head] = this.updateNestedValue(newObj[head] ?? {}, tail, value);
    return newObj;
  }

  render() {
    return (
      <div class={`data-writer ${this.dark ? 'dark' : ''}`}>
        <div class="header">
          {this.label && <h3>{this.label}</h3>}
          {this.showStatus && StatusIndicator.renderStatusBadge(this.operationStatus, this.lastError, h)}
        </div>
        {this.renderForm(this.editableData, [])}
        <div class="controls">
          <ui-button label="Save" onClick={() => this.save()} disabled={this.disabled || this.readonly}></ui-button>
        </div>
        {this.showLastUpdated && <div class="mt-2 text-xs text-gray-500">{StatusIndicator.renderTimestamp(new Date(this.lastUpdatedTs), this.dark ? 'dark' : 'light', h)}</div>}
      </div>
    );
  }

  // Recursive form renderer
  private renderForm(data: any, path: string[]) {
    if (data === null || typeof data !== 'object') {
      return this.renderInput(data, path);
    }

    return (
      <div class="field-group">
        {Object.keys(data).map(key => {
          const currentPath = [...path, key];
          const value = data[key];
          const isObject = value !== null && typeof value === 'object';
          const label = key.charAt(0).toUpperCase() + key.slice(1);

          return (
            <div class="field">
              <label>{label}</label>
              {isObject ? (
                this.renderForm(value, currentPath)
              ) : (
                this.renderInput(value, currentPath, typeof value === 'number' ? 'number' : 'text')
              )}
            </div>
          );
        })}
      </div>
    );
  }

  private renderInput(value: any, path: string[], type: string = 'text') {
    return (
      <input
        type={type}
        value={value}
        disabled={this.disabled || this.readonly}
        onInput={(e: any) => {
          const val = type === 'number' ? parseFloat(e.target.value) : e.target.value;
          this.handleFieldChange(path, val);
        }}
        class={this.dark ? 'input-dark' : 'input-light'}
        style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
      />
    );
  }
}
