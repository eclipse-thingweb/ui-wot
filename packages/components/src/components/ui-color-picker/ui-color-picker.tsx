import { Component, Element, Prop, State, Event, EventEmitter, Method, Watch, h } from '@stencil/core';
import { UiMsg } from '../../utils/types'; // Standard message format
import { StatusIndicator, OperationStatus } from '../../utils/status-indicator'; // Status indicator utility

/**
 * A versatile color picker component designed for WoT device control.
 *
 * @example Basic Usage
 * ```html
 * <ui-color-picker value="#ff0000" label="Theme Color"></ui-color-picker>
 * ```
 *
 * @example JS integaration with node-wot browser bundle
 * ```javascript
 * const colorPicker = document.getElementById('device-color');
 * const initialValue = String(await (await thing.readProperty('deviceColor')).value());
 *
 * await colorPicker.setValue(initialValue, {
 *   writeOperation: async value => {
 *     await thing.writeProperty('deviceColor', value);
 *   }
 * });
 * ```
 */
@Component({
  tag: 'ui-color-picker',
  styleUrl: 'ui-color-picker.css',
  shadow: true,
})
export class UiColorPicker {
  @Element() el: HTMLElement;

  // ============================== COMPONENT PROPERTIES ==============================

  /** Enable dark mode theme styling when true */
  @Prop() dark: boolean = false;

  /** Current color value in hex format (e.g., #ff0000) */
  @Prop({ mutable: true }) value: string = '#000000';

  /** Output format: hex (default) | rgb | rgba | hsl | hsla */
  @Prop() format: string = 'hex';

  /** Disable user interaction when true */
  @Prop() disabled: boolean = false;

  /** Text label displayed right to the color picker (optional) */
  @Prop() label?: string;

  /** Show last updated timestamp below the component */
  @Prop() showLastUpdated: boolean = false;

  /** Show visual operation status indicators (loading, success, failed) right to the component */
  @Prop() showStatus: boolean = true;

  // ============================== COMPONENT STATE ==============================

  /** Current operation status for visual feedback */
  @State() operationStatus: OperationStatus = 'idle';

  /** Error message from failed operations if any (optional) */
  @State() lastError?: string;

  /** Timestamp when value was last updated (optional) */
  @State() lastUpdatedTs?: number;

  /** Internal state that controls the visual appearance of the color picker */
  @State() private selectedColor: string = '#000000';

  /** Internal state counter for timestamp re-rendering */
  @State() private timestampCounter: number = 0;

  /** Internal state to prevents infinite event loops while programmatic updates */
  @State() private suppressEvents: boolean = false;

  // ============================== PRIVATE PROPERTIES ==============================

  /** Tracks component initialization state to prevent early watchers */
  private isInitialized: boolean = false;

  /** Timer for updating relative timestamps */
  private timestampUpdateTimer?: number;

  /** Stores API function from first initialization to use further for any user interactions */
  private storedWriteOperation?: (value: string) => Promise<any>;

  // ============================== EVENTS ==============================

  /**
   * Emitted when color picker value changes through user interaction or setValue calls.
   * Contains the new value, previous value, timestamp, and source information.
   */
  @Event() valueMsg: EventEmitter<UiMsg<string>>;

  // ============================== PUBLIC METHODS ==============================

  /**
   * Sets the color picker value with optional device communication api and other options.
   *
   * This is the primary method for connecting color pickers to real devices.
   * It supports optimistic updates, error handling, and automatic retries.
   *
   * @param value - The color value to set in hex format (e.g., #ff0000)
   * @param options - Configuration for device communication and behavior
   * @returns Promise resolving to true if successful, false if failed
   *
   * @example Basic Usage
   * ```javascript
   * await colorPicker.setValue('#ff0000');
   * ```
   *
   * @example JS integration with node-wot browser bundle
   * ```javascript
   * const colorPicker = document.getElementById('device-color');
   * const initialValue = String(await (await thing.readProperty('deviceColor')).value());
   * await colorPicker.setValue(initialValue, {
   *   writeOperation: async value => {
   *     await thing.writeProperty('deviceColor', value);
   *   },
   *   autoRetry: { attempts: 3, delay: 1000 }
   * });
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

      try {
        // Update the value optimistically
        this.updateValue(value, prevValue, false);
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
   * Gets the current color picker value with optional metadata.
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
   * @param value - The color value to set silently in hex format
   */
  @Method()
  async setValueSilent(value: string): Promise<void> {
    this.updateValue(value, this.selectedColor, false);
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

  // ============================== LIFECYCLE METHODS ==============================

  /** Initialize component state from props */
  componentWillLoad() {
    this.selectedColor = this.parseColor(this.value || '#000000');
    this.value = this.formatColor(this.selectedColor);
    this.isInitialized = true;
    if (this.showLastUpdated) this.startTimestampUpdater();
  }

  /** Clean up timers when component is removed */
  disconnectedCallback() {
    this.stopTimestampUpdater();
  }

  // ============================== WATCHERS ==============================

  /** Sync internal state when value prop changes externally */
  @Watch('value')
  watchValue(newVal: string) {
    if (!this.isInitialized) return;

    const parsed = this.parseColor(newVal);
    if (this.selectedColor !== parsed) {
      const prevValue = this.value;
      this.selectedColor = parsed;
      this.value = this.formatColor(this.selectedColor);
      this.emitValueMsg(this.value, prevValue);
    }
  }

  // ============================== PRIVATE METHODS ==============================

  /**
   * This is the core state update method that handles value changes consistently.
   * It updates both internal state and external prop and also manages timestamps, and emits events (optional).
   */
  private updateValue(value: string, prevValue?: string, emitEvent: boolean = true): void {
    this.selectedColor = this.parseColor(value);
    this.value = this.formatColor(this.selectedColor);
    this.lastUpdatedTs = Date.now();

    if (emitEvent && !this.suppressEvents) {
      this.emitValueMsg(this.value, prevValue);
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
      // Execute the API call
      if (options.writeOperation) {
        const formatted = this.formatColor(this.parseColor(value));
        await options.writeOperation(formatted);
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
        this.updateValue(prevValue, this.value, false);
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
      source: this.el?.id || 'ui-color-picker',
      ok: true,
    });
  }

  /** Handles user color change interactions */
  private handleColorChange = async (event: Event) => {
    if (this.disabled) return;

    const target = event.target as HTMLInputElement;
    const newValue = target.value;
    const prevValue = this.value;

    StatusIndicator.applyStatus(this, 'loading');

    // Execute stored operation if available
    if (this.storedWriteOperation) {
      this.updateValue(newValue, prevValue);

      try {
        await this.storedWriteOperation(this.value);
        StatusIndicator.applyStatus(this, 'success');
      } catch (error) {
        StatusIndicator.applyStatus(this, 'error', error?.message || 'Operation failed');
        this.updateValue(prevValue, this.value, false);
      }
    } else {
      StatusIndicator.applyStatus(this, 'error', 'No operation configured - setup may have failed');
    }
  };

  private parseColor(colorInput: string): string {
    if (!colorInput) return '#000000';

    const normalizedColor = colorInput.trim().toLowerCase();

    // Handle hex color format (#fff, #ffffff, #ffffffff)
    if (normalizedColor.startsWith('#')) {
      let hex = normalizedColor.replace(/[^0-9a-f]/g, '');

      // Convert 3-digit hex to 6-digit hex (e.g., #fff -> #ffffff)
      if (hex.length === 3) {
        hex = hex
          .split('')
          .map(character => character + character)
          .join('');
      }

      if (hex.length === 6) return `#${hex}`;
      // Handle 8-digit hex (with alpha)
      if (hex.length === 8) return `#${hex.slice(0, 6)}`;
    }

    // Handle RGB/RGBA format (rgb(255, 0, 0) or rgba(255, 0, 0, 1))
    const rgb = normalizedColor.match(/^rgba?\(([^)]+)\)$/);
    if (rgb) {
      const [r, g, b] = rgb[1].split(',').map(value => parseFloat(value));

      // Convert RGB values to hex
      const convertToHex = (colorValue: number) =>
        Math.max(0, Math.min(255, Math.round(colorValue)))
          .toString(16)
          .padStart(2, '0');

      if ([r, g, b].every(value => !isNaN(value))) {
        return `#${convertToHex(r)}${convertToHex(g)}${convertToHex(b)}`;
      }
    }

    // Handle HSL/HSLA format
    const hsl = normalizedColor.match(/^hsla?\(([^)]+)\)$/);
    if (hsl) {
      const hslParts = hsl[1].split(',').map(part => part.trim());
      const hue = parseFloat(hslParts[0]);
      const saturation = parseFloat((hslParts[1] || '0').replace('%', '')) / 100;
      const lightness = parseFloat((hslParts[2] || '0').replace('%', '')) / 100;

      const [r, g, b] = this.hslToRgb(hue, saturation, lightness);
      const convertToHex = (colorValue: number) => colorValue.toString(16).padStart(2, '0');
      return `#${convertToHex(r)}${convertToHex(g)}${convertToHex(b)}`;
    }

    // Try CSS named colors
    const temporaryElement = document.createElement('div');
    temporaryElement.style.color = normalizedColor;
    document.body.appendChild(temporaryElement);
    const computedColor = getComputedStyle(temporaryElement).color;
    document.body.removeChild(temporaryElement);

    const namedColorMatch = computedColor && computedColor.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (namedColorMatch) {
      const convertToHex = (colorString: string) => parseInt(colorString, 10).toString(16).padStart(2, '0');
      return `#${convertToHex(namedColorMatch[1])}${convertToHex(namedColorMatch[2])}${convertToHex(namedColorMatch[3])}`;
    }

    // Fallback to current selected color or black
    return this.selectedColor || '#000000';
  }

  private formatColor(hexColor: string): string {
    const cleanhex = (hexColor || '#000000').replace('#', '');

    const r = parseInt(cleanhex.slice(0, 2), 16) || 0;
    const g = parseInt(cleanhex.slice(2, 4), 16) || 0;
    const b = parseInt(cleanhex.slice(4, 6), 16) || 0;

    const outputFormat = (this.format || 'hex').toLowerCase();

    if (outputFormat === 'rgb') return `rgb(${r}, ${g}, ${b})`;
    if (outputFormat === 'rgba') return `rgba(${r}, ${g}, ${b}, 1)`;

    if (outputFormat === 'hsl' || outputFormat === 'hsla') {
      const [hue, saturation, lightness] = this.rgbToHsl(r, g, b);
      return outputFormat === 'hsl' ? `hsl(${hue}, ${saturation}%, ${lightness}%)` : `hsla(${hue}, ${saturation}%, ${lightness}%, 1)`;
    }

    // Default to hex format
    return `#${cleanhex}`;
  }

  private hslToRgb(hue: number, saturation: number, lightness: number): [number, number, number] {
    // Calculate chroma color intensity
    const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
    const intermediateValue = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
    const lightnessMatch = lightness - chroma / 2;

    let r = 0;
    let g = 0;
    let b = 0;

    // Determine RGB values based on hue sector (0-360 degrees divided into 6 sectors)
    if (0 <= hue && hue < 60) {
      // Red to Yellow sector
      r = chroma;
      g = intermediateValue;
      b = 0;
    } else if (60 <= hue && hue < 120) {
      // Yellow to Green sector
      r = intermediateValue;
      g = chroma;
      b = 0;
    } else if (120 <= hue && hue < 180) {
      // Green to Cyan sector
      r = 0;
      g = chroma;
      b = intermediateValue;
    } else if (180 <= hue && hue < 240) {
      // Cyan to Blue sector
      r = 0;
      g = intermediateValue;
      b = chroma;
    } else if (240 <= hue && hue < 300) {
      // Blue to Magenta sector
      r = intermediateValue;
      g = 0;
      b = chroma;
    } else {
      // Magenta to Red sector (300-360 degrees)
      r = chroma;
      g = 0;
      b = intermediateValue;
    }

    // Convert to 0-255 range and round to integers
    return [Math.round((r + lightnessMatch) * 255), Math.round((g + lightnessMatch) * 255), Math.round((b + lightnessMatch) * 255)];
  }

  private rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    // Normalize RGB values to 0-1 range
    const redDecimal = r / 255;
    const greenDecimal = g / 255;
    const blueDecimal = b / 255;

    const maxColorValue = Math.max(redDecimal, greenDecimal, blueDecimal);
    const minColorValue = Math.min(redDecimal, greenDecimal, blueDecimal);

    let hue = 0;
    let saturation = 0;

    // Calculate lightness (average of max and min)
    const lightness = (maxColorValue + minColorValue) / 2;

    // Calculate hue and saturation if color is not grayscale
    if (maxColorValue !== minColorValue) {
      const colorDifference = maxColorValue - minColorValue;

      // Calculate saturation based on lightness
      saturation = lightness > 0.5 ? colorDifference / (2 - maxColorValue - minColorValue) : colorDifference / (maxColorValue + minColorValue);

      // Calculate hue based on which color component is dominant
      switch (maxColorValue) {
        case redDecimal:
          // Red is dominant - hue in red-yellow or red-magenta range
          hue = (greenDecimal - blueDecimal) / colorDifference + (greenDecimal < blueDecimal ? 6 : 0);
          break;
        case greenDecimal:
          // Green is dominant - hue in yellow-cyan range
          hue = (blueDecimal - redDecimal) / colorDifference + 2;
          break;
        case blueDecimal:
          // Blue is dominant - hue in cyan-magenta range
          hue = (redDecimal - greenDecimal) / colorDifference + 4;
          break;
      }

      // Convert hue to degrees (0-360)
      hue *= 60;
    }

    // Return HSL values: hue (0-360), saturation (0-100%), lightness (0-100%)
    return [Math.round(hue), Math.round(saturation * 100), Math.round(lightness * 100)];
  }

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

  // ============================== MAIN COMPONENT RENDER METHOD ==============================

  /**
   * Renders the complete color picker component with all features and styles.
   */
  render() {
    const canInteract = !this.disabled;

    return (
      <div class="inline-block" part="container" role="group" aria-label={this.label || 'Color Picker'}>
        <div class="inline-flex items-center space-x-2 relative">
          {/* Label */}
          {this.label && (
            <label
              class={`select-none mr-2 transition-colors duration-200 ${!canInteract ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer hover:text-opacity-80'} ${
                this.dark ? 'text-white' : 'text-gray-900'
              }`}
              part="label"
            >
              {this.label}
            </label>
          )}

          {/* Color Picker Input */}
          <input
            type="color"
            class={`color-picker-input w-16 h-16 border-2 border-gray-300 dark:border-gray-600 rounded-md transition-all duration-200 ${
              this.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400 dark:hover:border-gray-500'
            }`}
            value={this.selectedColor}
            disabled={this.disabled}
            onInput={e => canInteract && this.handleColorChange(e)}
            part="color-input"
          />

          {/* Status Badge */}
          {this.renderStatusBadge()}
        </div>

        {/* Last Updated Timestamp */}
        {this.renderLastUpdated()}
      </div>
    );
  }
}
