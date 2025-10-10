import { Component, Prop, State, Element, h, Method } from '@stencil/core';
import { StatusIndicator, OperationStatus } from '../../utils/status-indicator'; // Status indicator utility

/**
 * A versatile object component designed for WoT device to handle object type TD properties.
 *
 * It auto-generates an editor interface for TD object-type properties with save button to push
 * all the changes at once.
 * It also features status indicators, last updated timestamps.
 *
 * @example Basic Usage
 * ```html
 * <ui-object variant="outlined" label="Device Settings"></ui-object>
 * <ui-object variant="filled" show-last-updated="true" show-status="true"></ui-object>
 * <ui-object readonly="true" label="System Status" dark="true"></ui-object>
 * ```
 *
 * @example JS integration with node-wot browser bundle
 * ```javascript
 * const objectEditor = document.getElementById('device-config');
 * const initialValue = await (await thing.readProperty('configuration')).value();
 *
 * await objectEditor.setValue(initialValue, {
 *   writeOperation: async value => {
 *     await thing.writeProperty('configuration', value);
 *   }
 * });
 * ```
 */

@Component({
  tag: 'ui-object',
  styleUrl: 'ui-object.css',
  shadow: true,
})
export class UiObject {
  @Element() el!: HTMLElement;

  // ============================== COMPONENT PROPERTIES ==============================

  /**
   * Visual style variant of the object editor.
   * - outlined: Border around container (default)
   * - filled: Background-filled container with border
   */
  @Prop() variant: 'outlined' | 'filled' = 'outlined';

  /** Color theme for the active state matching to thingsweb theme */
  @Prop() color: 'primary' | 'secondary' | 'neutral' = 'primary';

  /** Enable dark mode theme styling when true */
  @Prop() dark: boolean = false;

  /** Disable user interaction when true */
  @Prop() disabled: boolean = false;

  /** Text label displayed above the object editor (optional) */
  @Prop() label?: string;

  /** Read only mode, display value but prevent changes when true. Just to monitor changes*/
  @Prop({ mutable: true }) readonly: boolean = false;

  /** Show last updated timestamp below the component */
  @Prop() showLastUpdated: boolean = false;

  /** Show visual operation status indicators (loading, success, failed) right to the component */
  @Prop() showStatus: boolean = true;

  // ============================== COMPONENT STATE ==============================

  /** Derived field definitions from object value shape and types */
  @State() private fields: Array<{ name: string; type: string; minimum?: number; maximum?: number }> = [];

  /** Current object value from device/server */
  @State() private value: any = {};

  /** Local editing buffer for user changes before Save */
  @State() private editing: any = {};

  /** Current operation status for visual feedback */
  @State() private operationStatus: OperationStatus = 'idle';

  /** Error message from failed operations if any (optional) */
  @State() lastError?: string;

  /** Timestamp when value was last updated (optional) */
  @State() private lastUpdatedTs?: number;

  /** Internal state counter for timestamp re-rendering */
  @State() private timestampCounter: number = 0;

  // ============================== PRIVATE PROPERTIES ==============================

  /** Tracks bound child elements to prevent duplicate setValue calls */
  private boundElements: WeakSet<Element> = new WeakSet();

  /** Timer for updating relative timestamps */
  private timestampUpdateTimer?: number;

  /** Stores API function from first initialization to re-use further for any user interactions */
  private storedWriteOperation?: (value: any) => Promise<any>;

  // ============================== PUBLIC METHODS ==============================

  /**
   * Sets the object value with optional device communication api and other options.
   *
   * This is the primary method for connecting object editors to real devices.
   * It supports optimistic updates, error handling, and stores write operations for Save button.
   *
   * @param value - The object value to set
   * @param options - Optional configuration for device communication and behavior
   * @returns Promise resolving to true if successful, false if failed
   *
   * @example Basic Usage
   * ```javascript
   * await objectEditor.setValue({ temperature: 22, humidity: 45 });
   * ```
   *
   * @example JS integration with node-wot browser bundle
   * ```javascript
   * const objectEditor = document.getElementById('device-config');
   * const initialValue = await (await thing.readProperty('configuration')).value();
   * await objectEditor.setValue(initialValue, {
   *   writeOperation: async value => {
   *     await thing.writeProperty('configuration', value);
   *   }
   * });
   * ```
   */
  @Method()
  async setValue(
    value: any,
    options?: {
      writeOperation?: (value: any) => Promise<any>;
      readOperation?: () => Promise<any>;
      optimistic?: boolean;
      _isRevert?: boolean;
    },
  ): Promise<boolean> {
    // Clear any existing error state
    if (this.operationStatus === 'error' && !options?._isRevert) {
      StatusIndicator.applyStatus(this as any, 'idle');
    }

    // Store write operation for Save button functionality (setup phase)
    if (options?.writeOperation && !options._isRevert) {
      this.storedWriteOperation = options.writeOperation;
      StatusIndicator.applyStatus(this as any, 'loading');

      try {
        this.updateFromValue(value);
        StatusIndicator.applyStatus(this as any, 'success');
        return true;
      } catch (e: any) {
        StatusIndicator.applyStatus(this as any, 'error', e?.message || 'Setup failed');
        return false;
      }
    }

    // Simple state update without other operations
    this.updateFromValue(value);
    return true;
  }

  /**
   * Gets the current object value with optional metadata.
   *
   * @param includeMetadata - Whether to include status, timestamp and other information
   * @returns Current value or detailed metadata object
   */
  @Method()
  async getValue(includeMetadata: boolean = false): Promise<any | { value: any; lastUpdated?: number; status: string; error?: string }> {
    if (includeMetadata) {
      return {
        value: this.value,
        lastUpdated: this.lastUpdatedTs,
        status: this.operationStatus,
        error: this.lastError,
      };
    }
    return this.value;
  }

  /**
   * Executes the stored write operation to save the complete object to the device.
   *
   * Combines all field changes into a single object and sends it via the configured
   * write operation. Handles type coercion and error states automatically.
   *
   * @returns Promise resolving to true if successful, false if failed
   */
  @Method()
  async save(): Promise<boolean> {
    if (!this.storedWriteOperation) {
      StatusIndicator.applyStatus(this, 'error', 'No operation configured - setup may have failed');
      return false;
    }
    try {
      StatusIndicator.applyStatus(this, 'loading');
      const payload: any = {};
      if (this.fields.length === 0) {
        const source = this.editing && Object.keys(this.editing).length ? this.editing : this.value;
        if (source && typeof source === 'object') {
          for (const k of Object.keys(source)) payload[k] = (source as any)[k];
        }
      } else {
        // Coerce values according to derived field types to avoid server validation errors
        for (const f of this.fields) {
          const raw = (this.editing as any)[f.name];
          if (f.type === 'boolean') payload[f.name] = Boolean(raw);
          else if (f.type === 'integer') payload[f.name] = Number.isFinite(raw) ? Math.round(raw) : parseInt(String(raw), 10);
          else if (f.type === 'number') payload[f.name] = Number(raw);
          else payload[f.name] = typeof raw === 'undefined' || raw === null ? '' : String(raw);
        }
      }
      await this.storedWriteOperation(payload);
      this.value = { ...payload };
      StatusIndicator.applyStatus(this, 'success');
      this.lastUpdatedTs = Date.now();
      return true;
    } catch (err: any) {
      StatusIndicator.applyStatus(this, 'error', err?.message || String(err));
      return false;
    }
  }

  /**
   * This method updates the value silently without triggering events.
   *
   * Use this for external data synchronization to prevent event loops.
   * Perfect for WebSocket updates or polling from remote devices.
   *
   * @param value - The object value to set silently
   */
  @Method()
  async setValueSilent(value: any): Promise<void> {
    this.updateFromValue(value);
  }

  // ============================== LIFECYCLE METHODS ==============================

  /** Initialize component state from props */
  componentWillLoad() {
    if (this.showLastUpdated) this.startTimestampUpdater();
  }

  /** Bind local write operations to child components once rendered */
  componentDidLoad() {
    // Ensure subfields operate in local-edit mode
    this.ensureLocalWriteOps();
  }

  /** Re-bind local write operations for any newly rendered children */
  componentDidRender() {
    // In case fields render later, bind write ops once per element
    this.ensureLocalWriteOps();
  }

  /** Clean up timers when component is removed */
  disconnectedCallback() {
    this.stopTimestampUpdater();
  }
  // ============================== PRIVATE METHODS ==============================

  /** Handles field value changes and updates the editing buffer */
  private onFieldChange = (name: string, newVal: any) => {
    this.editing = { ...this.editing, [name]: newVal };
  };

  /**
   * This is the core state update method that handles value changes.
   * It updates internal state, derives field definitions, and manages local changes tracking.
   */
  private updateFromValue(value: any) {
    const v = value && typeof value === 'object' ? value : {};
    const prev = this.value;
    const hasLocalChanges = (() => {
      try {
        return JSON.stringify(prev) !== JSON.stringify(this.editing);
      } catch {
        return true;
      }
    })();
    this.value = v;

    // Derive field definitions from current value shape and JavaScript types
    this.fields = Object.keys(v).map(name => {
      const t = typeof v[name];
      let type: string = t;
      if (t === 'number' && Number.isInteger(v[name])) type = 'integer';
      if (t === 'object') type = 'string'; // Fallback to text for nested/unknown types
      return { name, type };
    });

    // If user hasn't made local changes relative to previous value, sync editing to new value
    if (!hasLocalChanges) this.editing = { ...v };
    this.lastUpdatedTs = Date.now();
    this.startTimestampUpdater();
  }

  // Bind a no-op writeOperation to child inputs so they don't error on interaction
  private async ensureLocalWriteOps() {
    const root = this.el.shadowRoot;
    if (!root) return;
    const elems = root.querySelectorAll('ui-toggle, ui-slider, ui-number-picker, ui-text');
    const tasks: Promise<any>[] = [];
    elems.forEach((el: any) => {
      if (this.boundElements.has(el)) return;
      this.boundElements.add(el);
      const tag = (el.tagName || '').toLowerCase();
      const noop = async () => {};
      try {
        if (tag === 'ui-toggle') {
          tasks.push(el.setValue(Boolean(el.value), { writeOperation: noop }));
        } else if (tag === 'ui-slider') {
          const v = typeof el.value === 'number' ? el.value : Number(el.value) || 0;
          tasks.push(el.setValue(v, { writeOperation: noop }));
        } else if (tag === 'ui-number-picker') {
          const v = typeof el.value === 'number' ? el.value : Number(el.value) || 0;
          tasks.push(el.setValue(v, { writeOperation: noop }));
        } else if (tag === 'ui-text') {
          tasks.push(el.setValue(String(el.value ?? ''), { writeOperation: noop }));
        }
      } catch {
        // ignore binding errors
      }
    });
    if (tasks.length) await Promise.allSettled(tasks);
  }

  /** Manages timestamp update timer for relative time display */
  private startTimestampUpdater() {
    this.stopTimestampUpdater();
    if (this.showLastUpdated) {
      this.timestampUpdateTimer = window.setInterval(() => this.timestampCounter++, 60000); //  Update every minute
    }
  }

  /** Stops the timestamp update timer */
  private stopTimestampUpdater() {
    if (this.timestampUpdateTimer) {
      clearInterval(this.timestampUpdateTimer);
      this.timestampUpdateTimer = undefined;
    }
  }

  // ============================== RENDERING HELPERS ==============================

  /** Render a single sub-field using appropriate child component based on field type */
  private renderField(f: { name: string; type: string; minimum?: number; maximum?: number }) {
    const val = this.editing?.[f.name];
    const common = {
      'show-last-updated': false,
      'show-status': false,
      'disabled': this.disabled,
      'readonly': this.readonly,
      'color': this.color,
      'dark': this.dark,
    } as any;

    // Boolean fields use toggle components
    if (f.type === 'boolean') {
      return <ui-toggle {...common} value={!!val} onValueMsg={(e: CustomEvent<any>) => this.onFieldChange(f.name, e.detail?.newVal)} />;
    }

    // Integer fields use number picker with step=1
    if (f.type === 'integer') {
      const min = typeof f.minimum === 'number' ? f.minimum : 0;
      const max = typeof f.maximum === 'number' ? f.maximum : 100;
      const step = 1;
      return (
        <ui-number-picker
          {...common}
          min={String(min)}
          max={String(max)}
          step={String(step)}
          value={typeof val === 'number' ? val : min}
          onValueMsg={(e: CustomEvent<any>) => this.onFieldChange(f.name, e.detail?.newVal)}
        />
      );
    }

    // Number fields use slider with step=0.1
    if (f.type === 'number') {
      const min = typeof f.minimum === 'number' ? f.minimum : 0;
      const max = typeof f.maximum === 'number' ? f.maximum : 100;
      const step = 0.1;
      return (
        <ui-slider
          {...common}
          min={String(min)}
          max={String(max)}
          step={String(step)}
          value={typeof val === 'number' ? val : min}
          onValueMsg={(e: CustomEvent<any>) => this.onFieldChange(f.name, e.detail?.newVal)}
        />
      );
    }

    // Default to text input for string and other types
    return (
      <ui-text
        {...common}
        mode="editable"
        value={typeof val === 'undefined' ? '' : String(val)}
        onValueMsg={(e: CustomEvent<any>) => this.onFieldChange(f.name, e.detail?.newVal)}
      />
    );
  }

  // ============================== MAIN COMPONENT RENDER METHOD ==============================

  /**
   * Renders the complete object editor component with all fields and controls.
   */
  render() {
    return (
      <div class="w-full">
        {this.label && <label class={`header text-sm font-semibold mb-2 block ${this.dark ? 'text-neutral-light' : ''}`}>{this.label}</label>}
        <div class={`container ${this.variant === 'filled' ? 'bg-neutral-light border border-neutral rounded-lg p-4' : 'border border-neutral rounded-lg p-4'}`}>
          <div class="fields grid grid-cols-1 gap-3">
            {this.fields.map(f => (
              <div class="field flex flex-col gap-1.5">
                <div class={`field-label text-xs text-neutral ${this.dark ? 'text-neutral-light' : ''}`}>
                  {f.name} ({f.type})
                </div>
                {this.renderField(f)}
              </div>
            ))}
          </div>
          <div class="footer mt-3 flex items-center gap-4">
            <ui-button label="Save" variant="filled" onClick={() => this.save()}></ui-button>
            {this.showStatus && StatusIndicator.renderStatusBadge(this.operationStatus, this.lastError, h)}
          </div>
        </div>
        {this.showLastUpdated && (
          <div class="timestamp mt-2">{StatusIndicator.renderTimestamp(this.lastUpdatedTs ? new Date(this.lastUpdatedTs) : null, this.dark ? 'dark' : 'light', h)}</div>
        )}
      </div>
    );
  }
}
