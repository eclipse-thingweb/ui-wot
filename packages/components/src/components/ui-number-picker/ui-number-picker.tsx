import { Component, Element, Prop, State, Event, EventEmitter, Method, Watch, h } from '@stencil/core';
import { UiMsg } from '../../utils/types'; // Standard message format
import { StatusIndicator, OperationStatus } from '../../utils/status-indicator'; // Status indicator utility

/**
 * A versatile number picker component designed for WoT device control and monitoring.
 *
 * It has increment/decrement buttons, multiple visual styles, status and last updated timestamps.
 * Supports both interactive control and read-only monitoring modes with customizable ranges.
 *
 * @example Basic Usage
 * ```html
 * <ui-number-picker variant="minimal" value="3" label="Quantity"></ui-number-picker>
 * <ui-number-picker variant="filled" value="50" min="0" max="100"></ui-number-picker>
 * <ui-number-picker readonly="true" label="Sensor" show-last-updated="true"></ui-number-picker>
 * ```
 *
 * @example JS integaration with node-wot browser bundle
 * ```javascript
 * const numberPicker = document.getElementById('device-volume');
 * const initialValue = Number(await (await thing.readProperty('volume')).value());
 *
 * await numberPicker.setValue(initialValue, {
 *   writeOperation: async value => {
 *     await thing.writeProperty('volume', value);
 *   }
 * });
 * ```
 */
@Component({
  tag: 'ui-number-picker',
  styleUrl: 'ui-number-picker.css',
  shadow: true,
})
export class UiNumberPicker {
  @Element() el: HTMLElement;

  // ============================== COMPONENT PROPERTIES ==============================

  /**
   * Visual style variant of the number picker.
   * - minimal: Clean buttons with subtle background (default)
   * - outlined: Buttons with border outline
   * - filled: Solid filled buttons
   */
  @Prop() variant: 'minimal' | 'outlined' | 'filled' = 'minimal';

  /** Color theme for the active state matching to thingsweb theme */
  @Prop() color: 'primary' | 'secondary' | 'neutral' = 'primary';

  /** Enable dark mode theme styling when true */
  @Prop() dark: boolean = false;

  /** Current numeric value of the number picker */
  @Prop({ mutable: true }) value: number = 0;

  /** Disable user interaction when true */
  @Prop() disabled: boolean = false;

  /** Read only mode, display value but prevent changes when true. Just to monitor changes*/
  @Prop({ mutable: true }) readonly: boolean = false;

  /** Text label displayed above the number picker (optional) */
  @Prop() label?: string;

  /** Enable keyboard navigation so user can change value using 'Arrow Up' and 'Arrow Down' keys) when true */
  @Prop() keyboard: boolean = true;

  /** Show last updated timestamp below the component */
  @Prop() showLastUpdated: boolean = false;

  /** Show visual operation status indicators (loading, success, failed) right to the component */
  @Prop() showStatus: boolean = false;

  /** Connection state for read-only monitoring */
  @Prop({ mutable: true }) connected: boolean = true;

  /** Minimum allowed value (optional) */
  @Prop() min?: number = 0;

  /** Maximum allowed value (optional) */
  @Prop() max?: number = 100;

  /** Step increment/decrement amount (optional) */
  @Prop() step?: number = 1;

  // ============================== COMPONENT STATE ==============================

  /** Current operation status for visual feedback */
  @State() operationStatus: OperationStatus = 'idle';

  /** Error message from failed operations if any (optional) */
  @State() lastError?: string;

  /** Timestamp when value was last updated (optional) */
  @State() lastUpdatedTs?: number;

  /** Timestamp for read-only pulse animation (optional) */
  @State() readPulseTs?: number;

  /** Internal state holding the current displayed value */
  @State() private currentValue: number = 0;

  /** Internal state counter for timestamp re-rendering */
  @State() private timestampCounter: number = 0;

  /** Internal state to prevents infinite event loops while programmatic updates */
  @State() private suppressEvents: boolean = false;

  // ============================== PRIVATE PROPERTIES ==============================

  /** Tracks component initialization state to prevent early watchers*/
  private isInitialized: boolean = false;

  /** Timer for updating relative timestamps */
  private timestampUpdateTimer?: number;

  /** Stores API function from first initialization to re-use further for any user interactions */
  private storedWriteOperation?: (value: number) => Promise<any>;

  // ============================== EVENTS ==============================

  /**
   * Emitted when number picker value changes through user interaction or setValue calls.
   * Contains the new value, previous value, timestamp, and source information.
   */
  @Event() valueMsg: EventEmitter<UiMsg<number>>;

  // ============================== PUBLIC METHODS ==============================

  /**
   * Sets the number picker value with optional device communication api and other options.
   *
   * This is the primary method for connecting number pickers to real devices.
   * It supports optimistic updates, error handling, and automatic retries.
   *
   * @param value - The numeric value to set
   * @param options - Optional configuration for device communication and behavior
   * @returns Promise resolving to true if successful, false if failed
   *
   * @example Basic Usage
   * ```javascript
   * await numberPicker.setValue(50);
   * ```
   *
   * @example JS integration with node-wot browser bundle
   * ```javascript
   * const numberPicker = document.getElementById('device-volume');
   * const initialValue = Number(await (await thing.readProperty('volume')).value());
   * await numberPicker.setValue(initialValue, {
   *   writeOperation: async value => {
   *     await thing.writeProperty('volume', value);
   *   },
   *   autoRetry: { attempts: 3, delay: 1000 }
   * });
   * ```
   */
  @Method()
  async setValue(
    value: number,
    options?: {
      writeOperation?: (value: number) => Promise<any>;
      readOperation?: () => Promise<any>;
      optimistic?: boolean;
      autoRetry?: { attempts: number; delay: number };
      _isRevert?: boolean;
    },
  ): Promise<boolean> {
    const prevValue = this.currentValue;

    // Clear any existing error state
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
   * Gets the current number picker value with optional metadata.
   *
   * @param includeMetadata - Whether to include status, timestamp and other information
   * @returns Current value or detailed metadata object
   */
  @Method()
  async getValue(includeMetadata: boolean = false): Promise<number | { value: number; lastUpdated?: number; status: string; error?: string }> {
    if (includeMetadata) {
      return {
        value: this.currentValue,
        lastUpdated: this.lastUpdatedTs,
        status: this.operationStatus,
        error: this.lastError,
      };
    }
    return this.currentValue;
  }

  /**
   * This method updates the value silently without triggering events.
   *
   * Use this for external data synchronization to prevent event loops.
   * Perfect for WebSocket updates or polling from remote devices.
   *
   * @param value - The numeric value to set silently
   */
  @Method()
  async setValueSilent(value: number): Promise<void> {
    this.updateValue(value, this.currentValue, false);
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
   * This triggers a visual pulse for read-only mode.
   *
   * Useful to shows users when data has been refreshed from an external source.
   * The pulse automatically fades after 1.5 seconds.
   */
  @Method()
  async triggerReadPulse(): Promise<void> {
    if (this.readonly) {
      this.readPulseTs = Date.now();
      setTimeout(() => {
        if (this.readPulseTs && Date.now() - this.readPulseTs >= 1500) {
          // 1.5 seconds
          this.readPulseTs = undefined;
        }
      }, 1500);
    }
  }

  // ============================== LIFECYCLE METHODS ==============================

  /** Initialize component state from props */
  componentWillLoad() {
    this.currentValue = this.value || 0;
    this.isInitialized = true;
    if (this.showLastUpdated) this.startTimestampUpdater();
  }

  /** Show initial pulse for read-only components */
  componentDidLoad() {
    if (this.readonly) {
      setTimeout(() => (this.readPulseTs = Date.now()), 200);
    }
  }

  /** Clean up timers when component is removed */
  disconnectedCallback() {
    this.stopTimestampUpdater();
  }

  // ============================== WATCHERS ==============================

  /** Sync internal state when value prop changes externally */
  @Watch('value')
  watchValue(newVal: number) {
    if (!this.isInitialized) return;

    if (this.currentValue !== newVal) {
      const prevValue = this.currentValue;
      this.currentValue = newVal;
      this.emitValueMsg(newVal, prevValue);
      if (this.readonly) this.readPulseTs = Date.now();
    }
  }

  // ============================== PRIVATE METHODS ==============================

  /**
   * This is the core state update method that handles value changes consistently.
   * It updates both internal state and external prop and also manages timestamps, and emits events (optional).
   */
  private updateValue(value: number, prevValue?: number, emitEvent: boolean = true): void {
    // Clamp and step the value for number picker specific logic
    const clampedValue = Math.max(this.min || 0, Math.min(this.max || 100, value));
    const steppedValue = Math.round(clampedValue / this.step) * this.step;

    this.currentValue = steppedValue;
    this.value = steppedValue;
    this.lastUpdatedTs = Date.now();

    if (this.readonly) {
      this.readPulseTs = Date.now();
    }

    if (emitEvent && !this.suppressEvents) {
      this.emitValueMsg(steppedValue, prevValue);
    }
  }

  /** Executes stored operations with error handling and retry logic */
  private async executeOperation(value: number, prevValue: number, options: any): Promise<boolean> {
    const optimistic = options?.optimistic !== false;

    // Show new value immediately (if optimistic = true)
    if (optimistic && !options?._isRevert) {
      this.updateValue(value, prevValue);
    }

    StatusIndicator.applyStatus(this, 'loading');

    try {
      // Execute the API call
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
  private emitValueMsg(value: number, prevValue?: number) {
    if (this.suppressEvents) return;
    this.valueMsg.emit({
      newVal: value,
      prevVal: prevValue,
      ts: Date.now(),
      source: this.el?.id || 'ui-number-picker',
      ok: true,
    });
  }

  /** Handles user increment/decrement interactions */
  private handleChange = async (delta: number) => {
    if (this.disabled || this.readonly) return;

    const newValue = this.currentValue + delta;

    // Check bounds
    if (this.max !== undefined && newValue > this.max) return;
    if (this.min !== undefined && newValue < this.min) return;

    const prevValue = this.currentValue;

    // Execute stored operation if available
    if (this.storedWriteOperation) {
      StatusIndicator.applyStatus(this, 'loading');
      this.updateValue(newValue, prevValue);

      try {
        await this.storedWriteOperation(newValue);
        StatusIndicator.applyStatus(this, 'success');
      } catch (error) {
        console.error('Write operation failed:', error);
        StatusIndicator.applyStatus(this, 'error', error?.message || 'Operation failed');
        this.updateValue(prevValue, newValue, false);
      }
    } else {
      StatusIndicator.applyStatus(this, 'error', 'No operation configured - setup may have failed');
    }
  };

  /** Handle increment */
  private handleIncrement = async () => {
    this.handleChange(this.step);
  };

  /** Handle decrement */
  private handleDecrement = async () => {
    this.handleChange(-this.step);
  };

  /** Handle keyboard 'Arrow Up' and 'Arrow Down' input to change number value */
  private handleKeyDown = (event: KeyboardEvent) => {
    if (this.disabled || this.readonly || !this.keyboard) return;
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.handleIncrement();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.handleDecrement();
    }
  };

  /** Manages timestamp update timer for relative time display */
  private startTimestampUpdater() {
    this.stopTimestampUpdater();
    this.timestampUpdateTimer = window.setInterval(() => this.timestampCounter++, 60000); //  Update every minute
  }

  /** Stops the timestamp update timer */
  private stopTimestampUpdater() {
    if (this.timestampUpdateTimer) {
      clearInterval(this.timestampUpdateTimer);
      this.timestampUpdateTimer = undefined;
    }
  }

  // ============================== RENDERING HELPERS ==============================

  /** Renders the status badge according to current operation state */
  private renderStatusBadge() {
    if (!this.showStatus) return null;

    if (this.readonly) {
      if (!this.connected) {
        return StatusIndicator.renderStatusBadge('error', 'Disconnected', h);
      }
      if (this.readPulseTs && Date.now() - this.readPulseTs < 1500) {
        return StatusIndicator.renderStatusBadge('success', 'Data received', h);
      }
      return StatusIndicator.renderStatusBadge('idle', 'Connected', h);
    }

    const status = this.operationStatus || 'idle';
    const message = this.lastError || (status === 'idle' ? 'Ready' : '');
    return StatusIndicator.renderStatusBadge(status, message, h);
  }

  /** Renders the last updated timestamp */
  private renderLastUpdated() {
    if (!this.showLastUpdated) return null;

    // render an invisible placeholder when lastUpdatedTs is missing.
    const lastUpdatedDate = this.lastUpdatedTs ? new Date(this.lastUpdatedTs) : null;
    return StatusIndicator.renderTimestamp(lastUpdatedDate, this.dark ? 'dark' : 'light', h);
  }

  // ============================== STYLING HELPERS ==============================

  /** Get button style classes for increment/decrement buttons */
  private getButtonStyle(type: 'increment' | 'decrement'): string {
    const isDisabled = this.disabled;
    const isAtMax = this.max !== undefined && this.currentValue >= this.max && type === 'increment';
    const isAtMin = this.min !== undefined && this.currentValue <= this.min && type === 'decrement';
    const disabled = isDisabled || isAtMax || isAtMin;

    let baseClasses = 'w-12 h-12 flex items-center justify-center text-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-lg';

    if (disabled) {
      baseClasses += ' opacity-50 cursor-not-allowed';
    } else {
      baseClasses += ' cursor-pointer hover:scale-105 active:scale-95';
    }

    // Variant-specific styling
    if (this.variant === 'minimal') {
      if (disabled) {
        baseClasses += ' text-gray-400';
      } else {
        if (this.dark) {
          baseClasses += ' bg-transparent text-white hover:bg-gray-800';
        } else {
          baseClasses += ' bg-transparent text-black hover:bg-gray-100';
        }
      }
    } else if (this.variant === 'outlined') {
      if (disabled) {
        baseClasses += ' border-2 border-gray-300 text-gray-400 bg-transparent';
      } else {
        if (this.dark) {
          baseClasses += ` border-2 bg-transparent text-white hover:text-white`;
        } else {
          baseClasses += ` border-2 bg-transparent text-black hover:bg-gray-100`;
        }
      }
    } else if (this.variant === 'filled') {
      if (disabled) {
        baseClasses += ' bg-gray-400 text-white';
      } else {
        if (this.dark) {
          baseClasses += ` text-white hover:opacity-90`;
        } else {
          baseClasses += ` text-white hover:opacity-90`;
        }
      }
    }

    return baseClasses;
  }

  /** Get value display style */
  private getValueStyle(): string {
    const isDisabled = this.disabled;

    let classes = 'min-w-[60px] h-12 flex items-center justify-center text-lg font-semibold rounded-lg border-2';

    if (isDisabled) {
      classes += ' bg-gray-100 text-gray-400 border-gray-300';
      if (this.dark) classes += ' dark:bg-gray-800 dark:text-gray-600 dark:border-gray-600';
    } else {
      classes += ` bg-white`;
      if (this.dark) classes += ` dark:bg-white`;
    }

    return classes;
  }

  /** Generate the active color using global CSS variables */
  private getActiveColor(): string {
    switch (this.color) {
      case 'secondary':
        return 'var(--color-secondary)';
      case 'neutral':
        return 'var(--color-neutral)';
      default:
        return 'var(--color-primary)';
    }
  }

  /** Readonly background classes */
  private getReadonlyBg(): string {
    if (this.dark) {
      return 'bg-gray-800 border-2 text-white';
    }
    return 'bg-white border-2 text-gray-900';
  }

  // ============================== MAIN COMPONENT RENDER METHOD ==============================

  /**
   * Renders the complete number picker component with all features and styles.
   */
  render() {
    const canInteract = !this.disabled && !this.readonly;
    const hoverTitle = this.readonly
      ? 'Read-only mode - Value reflects external state'
      : this.disabled
        ? 'Number picker is disabled'
        : `Use buttons or arrow keys to ${this.label ? `change ${this.label}` : 'change value'}`;

    return (
      <div class="inline-block" part="container" role="group" aria-label={this.label || 'Number picker'}>
        <div class="inline-flex flex-col items-center space-y-2 relative">
          {/* Label */}
          <slot name="label">
            {this.label && (
              <label
                class={`select-none text-sm font-medium transition-colors duration-200 ${!canInteract ? 'cursor-not-allowed text-gray-400' : 'cursor-default'} ${
                  this.dark ? 'text-white' : 'text-gray-900'
                }`}
                title={hoverTitle}
                part="label"
              >
                {this.label}
                {this.readonly && (
                  <span class="ml-1 text-xs" style={{ color: 'var(--color-info)' }}>
                    (Read-only)
                  </span>
                )}
              </label>
            )}
          </slot>

          {/* Number Picker Control */}
          {this.readonly ? (
            // Read-only indicator
            <span
              class={`inline-flex items-center justify-center min-w-[120px] h-12 px-4 rounded-lg transition-all duration-300 ${this.getReadonlyBg()}`}
              style={{
                borderColor: this.getActiveColor(),
                color: this.dark ? 'white' : this.getActiveColor(),
              }}
              title={`${hoverTitle} - Current value: ${this.currentValue}`}
              part="readonly-indicator"
            >
              <span class={`text-lg font-medium`} style={{ color: this.dark ? 'white' : this.getActiveColor() }}>
                {this.currentValue}
              </span>

              {/* Read Pulse Indicator */}
              {this.readPulseTs && Date.now() - this.readPulseTs < 1500 && (
                <span class="ml-2 flex items-center" part="readonly-pulse-sibling">
                  <span
                    class="w-3 h-3 rounded-full shadow-md"
                    title="Updated"
                    aria-hidden="true"
                    style={{
                      backgroundColor: 'var(--color-info)',
                      animation: 'ui-read-pulse 1.4s ease-in-out forwards',
                    }}
                  ></span>
                </span>
              )}
            </span>
          ) : (
            // Interactive number picker
            <div class="flex items-center gap-3 relative">
              <div class="flex items-center gap-3" tabIndex={canInteract ? 0 : -1} onKeyDown={this.handleKeyDown} part="controls">
                {/* Decrement Button */}
                <button
                  class={this.getButtonStyle('decrement')}
                  style={
                    !this.disabled && !(this.min !== undefined && this.currentValue <= this.min) && this.variant === 'outlined'
                      ? { borderColor: this.getActiveColor() }
                      : this.variant === 'filled' && !this.disabled
                        ? { backgroundColor: this.getActiveColor() }
                        : {}
                  }
                  onClick={this.handleDecrement}
                  disabled={this.disabled || (this.min !== undefined && this.currentValue <= this.min)}
                  aria-label="Decrease value"
                  title={canInteract ? `Decrease by ${this.step}` : hoverTitle}
                  part="decrement-button"
                >
                  −
                </button>

                {/* Value Display */}
                <div
                  class={this.getValueStyle()}
                  style={
                    !this.disabled
                      ? {
                          borderColor: this.getActiveColor(),
                          color: this.getActiveColor(),
                        }
                      : {}
                  }
                  part="value-display"
                  title={`Current value: ${this.currentValue}`}
                >
                  {this.currentValue}
                </div>

                {/* Increment Button */}
                <button
                  class={this.getButtonStyle('increment')}
                  style={
                    !this.disabled && !(this.max !== undefined && this.currentValue >= this.max) && this.variant === 'outlined'
                      ? { borderColor: this.getActiveColor() }
                      : this.variant === 'filled' && !this.disabled
                        ? { backgroundColor: this.getActiveColor() }
                        : {}
                  }
                  onClick={this.handleIncrement}
                  disabled={this.disabled || (this.max !== undefined && this.currentValue >= this.max)}
                  aria-label="Increase value"
                  title={canInteract ? `Increase by ${this.step}` : hoverTitle}
                  part="increment-button"
                >
                  +
                </button>
              </div>

              {/* Status Badge */}
              {this.renderStatusBadge()}
            </div>
          )}

          {/* Last Updated Timestamp */}
          {this.renderLastUpdated()}
        </div>
      </div>
    );
  }
}
