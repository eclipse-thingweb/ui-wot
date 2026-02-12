import { Component, Element, Prop, State, Event, EventEmitter, Method, Watch, h } from '@stencil/core';
import { UiMsg } from '../../utils/types'; // Standard message format
import { StatusIndicator, OperationStatus } from '../../utils/status-indicator'; // Status indicator utility

/**
 * A versatile Text-Display component designed for WoT device control and monitoring
 * It has various features, visual styles and supports text-heavy data display.
 * Provides field, area, structured, unstructured, and editable modes with consistent styling.
 *
 * @example Basic Usage
 * ```html
 * <ui-text mode="field" variant="outlined" value="Sample text" label="Name"></ui-text>
 * <ui-text mode="area" variant="filled" value="Long text content..." label="Description"></ui-text>
 * <ui-text mode="structured" variant="minimal" value='{"key": "value"}' label="JSON Data"></ui-text>
 * <ui-text mode="editable" variant="outlined" value="Edit me" label="Notes" id="notes-field"></ui-text>
 * ```
 *
 * @example JS integration with node-wot browser bundle
 * ```javascript
 *   const textElement = document.getElementById('text-field');
 *   const value = await (await thing.readProperty('string')).value();
 *
 *   await textElement.setValue(value, {
 *     writeOperation: async newValue => {
 *       await thing.writeProperty('string', String(newValue));
 *     },
 *   });
 * ```
 */
@Component({
  tag: 'ui-text',
  styleUrl: 'ui-text.css',
  shadow: true,
})
export class UiText {
  @Element() el: HTMLElement;

  // ============================== COMPONENT PROPERTIES ==============================

  /**
   * Visual style variant of the text display.
   * - minimal: Text-only with subtle underline
   * - outlined: Border style applied (default)
   * - filled: Background color applied
   */
  @Prop() variant: 'minimal' | 'outlined' | 'filled' = 'outlined';

  /**
   * Display mode for the text component.
   * - field: One-line text display
   * - area: Expandable text box (multi-line)
   * - unstructured: Plain style, no highlighting
   * - structured: Highlighted block (for JSON-like or formatted text)
   * - editable: User can edit/write directly
   */
  @Prop() mode: 'field' | 'area' | 'unstructured' | 'structured' | 'editable' = 'structured';

  /** Color theme for the active state matching to thingsweb theme */
  @Prop() color: 'primary' | 'secondary' | 'neutral' = 'primary';

  /** Enable dark mode theme styling when true */
  @Prop({ reflect: true }) dark: boolean = false;

  /** Current text value of the component. */
  @Prop({ mutable: true }) value: string = '';

  /** Text label displayed above the text display. */
  @Prop() label?: string;

  /** Show last updated timestamp below the component */
  @Prop() showLastUpdated: boolean = false;

  /** Show visual operation status indicators (loading, success, failed) right to the component */
  @Prop() showStatus: boolean = false;

  /** Placeholder text shown when value is empty (editable mode only). */
  @Prop() placeholder?: string;

  /** Maximum number of rows for area mode. */
  @Prop() maxRows: number = 10;

  /** Minimum number of rows for area mode. */
  @Prop() minRows: number = 3;

  /** Maximum character limit (editable mode only). */
  @Prop() maxLength?: number;

  /** Show character count */
  @Prop() showCharCount: boolean = false;

  /** Show line numbers */
  @Prop() showLineNumbers: boolean = false;

  /** Enable text area resizable. */
  @Prop() resizable: boolean = true;

  /**
   * Debounce delay in milliseconds for editable mode updates (0 = disabled).
   * Enabled it to reduce API calls by only sending updates after user stops typing.
   */
  @Prop() debounceMs: number = 0;

  /**
   * Show save button for explicit updates (editable mode only).
   * When true, changes are not sent until user clicks save.
   */
  @Prop() showSaveButton: boolean = false;

  // ============================== COMPONENT STATE ==============================

  /** Current operation status for visual feedback */
  @State() operationStatus: OperationStatus = 'idle';

  /** Error message from failed operations if any (optional) */
  @State() lastError?: string;

  /** Timestamp when value was last updated (optional) */
  @State() lastUpdatedTs?: number;

  /** Internal state counter for timestamp re-rendering */
  @State() private timestampCounter: number = 0;

  /** Temporary value for debounced editing */
  @State() private tempValue: string = '';

  /** Internal flag to track if there are unsaved changes */
  @State() private hasUnsavedChanges: boolean = false;

  /** Internal state to prevents infinite event loops while programmatic updates */
  @State() private suppressEvents: boolean = false;

  /** Rendered line count after wrapping (for line numbers) */
  @State() private renderedLineCount: number = 0;

  /** Expand/Collapse state for each path */
  @State() private collapsedPaths: { [path: string]: boolean } = {};

  // ============================== PRIVATE PROPERTIES ==============================

  /** Internal state for tracking if component is initialized */
  private isInitialized: boolean = false;

  /** Timer for updating relative timestamps */
  private timestampUpdateTimer?: number;

  /** Debounce timer reference */
  private debounceTimer?: number;

  /** ResizeObserver for to calculate dynamic line numbers */
  private resizeObserver?: ResizeObserver;

  /** Reference to the container element for dynamic sizing */
  private containerRef?: HTMLElement;

  /** Reference to rendered content block for measuring wrapped lines */
  private contentRef?: HTMLElement;

  /** Inner content measurer (used only when line numbers are shown) */
  private contentMeasureRef?: HTMLElement;

  /** Stores API function from first initialization to re-use further for any user interactions */
  private storedWriteOperation?: (value: string) => Promise<any>;

  // ============================== EVENTS ==============================

  /**
   * Emitted when toggle value changes through user interaction or setValue calls.
   * Contains the new value, previous value, timestamp, and source information.
   */
  @Event() valueMsg: EventEmitter<UiMsg<string>>;

  // ============================== PUBLIC METHODS ==============================

  /**
   * Set the text value and handle optional operations and status management.
   *
   * This is the primary method for connecting text to real devices.
   * It supports optimistic updates, error handling, and automatic retries.
   *
   * @param value - The string value to set
   * @param options - Optional configuration options for the operation
   * @returns Promise resolving to true if successful, false if failed
   *
   * @example Basic Usage
   * ```html
   * await textElement.setValue(value);
   * ```
   *
   * @example JS integration with node-wot browser bundle
   * ```javascript
   *   const textElement = document.getElementById('text-field');
   *   const value = await (await thing.readProperty('string')).value();
   *
   *   await textElement.setValue(value, {
   *     writeOperation: async newValue => {
   *       await thing.writeProperty('string', String(newValue));
   *     },
   *     autoRetry: { attempts: 3, delay: 1000 }
   *   });
   * ```
   */
  @Method()
  async setValue(
    value: string,
    options?: {
      writeOperation?: (value: string) => Promise<any>;
      readOperation?: () => Promise<any>;
      optimistic?: boolean;
      autoRetry?: { attempts: number; delay: number };
      _isRevert?: boolean;
    },
  ): Promise<boolean> {
    const prevValue = this.value;

    // Clear error state on new attempts
    if (this.operationStatus === 'error' && !options?._isRevert) {
      StatusIndicator.applyStatus(this, 'idle');
    }

    // Simple value update without other operations
    if (!options?.writeOperation && !options?.readOperation) {
      this.updateValue(value, prevValue);
      return true;
    }

    // If there is writeOperation store operation for future user interactions
    if (options.writeOperation && !options._isRevert) {
      this.storedWriteOperation = options.writeOperation;
      StatusIndicator.applyStatus(this, 'loading');

      try {
        // Update the value optimistically
        this.updateValue(value, prevValue, false);
        StatusIndicator.applyStatus(this, 'success');
        return true;
      } catch (error) {
        StatusIndicator.applyStatus(this, 'error', error?.message || 'Setup failed');
        return false;
      }
    }

    // Execute operation immediately if no options selected
    return this.executeOperation(value, prevValue, options);
  }

  /**
   * Get the current text value with optional metadata.
   *
   * @param includeMetadata - Whether to include status, timestamp and other information
   * @returns Current value or detailed metadata object
   */
  @Method()
  async getValue(includeMetadata: boolean = false): Promise<string | { value: string; lastUpdated?: number; status: string; error?: string }> {
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
   * This method updates the value silently without triggering events.
   *
   * Use this for external data synchronization to prevent event loops.
   * Perfect for WebSocket updates or polling from remote devices.
   *
   * @param value - The string value to set silently
   */
  @Method()
  async setValueSilent(value: string): Promise<void> {
    this.updateValue(value, this.value, false);
  }

  /**
   * (Advance) to manually set the operation status indicator.
   *
   * Useful when managing device communication externally and you want to show loading/success/error states.
   *
   * @param status - The status to display
   * @param errorMessage - (Optional) error message for error status
   */
  @Method()
  async setStatus(status: 'idle' | 'loading' | 'success' | 'error', errorMessage?: string): Promise<void> {
    StatusIndicator.applyStatus(this, status, errorMessage);
  }

  /**
   * Focus the input element (editable mode only).
   */
  @Method()
  async focusInput(): Promise<void> {
    const input = this.el.shadowRoot?.querySelector('input, textarea') as HTMLInputElement | HTMLTextAreaElement;
    if (input) {
      input.focus();
    }
  }

  // ============================== LIFECYCLE METHODS ==============================

  componentWillLoad() {
    this.isInitialized = true;
    this.tempValue = this.value;
    if (this.showLastUpdated) this.startTimestampUpdater();
  }

  componentDidLoad() {
    this.setupResizeObserver();
    // Initial line count after first render
    this.scheduleLineCountUpdate();
    // Recalculate on window resize as container width may change
    window.addEventListener('resize', this.handleWindowResize, { passive: true });
  }

  disconnectedCallback() {
    this.stopTimestampUpdater();
    this.cleanupDebounceTimer();
    this.cleanupResizeObserver();
    window.removeEventListener('resize', this.handleWindowResize as any);
  }

  // ============================== WATCHERS ==============================

  /** Sync internal state when value prop changes externally */
  @Watch('value')
  watchValue(newVal: string, oldVal: string) {
    if (!this.isInitialized) return;
    if (newVal !== oldVal && !this.suppressEvents) {
      this.emitValueMsg(newVal, oldVal);
    }
    // Recompute rendered line count on value changes
    this.scheduleLineCountUpdate();
  }

  // ============================== PRIVATE METHODS ==============================

  /**
   * This is the core state update method that handles value changes consistently.
   * It updates both internal state and external prop and also manages timestamps, and emits events (optional).
   */
  private updateValue(value: string, prevValue?: string, emitEvent: boolean = true): void {
    this.value = value;
    this.lastUpdatedTs = Date.now();

    if (emitEvent && !this.suppressEvents) {
      this.emitValueMsg(value, prevValue);
    }
  }

  /** Executes stored operations with error handling and retry logic */
  private async executeOperation(value: string, prevValue: string, options: any): Promise<boolean> {
    const optimistic = options?.optimistic !== false;

    // Show new value immediately (if optimistic = true)
    if (optimistic && !options?._isRevert) {
      this.updateValue(value, prevValue);
    }

    StatusIndicator.applyStatus(this, 'loading');

    try {
      // Execute the operation
      if (options.writeOperation) {
        await options.writeOperation(value);
      } else if (options.readOperation) {
        await options.readOperation();
      }

      StatusIndicator.applyStatus(this, 'success');

      // Update value after successful operation, (if optimistic = false)
      if (!optimistic) {
        this.updateValue(value, prevValue);
      }

      return true;
    } catch (error) {
      StatusIndicator.applyStatus(this, 'error', error?.message || String(error) || 'Operation failed');

      // Revert optimistic changes if operation is not successful or has an error
      if (optimistic && !options?._isRevert) {
        this.updateValue(prevValue, value, false);
      }

      // Retry logic
      if (options?.autoRetry && options.autoRetry.attempts > 0) {
        setTimeout(() => {
          this.setValue(value, {
            ...options,
            autoRetry: { ...options.autoRetry, attempts: options.autoRetry.attempts - 1 },
          });
        }, options.autoRetry.delay);
      }

      return false;
    }
  }

  /** Emits value change events with consistent UIMsg data structure */
  private emitValueMsg(value: string, prevValue?: string) {
    if (this.suppressEvents) return;
    this.valueMsg.emit({
      newVal: value,
      prevVal: prevValue,
      ts: Date.now(),
      source: this.el?.id || 'ui-text',
      ok: true,
    });
  }

  /** Handles user click interactions */
  private handleChange = async (event: Event): Promise<void> => {
    if (this.mode !== 'editable') return;

    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    const newValue = target.value;

    // Update temp value
    this.tempValue = newValue;
    this.hasUnsavedChanges = this.value !== newValue;

    // Handle save button mode if not using auto-save
    if (this.showSaveButton) {
      return;
    }

    // Handle debounced updates
    if (this.debounceMs > 0) {
      this.debouncedUpdate(newValue);
      return;
    }

    // Immediate update
    await this.handleValueUpdate(newValue);
  };

  /** Handle save button click */
  private handleSave = async (): Promise<void> => {
    if (!this.hasUnsavedChanges) return;
    await this.handleValueUpdate(this.tempValue);
  };

  /** Handle window resize for line count updates */
  private handleWindowResize = (() => {
    let frame = 0;
    return () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = 0;
        this.updateRenderedLineCount();
      });
    };
  })();

  /** Manages timestamp update timer for relative time display */
  private startTimestampUpdater() {
    this.stopTimestampUpdater();
    this.timestampUpdateTimer = window.setInterval(() => this.timestampCounter++, 60000);
  }

  /** Stops the timestamp update timer */
  private stopTimestampUpdater() {
    if (this.timestampUpdateTimer) {
      clearInterval(this.timestampUpdateTimer);
      this.timestampUpdateTimer = undefined;
    }
  }

  /** Resize Observer for dynamic line calculation */
  private setupResizeObserver() {
    if (!window.ResizeObserver) return;

    this.resizeObserver = new ResizeObserver(() => {
      this.updateRenderedLineCount();
    });

    if (this.containerRef) this.resizeObserver.observe(this.containerRef);
  }

  /** Cleanup ResizeObserver */
  private cleanupResizeObserver() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = undefined;
    }
  }

  /** Cleanup debounce timer */
  private cleanupDebounceTimer() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }
  }

  /** Debounced update for value changes */
  private debouncedUpdate(value: string) {
    this.cleanupDebounceTimer();

    this.debounceTimer = window.setTimeout(() => {
      this.handleValueUpdate(value);
    }, this.debounceMs);
  }

  /** Handles value updates with stored operations or simple updates */
  private async handleValueUpdate(value: string) {
    const prevValue = this.value;

    // Execute stored writeOperation if available
    if (this.storedWriteOperation) {
      StatusIndicator.applyStatus(this, 'loading');
      this.updateValue(value); // Optimistic update

      try {
        await this.storedWriteOperation(value);
        StatusIndicator.applyStatus(this, 'success');
        this.hasUnsavedChanges = false;
      } catch (error) {
        console.error('Write operation failed:', error);
        StatusIndicator.applyStatus(this, 'error', error?.message || 'Operation failed');
        this.updateValue(prevValue!, value, false); // Revert, no event
      }
    } else {
      // Simple value update without operations
      this.updateValue(value);
      this.hasUnsavedChanges = false;

      if (this.showStatus) {
        StatusIndicator.applyStatus(this, 'loading');
        setTimeout(() => StatusIndicator.applyStatus(this, 'success'), 100);
      }
    }
  }

  // ============================== LINE CALCULATION HELPER METHODS ==============================

  /** Line calculator based on container size */
  private calculateDynamicLines(): number {
    if (!this.containerRef) return this.minRows;

    const containerHeight = this.containerRef.clientHeight;
    const lineHeight = 24; // ~1.5rem in pixels
    const padding = 24; // Top + bottom padding
    const availableHeight = Math.max(containerHeight - padding, lineHeight);
    const calculatedLines = Math.floor(availableHeight / lineHeight);

    return Math.max(this.minRows, Math.min(calculatedLines, this.maxRows));
  }

  /** No. of visually rendered lines based on content element height and line-height */
  private updateRenderedLineCount(): void {
    const el = (this.contentMeasureRef as HTMLElement) || (this.contentRef as HTMLElement) || undefined;
    if (!el) return;

    const cs = window.getComputedStyle(el);
    const fontSize = parseFloat(cs.fontSize || '16');
    let lineHeight = parseFloat(cs.lineHeight || '0');
    if (!lineHeight || Number.isNaN(lineHeight)) {
      // Fallback for 'normal'
      lineHeight = 1.5 * (fontSize || 16);
    }

    const height = el.scrollHeight || el.clientHeight;
    if (!height || !lineHeight) return;

    const count = Math.max(1, Math.ceil(height / lineHeight));
    if (count !== this.renderedLineCount) {
      this.renderedLineCount = count;
    }
  }

  /** Tracks animation frame ID for line count updates */
  private frameId: number | null = null;

  /** Schedule line count update on next animation frame to avoid excessive calculations */
  private scheduleLineCountUpdate(): void {
    if (this.frameId !== null) return;
    this.frameId = requestAnimationFrame(() => {
      this.frameId = null;
      this.updateRenderedLineCount();
    });
  }

  // ============================== JSON STRUCTURE HELPER METHODS==============================

  /** Check if a JSON path is collapsed*/
  private isCollapsed(path: string): boolean {
    return !!this.collapsedPaths[path];
  }

  /** Folding state for a JSON path */
  private toggleFold(path: string): void {
    const current = this.collapsedPaths[path];
    const updated = { ...this.collapsedPaths };
    if (current) {
      delete updated[path];
    } else {
      updated[path] = true;
    }
    this.collapsedPaths = updated;
    this.scheduleLineCountUpdate();
  }

  /** Generate indentation string for JSON structure display */
  private indentStr(level: number): string {
    return '  '.repeat(Math.max(0, level));
  }

  /** Create a colored span element for JSON syntax highlighting */
  private span(cls: string, text: string) {
    return <span class={cls}>{text}</span>;
  }

  /** Format JSON object keys with syntax highlighting */
  private fmtKey(key: string) {
    return this.span('syntax-key', '"' + key + '"');
  }

  /** Format JSON string values with syntax highlighting */
  private fmtString(val: string) {
    return this.span('syntax-string', '"' + val + '"');
  }

  /** Format JSON number values with syntax highlighting */
  private fmtNumber(n: number) {
    return this.span('syntax-number', String(n));
  }

  /** Format JSON boolean and null values with syntax highlighting */
  private fmtBoolNull(v: boolean | null) {
    return this.span('syntax-bool', String(v));
  }

  /** Build structured JSON into discrete visible lines with folding metadata */
  private buildJsonLines(value: any): { nodes: any[]; path: string; foldable: boolean; folded: boolean; indent: number }[] {
    const lines: { nodes: any[]; path: string; foldable: boolean; folded: boolean; indent: number }[] = [];

    const walk = (val: any, path: string, indent: number, isLast: boolean) => {
      const indentText = this.indentStr(indent);
      const folded = this.isCollapsed(path);
      const isArray = Array.isArray(val);
      const isObj = !isArray && typeof val === 'object' && val !== null;
      // foldable determined contextually (isArray/isObj) when pushing lines

      if (isArray) {
        if (folded) {
          lines.push({
            nodes: [indentText, '[...]', isLast ? '' : ','],
            path,
            foldable: true,
            folded: true,
            indent,
          });
          return;
        }
        // Opening line
        lines.push({ nodes: [indentText, '['], path, foldable: true, folded: false, indent });
        for (let i = 0; i < val.length; i++) {
          const child = val[i];
          const childPath = path + '[' + i + ']';
          const last = i === val.length - 1;
          if (typeof child === 'object' && child !== null) {
            walk(child, childPath, indent + 1, last);
          } else {
            const childIndent = this.indentStr(indent + 1);
            const nodes: any[] = [childIndent];
            if (typeof child === 'string') nodes.push(this.fmtString(child));
            else if (typeof child === 'number') nodes.push(this.fmtNumber(child));
            else if (typeof child === 'boolean') nodes.push(this.fmtBoolNull(child));
            else if (child === null) nodes.push(this.fmtBoolNull(null));
            else nodes.push(String(child));
            nodes.push(last ? '' : ',');
            lines.push({ nodes, path: childPath, foldable: false, folded: false, indent: indent + 1 });
          }
        }
        lines.push({ nodes: [indentText, ']' + (isLast ? '' : ',')], path: path + '.__close', foldable: false, folded: false, indent });
        return;
      }

      if (isObj) {
        if (folded) {
          lines.push({
            nodes: [indentText, '{...}', isLast ? '' : ','],
            path,
            foldable: true,
            folded: true,
            indent,
          });
          return;
        }
        lines.push({ nodes: [indentText, '{'], path, foldable: true, folded: false, indent });
        const entries = Object.entries(val);
        for (let i = 0; i < entries.length; i++) {
          const [k, v] = entries[i];
          const last = i === entries.length - 1;
          const childPath = path + '.' + k;
          if (typeof v === 'object' && v !== null) {
            // key line: render key + recurse value lines
            // Represent key line merged with first line of child if child is folded
            // We'll push a line for key + (if folded) summary, else let recursion handle
            if (this.isCollapsed(childPath)) {
              const childIndent = this.indentStr(indent + 1);
              const nodes: any[] = [childIndent, this.fmtKey(k), ': '];
              // Determine placeholder
              const isChildArray = Array.isArray(v);
              nodes.push(isChildArray ? '[...]' : '{...}');
              nodes.push(last ? '' : ',');
              lines.push({ nodes, path: childPath, foldable: true, folded: true, indent: indent + 1 });
            } else {
              // Key opening brace line
              const childIndent = this.indentStr(indent + 1);
              const openToken = Array.isArray(v) ? '[' : '{';
              lines.push({ nodes: [childIndent, this.fmtKey(k), ': ', openToken], path: childPath, foldable: true, folded: false, indent: indent + 1 });
              walk(v, childPath, indent + 1, last); // Child will add its internal lines including closing
            }
          } else {
            const childIndent = this.indentStr(indent + 1);
            const nodes: any[] = [childIndent, this.fmtKey(k), ': '];
            if (typeof v === 'string') nodes.push(this.fmtString(v));
            else if (typeof v === 'number') nodes.push(this.fmtNumber(v));
            else if (typeof v === 'boolean') nodes.push(this.fmtBoolNull(v));
            else if (v === null) nodes.push(this.fmtBoolNull(null));
            else nodes.push(String(v));
            nodes.push(last ? '' : ',');
            lines.push({ nodes, path: childPath, foldable: false, folded: false, indent: indent + 1 });
          }
        }
        lines.push({ nodes: [indentText, '}' + (isLast ? '' : ',')], path: path + '.__close', foldable: false, folded: false, indent });
        return;
      }

      // Primitive root value
      const nodes: any[] = [indentText];
      if (typeof val === 'string') nodes.push(this.fmtString(val));
      else if (typeof val === 'number') nodes.push(this.fmtNumber(val));
      else if (typeof val === 'boolean') nodes.push(this.fmtBoolNull(val));
      else if (val === null) nodes.push(this.fmtBoolNull(null));
      else nodes.push(String(val));
      lines.push({ nodes, path, foldable: false, folded: false, indent });
    };

    walk(value, 'root', 0, true);
    return lines;
  }

  // ============================== RENDERING HELPERS ==============================

  /** Renders the status badge according to current operation state */
  private renderStatusBadge() {
    if (!this.showStatus || this.operationStatus === 'idle') return null;
    return StatusIndicator.renderStatusBadge(this.operationStatus, this.lastError || '', h);
  }

  /** Render last updated timestamp with placeholder for space reservation */
  private renderLastUpdated() {
    if (!this.showLastUpdated) return null;

    // render an invisible placeholder when lastUpdatedTs is missing.
    const lastUpdatedDate = this.lastUpdatedTs ? new Date(this.lastUpdatedTs) : null;
    return StatusIndicator.renderTimestamp(lastUpdatedDate, this.dark ? 'dark' : 'light', h);
  }

  /** Renders content with line numbers and optional folding controls */
  private renderWithLineNumbers(
    content: any,
    isMonospace: boolean = false,
    fallbackText?: string,
    fold?: { collapsed: boolean; toggle: () => void } | null,
    measuredCount?: number,
  ): any {
    if (!this.showLineNumbers) return content;

    const basis = typeof content === 'string' ? content : fallbackText || '';
    const splitCount = basis ? basis.split(/\n/).length : 1;
    const total = measuredCount && measuredCount > splitCount ? measuredCount : splitCount;
    const numberFontClasses = isMonospace ? 'font-mono' : '';
    const contentFontClasses = isMonospace ? 'font-mono text-sm' : '';
    const lineNumberWidth = 4; // line gutter width

    return (
      <div class="flex leading-6">
        <div
          class={`select-none border-r pr-2 mr-3 ${numberFontClasses} ${this.dark ? 'text-gray-400 border-gray-600' : 'text-gray-500 border-gray-300'}`}
          style={{ width: `${lineNumberWidth}ch` }}
        >
          {Array.from({ length: total }).map((_, idx) => (
            <div key={idx} class="flex items-center justify-end gap-1">
              {fold && idx === 0 && (
                <button
                  type="button"
                  onClick={fold.toggle}
                  class={`w-4 h-4 flex items-center justify-center rounded text-xs border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 ${this.dark ? 'text-gray-300' : 'text-gray-600'
                    }`}
                  tabindex="-1"
                >
                  {fold.collapsed ? '+' : '−'}
                </button>
              )}
              <span>{idx + 1}</span>
            </div>
          ))}
        </div>
        <div class={`flex-1 ${contentFontClasses}`}>
          <div class="whitespace-pre-wrap break-words" ref={el => (this.contentMeasureRef = el as HTMLElement)}>
            {content}
          </div>
        </div>
      </div>
    );
  }

  /** Renders structured JSON with line numbers and fold controls */
  private renderStructuredWithLineNumbers(lines: { nodes: any[]; path: string; foldable: boolean; folded: boolean; indent: number }[]): any {
    if (!this.showLineNumbers) {
      return (
        <pre class="whitespace-pre-wrap break-words font-mono text-sm m-0 leading-6">
          {lines.map((l, idx) => (
            <span key={l.path + '_' + idx}>
              {l.nodes}
              {idx < lines.length - 1 ? '\n' : ''}
            </span>
          ))}
        </pre>
      );
    }

    const numberFontClasses = 'font-mono';
    const contentFontClasses = 'font-mono text-sm';
    const lineNumberWidth = 4;

    return (
      <div class="flex leading-6">
        <div
          class={`select-none border-r pr-2 mr-3 ${numberFontClasses} ${this.dark ? 'text-gray-400 border-gray-600' : 'text-gray-500 border-gray-300'}`}
          style={{ width: `${lineNumberWidth}ch` }}
        >
          {lines.map((line, idx) => {
            const showToggle = line.foldable && !line.path.endsWith('.__close');
            const folded = line.folded;
            return (
              <div key={line.path + '_' + idx} class="flex items-center justify-end gap-1">
                <span>{idx + 1}</span>
                {showToggle && (
                  <button
                    type="button"
                    onClick={() => this.toggleFold(line.path)}
                    class={`w-4 h-4 flex items-center justify-center rounded text-xs border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 ${this.dark ? 'text-gray-300' : 'text-gray-600'
                      }`}
                    tabindex="-1"
                    aria-label={folded ? 'Expand' : 'Collapse'}
                  >
                    {folded ? '+' : '−'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <div class={`flex-1 ${contentFontClasses}`}>
          <pre class="whitespace-pre-wrap break-words font-mono text-sm m-0 leading-6">
            {lines.map((l, idx) => (
              <span key={l.path + '_' + idx}>
                {l.nodes}
                {idx < lines.length - 1 ? '\n' : ''}
              </span>
            ))}
          </pre>
        </div>
      </div>
    );
  }

  /** Main content renderer which handles different modes and features */
  private renderContent(): any {
    const inputClasses = this.getInputClasses();
    const dynamicRows = this.mode === 'area' ? this.calculateDynamicLines() : this.minRows;
    const currentValue = this.showSaveButton ? this.tempValue : this.value;

    // For editable mode, determine whether it needs single line or multi-line
    if (this.mode === 'editable') {
      const isMultiline = currentValue.includes('\n') || currentValue.length > 60;

      if (isMultiline) {
        return (
          <textarea
            class={inputClasses}
            value={currentValue}
            placeholder={this.placeholder}
            onInput={this.handleChange}
            rows={dynamicRows}
            maxLength={this.maxLength}
            style={{
              height: '100%',
            }}
          ></textarea>
        );
      } else {
        return <input type="text" class={inputClasses} value={currentValue} placeholder={this.placeholder} onInput={this.handleChange} maxLength={this.maxLength} />;
      }
    }

    // For other modes
    switch (this.mode) {
      case 'field':
        return (
          <span class="block overflow-hidden text-ellipsis whitespace-nowrap" title={this.value || this.placeholder || ''}>
            {this.value || this.placeholder}
          </span>
        );

      case 'area': {
        const contentText = this.value || this.placeholder || '';
        if (this.showLineNumbers) {
          return this.renderWithLineNumbers(contentText, false, contentText, null, this.renderedLineCount);
        }
        return (
          <div class="whitespace-pre-wrap break-words leading-6" style={{ height: '100%' }} ref={el => (this.contentRef = el as HTMLElement)}>
            {contentText}
          </div>
        );
      }

      case 'structured': {
        const raw = this.value || this.placeholder || '';
        try {
          const parsed = JSON.parse(raw);
          const lines = this.buildJsonLines(parsed);
          // Use structured custom renderer
          return this.renderStructuredWithLineNumbers(lines);
        } catch {
          // If not JSON then fallback to plain text
          if (this.showLineNumbers) return this.renderWithLineNumbers(String(raw), true, String(raw));
          return (
            <pre class="whitespace-pre-wrap break-words font-mono text-sm m-0 leading-6" ref={el => (this.contentRef = el as HTMLElement)}>
              {String(raw)}
            </pre>
          );
        }
      }

      case 'unstructured':
      default: {
        const contentText = this.value || this.placeholder || '';
        if (this.showLineNumbers) {
          return this.renderWithLineNumbers(contentText, false, contentText, null, this.renderedLineCount);
        }
        return (
          <div class="whitespace-pre-wrap break-words leading-6" ref={el => (this.contentRef = el as HTMLElement)}>
            {contentText}
          </div>
        );
      }
    }
  }

  // ============================== STYLING HELPERS ==============================

  /** Generates CSS classes for the text container based on variant, theme and mode */
  private getBaseClasses(): string {
    // Inline-block for area+resizable handles by CSS now, we just add the class
    let classes = `ui-text-container ${this.variant}`;

    // Mode-specific class
    classes += ` mode-${this.mode}`;

    if (this.mode === 'area' && this.resizable) {
      classes += ' inline-block'; // Global utility or we can add to css
    } else {
      classes += ' w-full'; // Global utility
    }

    return classes;
  }

  /** Get colors from global CSS variables for theming */
  private getColor() {
    const map: Record<string, { base: string; light: string }> = {
      primary: { base: 'var(--color-primary)', light: 'var(--color-primary-light)' },
      secondary: { base: 'var(--color-secondary)', light: 'var(--color-secondary-light)' },
      neutral: { base: 'var(--color-neutral)', light: 'var(--color-neutral-light)' },
    };
    return map[this.color] || map.primary;
  }

  /** Generate CSS classes for input elements based on mode */
  private getInputClasses(): string {
    let classes = 'w-full bg-transparent border-0 outline-none resize-none';

    if (this.mode === 'structured') {
      classes += ' font-mono text-sm';
    }

    return classes;
  }

  // ============================== MAIN COMPONENT RENDER METHOD ==============================

  /**
   * Renders the complete text component with all features and styles.
   */
  render() {
    const baseClasses = this.getBaseClasses();
    // Apply resizable behavior to the bordered container so the whole box (including border) resizes
    const containerStyle: any = {};
    if (this.mode === 'area' && this.resizable) {
      containerStyle.resize = 'both';
      containerStyle.overflow = 'auto';
      containerStyle.minHeight = `${this.minRows * 1.5}rem`;
      containerStyle.maxHeight = `${this.maxRows * 1.5}rem`;
      containerStyle.minWidth = '240px';
      containerStyle.maxWidth = '100%';
    }

    // Apply color tokens to border/background based on variant
    const { base, light } = this.getColor();
    (containerStyle as any)['--ui-accent'] = base;
    if (this.variant === 'outlined' || this.variant === 'minimal') {
      containerStyle.borderColor = base;
    } else if (this.variant === 'filled') {
      containerStyle.backgroundColor = light;
      containerStyle.borderColor = base;
    }

    return (
      <div class="w-full">
        {/* Label */}
        {this.label && <label class="ui-text-label">{this.label}</label>}

        <div class="relative inline-flex items-center w-full">
          <div class={`ui-text-container ${baseClasses}`} style={containerStyle} ref={el => (this.containerRef = el)} onTransitionEnd={() => this.scheduleLineCountUpdate()}>
            {this.renderContent()}
          </div>

          {/* Status badge  */}
          <div class="ml-2 flex-shrink-0">{this.renderStatusBadge()}</div>
        </div>

        {/* Save button */}
        {this.mode === 'editable' && this.showSaveButton && (
          <div class="mt-2 flex gap-2">
            <button
              class="save-btn"
              style={{
                backgroundColor: this.hasUnsavedChanges ? 'var(--color-primary)' : 'transparent',
                color: this.hasUnsavedChanges ? 'var(--color-primary-contrast, #fff)' : 'var(--color-primary)',
                borderColor: 'var(--color-primary)',
                cursor: this.hasUnsavedChanges ? 'pointer' : 'not-allowed',
                opacity: this.hasUnsavedChanges ? '1' : '0.6',
              }}
              disabled={!this.hasUnsavedChanges}
              onClick={this.handleSave}
            >
              Save
            </button>
            {this.hasUnsavedChanges && <span class="unsaved-msg">Unsaved changes</span>}
          </div>
        )}

        {/* Character count */}
        {this.mode === 'editable' && this.showCharCount && (
          <div class="text-count">
            {(this.showSaveButton ? this.tempValue : this.value).length}
            {this.maxLength && ` / ${this.maxLength}`}
          </div>
        )}

        {/* Last updated timestamp */}
        {this.renderLastUpdated()}
      </div>
    );
  }
}
