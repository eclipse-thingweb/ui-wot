import { Component, Element, Prop, State, Event, EventEmitter, Method, Watch, h } from '@stencil/core';
import { UiMsg } from '../../utils/types'; // Standard message format
import { StatusIndicator, OperationStatus } from '../../utils/status-indicator'; // Status indicator utility

/**
 * A versatile toggle switch component designed for WoT device control and monitoring.
 *
 * It has various features, multiple visual styles, status and last updated timestamps.
 * Supports both interactive control and read-only monitoring modes.
 *
 * @example Basic Usage
 * ```html
 * <ui-toggle variant="circle" value="true" label="Light"></ui-toggle>
 * <ui-toggle variant="neon" value="false" label="Fan"></ui-toggle>
 * <ui-toggle readonly="true" label="Sensor" show-last-updated="true"></ui-toggle>
 * ```
 *
 * @example JS integaration with node-wot browser bundle
 * ```javascript
 * const toggle = document.getElementById('device-toggle');
 * const initialValue = Boolean(await (await thing.readProperty('power')).value());
 *
 * await toggle.setValue(initialValue, {
 *   writeOperation: async value => {
 *     await thing.writeProperty('power', value);
 *   }
 * });
 * ```
 */
@Component({
  tag: 'ui-toggle',
  styleUrl: 'ui-toggle.css',
  shadow: true,
})
export class UiToggle {
  @Element() el: HTMLElement;

  // ============================== COMPONENT PROPERTIES ==============================

  /**
   * Visual style variant of the toggle.
   * - circle: Common pill-shaped toggle (default)
   * - square: Rectangular toggle with square thumb
   * - apple: iOS-style switch (bigger size, rounded edges)
   * - cross: Shows cross when off, tick when on with red background when off and green when on
   * - neon: Glowing effect when active
   */
  @Prop() variant: 'circle' | 'square' | 'apple' | 'cross' | 'neon' = 'circle';

  /** Color theme for the active state matching to thingsweb theme */
  @Prop() color: 'primary' | 'secondary' | 'neutral' = 'primary';

  /** Enable dark mode theme styling when true */
  @Prop() dark: boolean = false;

  /** Current boolean value of the toggle */
  @Prop({ mutable: true }) value: boolean = false;

  /** Disable user interaction when true */
  @Prop() disabled: boolean = false;

  /** Read only mode, display value but prevent changes when true. Just to monitor changes*/
  @Prop({ mutable: true }) readonly: boolean = false;

  /** Text label displayed left to the toggle (optional) */
  @Prop() label?: string;

  /** Enable keyboard navigation so user can toggle using 'Space' and 'Enter' keys) when true */
  @Prop() keyboard: boolean = true;

  /** Show last updated timestamp below the component */
  @Prop() showLastUpdated: boolean = false;

  /** Show visual operation status indicators (loading, success, failed) right to the component */
  @Prop() showStatus: boolean = false;

  /** Connection state for read-only monitoring */
  @Prop({ mutable: true }) connected: boolean = true;

  // ============================== COMPONENT STATE ==============================

  /** Current operation status for visual feedback */
  @State() operationStatus: OperationStatus = 'idle';

  /** Error message from failed operations if any (optional) */
  @State() lastError?: string;

  /** Timestamp when value was last updated (optional) */
  @State() lastUpdatedTs?: number;

  /** Timestamp for read-only pulse animation (optional) */
  @State() readPulseTs?: number;

  /** Internal state that controls the visual appearance of the toggle */
  @State() private isActive: boolean = false;

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
  private storedWriteOperation?: (value: boolean) => Promise<any>;

  // ============================== EVENTS ==============================

  /**
   * Emitted when toggle value changes through user interaction or setValue calls.
   * Contains the new value, previous value, timestamp, and source information.
   */
  @Event() valueMsg: EventEmitter<UiMsg<boolean>>;

  // ============================== PUBLIC METHODS ==============================

  /**
   * Sets the toggle value with optional device communication api and other options.
   *
   * This is the primary method for connecting toggles to real devices.
   * It supports optimistic updates, error handling, and automatic retries.
   *
   * @param value - The boolean value to set (true = on, false = off)
   * @param options - Optional configuration for device communication and behavior
   * @returns Promise resolving to true if successful, false if failed
   *
   * @example Basic Usage
   * ```javascript
   * await toggle.setValue(true);
   * ```
   *
   * @example JS integration with node-wot browser bundle
   * ```javascript
   * const toggle = document.getElementById('device-toggle');
   * const initialValue = Boolean(await (await thing.readProperty('power')).value());
   * await toggle.setValue(initialValue, {
   *   writeOperation: async value => {
   *     await thing.writeProperty('power', value);
   *   },
   *   autoRetry: { attempts: 3, delay: 1000 }
   * });
   * ```
   */
  @Method()
  async setValue(
    value: boolean,
    options?: {
      writeOperation?: (value: boolean) => Promise<any>;
      readOperation?: () => Promise<any>;
      optimistic?: boolean;
      autoRetry?: { attempts: number; delay: number };
      _isRevert?: boolean;
    },
  ): Promise<boolean> {
    const prevValue = this.isActive;

    // Clear any existing error state
    if (this.operationStatus === 'error' && !options?._isRevert) {
      StatusIndicator.applyStatus(this, 'idle');
      this.connected = true;
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
   * Gets the current toggle value with optional metadata.
   *
   * @param includeMetadata - Whether to include status, timestamp and other information
   * @returns Current value or detailed metadata object
   */
  @Method()
  async getValue(includeMetadata: boolean = false): Promise<boolean | { value: boolean; lastUpdated?: number; status: string; error?: string }> {
    if (includeMetadata) {
      return {
        value: this.isActive,
        lastUpdated: this.lastUpdatedTs,
        status: this.operationStatus,
        error: this.lastError,
      };
    }
    return this.isActive;
  }

  /**
   * This method updates the value silently without triggering events.
   *
   * Use this for external data synchronization to prevent event loops.
   * Perfect for WebSocket updates or polling from remote devices.
   *
   * @param value - The boolean value to set silently
   */
  @Method()
  async setValueSilent(value: boolean): Promise<void> {
    this.updateValue(value, this.isActive, false);
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
    this.isActive = Boolean(this.value);
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
  watchValue(newVal: boolean) {
    if (!this.isInitialized) return;

    if (this.isActive !== newVal) {
      const prevValue = this.isActive;
      this.isActive = newVal;
      this.emitValueMsg(newVal, prevValue);
      if (this.readonly) this.readPulseTs = Date.now();
    }
  }

  // ============================== PRIVATE METHODS ==============================

  /**
   * This is the core state update method that handles value changes consistently.
   * It updates both internal state and external prop and also manages timestamps, and emits events (optional).
   */
  private updateValue(value: boolean, prevValue?: boolean, emitEvent: boolean = true): void {
    this.isActive = value;
    this.value = value;
    this.lastUpdatedTs = Date.now();

    if (this.readonly) {
      this.readPulseTs = Date.now();
    }

    if (emitEvent && !this.suppressEvents) {
      this.emitValueMsg(value, prevValue);
    }
  }

  /** Executes stored operations with error handling and retry logic */
  private async executeOperation(value: boolean, prevValue: boolean, options: any): Promise<boolean> {
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
  private emitValueMsg(value: boolean, prevValue?: boolean) {
    if (this.suppressEvents) return;
    this.valueMsg.emit({
      newVal: value,
      prevVal: prevValue,
      ts: Date.now(),
      source: this.el?.id || 'ui-toggle',
      ok: true,
    });
  }

  /** Handles user click interactions */
  private handleChange = async () => {
    if (this.disabled || this.readonly) return;

    const newValue = !this.isActive;
    const prevValue = this.isActive;

    StatusIndicator.applyStatus(this, 'loading');

    // Execute stored operation if available
    if (this.storedWriteOperation) {
      this.updateValue(newValue, prevValue);

      try {
        await this.storedWriteOperation(newValue);
        StatusIndicator.applyStatus(this, 'success');
      } catch (error) {
        StatusIndicator.applyStatus(this, 'error', error?.message || 'Operation failed');
        this.updateValue(prevValue, newValue, false);
      }
    } else {
      StatusIndicator.applyStatus(this, 'error', 'No operation configured - setup may have failed');
    }
  };

  /** Handle keyboard 'enter' and 'spacebar' input to toggle switch state */
  private handleKeyDown = (event: KeyboardEvent) => {
    if (this.disabled || this.readonly || !this.keyboard) return;
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.handleChange();
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

  /** Renders a small transient read pulse indicator next to readonly UI */
  private renderReadPulseIndicator() {
    if (!(this.readonly && this.readPulseTs && Date.now() - this.readPulseTs < 1500)) return null;
    return (
      <span class="ml-1 flex items-center" part="readonly-pulse-sibling">
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
    );
  }

  // ============================== STYLING HELPERS ==============================

  /** Generates CSS classes for the toggle container based on variant,color and state */
  private getToggleStyle(): string {
    const { variant, disabled, isActive, color } = this;

    const sizeMap = {
      apple: 'w-11 h-7',
      default: 'w-12 h-6',
    };

    const shapeMap = {
      square: 'rounded-md',
      apple: 'rounded-full shadow-inner border-2 border-gray-500',
      default: 'rounded-full',
    };

    const size = sizeMap[variant] || sizeMap.default;
    const shape = shapeMap[variant] || shapeMap.default;
    const disabledClass = disabled ? 'disabled-state' : '';

    // Neon glow effects
    let neonClass = '';
    if (variant === 'neon' && isActive) {
      neonClass = color === 'secondary' ? 'neon-secondary' : 'neon-primary';
    } else if (variant === 'neon' && !isActive) {
      neonClass = 'neon-red';
    }

    return `relative inline-block cursor-pointer transition-all duration-300 ease-in-out ${size} ${shape} ${disabledClass} ${neonClass}`.trim();
  }

  /** Renders cross/tick icons for the cross variant */
  private renderCrossIcons() {
    if (this.variant !== 'cross') return null;

    return (
      <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
        {!this.isActive ? (
          <div class="absolute top-0 right-0 w-6 h-6 flex items-center justify-center">
            <span class="text-white text-xl font-bold">×</span>
          </div>
        ) : (
          <div class="absolute top-0 left-0 w-6 h-6 flex items-center justify-center">
            <span class="text-white text-lg font-bold">✓</span>
          </div>
        )}
      </div>
    );
  }

  /** Generates CSS classes for the toggle thumb */
  private getThumbStyle(): string {
    const { variant, isActive } = this;

    if (variant === 'apple') {
      const movement = isActive ? 'translate-x-4' : 'translate-x-0';
      return `absolute w-6 h-6 bg-white transition-all duration-200 ease-in-out shadow-md rounded-full top-0 left-0 ${movement}`;
    }

    const shape = variant === 'square' ? 'rounded-sm' : 'rounded-full';
    const position = variant === 'neon' ? 'top-0.5 left-1' : 'top-1 left-1';
    const movement = isActive ? 'translate-x-6' : 'translate-x-0';

    return `absolute w-4 h-4 bg-white transition-transform duration-300 ease-in-out shadow-sm ${shape} ${position} ${movement}`;
  }

  /** Generate the background color based on variant and state */
  private getBackgroundColor(): string {
    const { color, variant, isActive } = this;

    if (color === 'neutral') return isActive ? 'var(--color-neutral)' : '#d1d5db';
    if (variant === 'cross') return isActive ? this.getActiveColor() : 'var(--color-danger)';
    if (variant === 'apple') return isActive ? 'var(--color-success)' : '#374151';
    if (variant === 'neon') return isActive ? this.getNeonColor() : 'var(--color-danger)';

    return isActive ? this.getActiveColor() : '#d1d5db';
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

  /** Generate the neon color using global CSS variables */
  private getNeonColor(): string {
    return this.color === 'secondary' ? 'var(--color-secondary)' : 'var(--color-primary)';
  }

  // ============================== MAIN COMPONENT RENDER METHOD ==============================

  /**
   * Renders the complete toggle component with all features and styles.
   */
  render() {
    const canInteract = !this.disabled && !this.readonly;
    const hoverTitle = this.readonly
      ? 'Read-only mode - Value reflects external state'
      : this.disabled
        ? 'Toggle is disabled'
        : `Click to ${this.isActive ? 'turn off' : 'turn on'}${this.label ? ` ${this.label}` : ''}`;

    return (
      <div class="inline-block" part="container" role="group" aria-label={this.label || 'Toggle'}>
        <div class="inline-flex items-center space-x-2 relative">
          {/* Label */}
          <slot name="label">
            {this.label && (
              <label
                class={`select-none mr-2 transition-colors duration-200 ${!canInteract ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer hover:text-opacity-80'} ${
                  this.dark ? 'text-white' : 'text-gray-900'
                }`}
                onClick={() => canInteract && this.handleChange()}
                title={hoverTitle}
                part="label"
              >
                {this.label}
              </label>
            )}
          </slot>

          {/* Toggle Control */}
          {this.readonly ? (
            // Read-only indicator
            <span
              class={`inline-flex items-center justify-center transition-all duration-300 ${
                this.variant === 'square' ? 'w-6 h-6 rounded-md' : this.variant === 'apple' ? 'w-7 h-7 rounded-full' : 'w-6 h-6 rounded-full'
              }`}
              style={{
                backgroundColor: this.isActive ? 'var(--color-success)' : 'var(--color-danger)',
                boxShadow: this.isActive ? '0 10px 15px -3px rgba(34, 197, 94, 0.5)' : '0 10px 15px -3px rgba(239, 68, 68, 0.5)',
              }}
              title={`${hoverTitle} - Current state: ${this.isActive ? 'ON' : 'OFF'}`}
              part="readonly-indicator"
            >
              <span class={`text-white text-xs font-bold ${this.variant === 'square' ? 'text-[10px]' : ''}`}>
                {this.variant === 'square' ? (this.isActive ? '■' : '□') : this.isActive ? '●' : '○'}
              </span>
            </span>
          ) : (
            // Interactive toggle
            <span
              class={`${this.getToggleStyle()} ${canInteract ? 'hover:shadow-md' : ''} transition-all duration-200`}
              style={{ backgroundColor: this.getBackgroundColor() }}
              onClick={() => canInteract && this.handleChange()}
              onKeyDown={this.handleKeyDown}
              tabIndex={canInteract ? 0 : -1}
              title={hoverTitle}
              part="control"
              role="switch"
              aria-checked={this.isActive ? 'true' : 'false'}
              aria-disabled={this.disabled ? 'true' : 'false'}
            >
              <span class={this.getThumbStyle()} part="thumb"></span>
              {this.renderCrossIcons()}
            </span>
          )}

          {/* Read Pulse Indicator */}
          {this.renderReadPulseIndicator()}

          {/* Status Badge */}
          {this.renderStatusBadge()}
        </div>

        {/* Last Updated Timestamp */}
        {this.renderLastUpdated()}
      </div>
    );
  }
}
