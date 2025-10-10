import { Component, Element, Prop, State, Event, EventEmitter, Method, Watch, h } from '@stencil/core';
import { UiMsg } from '../../utils/types'; // Standard message format
import { StatusIndicator, OperationStatus } from '../../utils/status-indicator'; // Status indicator utility

/**
 * A versatile calendar component designed for WoT device control.
 *
 * It has various features, visual styles, status and last updated timestamps and other options.
 *
 * @example Basic Usage
 * ```html
 * <ui-calendar variant="outlined" value="2023-12-25T00:00:00.000Z" label="Select Date"></ui-calendar>
 * <ui-calendar variant="filled" include-time="true" label="Pick Date & Time"></ui-calendar>
 * <ui-calendar variant="outlined" label="Device Calendar" show-last-updated="true"></ui-calendar>
 * ```
 *
 * @example JS integaration with node-wot browser bundle
 * ```javascript
 * const calendar = document.getElementById('device-calendar');
 * const initialValue = await (await thing.readProperty('targetDate')).value();
 *
 * await calendar.setValue(initialValue, {
 *   writeOperation: async value => {
 *     await thing.writeProperty('targetDate', value);
 *   }
 * });
 * ```
 */
@Component({
  tag: 'ui-calendar',
  styleUrl: 'ui-calendar.css',
  shadow: true,
})
export class UiCalendar {
  @Element() el!: HTMLElement;

  // ============================== COMPONENT PROPERTIES ==============================

  /**
   * Visual style variant of the calendar.
   * - outlined: Border-focused design with outline style
   * - filled: Solid background design
   */
  @Prop() variant: 'outlined' | 'filled' = 'outlined';

  /** Color theme for the active state matching to thingsweb theme */
  @Prop() color: 'primary' | 'secondary' | 'neutral' = 'primary';

  /** Enable dark mode theme styling when true */
  @Prop() dark: boolean = false;

  /** Current date-time value of the calendar (ISO string) */
  @Prop({ mutable: true }) value?: string;

  /** Output/storage format: iso | epoch-ms | epoch-s | unix | rfc2822 */
  @Prop() format: string = 'iso';

  /** Date display pattern (dd/MM/yyyy, MM-DD-YYYY, yyyy/MM/dd, etc.) */
  @Prop() dateFormat: string = 'dd/MM/yyyy';

  /** Disable user interaction when true */
  @Prop() disabled: boolean = false;

  /** Text label displayed above the calendar (optional) */
  @Prop() label?: string;

  /** Enable keyboard navigation so user can interact using keyboard when true */
  @Prop() keyboard: boolean = true;

  /** Show last updated timestamp below the component */
  @Prop() showLastUpdated: boolean = false;

  /** Show visual operation status indicators (loading, success, failed) right to the component */
  @Prop() showStatus: boolean = true;

  /** Connection state for readonly mode */
  @Prop({ mutable: true }) connected: boolean = true;

  /** Display calendar inline instead of as a popup */
  @Prop() inline: boolean = false;

  /** Include time picker alongside date picker */
  @Prop() includeTime: boolean = false;

  /** Time format when includeTime is enabled (12-hour or 24-hour) */
  @Prop() timeFormat: '12' | '24' = '12';

  /** Show week numbers in calendar grid */
  @Prop() showWeekNumbers: boolean = false;

  /** First day of week (0 = Sunday, 1 = Monday) */
  @Prop() firstDayOfWeek: 0 | 1 = 0;

  /** Show today button */
  @Prop() showTodayButton: boolean = true;

  /** Show clear button to reset selection */
  @Prop() showClearButton: boolean = true;

  /** Minimum selectable date (ISO string)  (Optional) */
  @Prop() minDate?: string;

  /** Maximum selectable date (ISO string)  (Optional) */
  @Prop() maxDate?: string;

  // ============================== COMPONENT STATE ==============================

  /** Current operation status for visual feedback */
  @State() operationStatus: OperationStatus = 'idle';

  /** Error message from failed operations if any (optional) */
  @State() lastError?: string;

  /** Timestamp when value was last updated (optional) */
  @State() lastUpdatedTs?: number;

  /** Internal state that controls the selected date */
  @State() private selectedDate: Date = new Date();

  /** Internal state counter for timestamp re-rendering */
  @State() private timestampCounter = 0;

  /** Internal state to prevents infinite event loops while programmatic updates */
  @State() private suppressEvents: boolean = false;

  /** Current view (month/year) */
  @State() private currentMonth: number = new Date().getMonth();

  /** Current view year */
  @State() private currentYear: number = new Date().getFullYear();

  /** Calendar open state */
  @State() private isOpen: boolean = false;

  /** Time picker state */
  @State() private selectedHour: number = 12;

  /** Time picker minutes state */
  @State() private selectedMinute: number = 0;

  /** Time picker AM/PM state */
  @State() private isAM: boolean = true;

  /** Clock view toggle state */
  @State() private showClockView: boolean = false;

  // ============================== PRIVATE PROPERTIES ==============================

  /** Input element reference */
  private inputEl?: HTMLInputElement | null;

  /** Calendar element reference */
  private calendarEl?: HTMLElement | null;

  /** Previously focused element for focus management */
  private previouslyFocused?: Element | null;

  /** Tracks component initialization state to prevent early watchers*/
  private isInitialized: boolean = false;

  /** Timer for updating relative timestamps */
  private timestampUpdateTimerRef?: number;

  /** Stores API function from first initialization to use further for any user interactions */
  private storedWriteOperation?: (value: string) => Promise<any>;

  // ============================== EVENTS ==============================

  /**
   * Emitted when calendar value changes through user interaction or setValue calls.
   * Contains the new value, previous value, timestamp, and source information.
   */
  @Event() valueMsg: EventEmitter<UiMsg<string>>;

  // ============================== PUBLIC METHODS ==============================

  /**
   * Sets the calendar value with optional device communication api and other options.
   *
   * This is the primary method for connecting calendars to real devices.
   * It supports optimistic updates, error handling, and automatic retries.
   *
   * @param value - The date string value to set (ISO format)
   * @param options - Optional configuration for device communication and behavior
   * @returns Promise resolving to any result from the operation
   *
   * @example Basic Usage
   * ```javascript
   * await calendar.setValue('2023-12-25T00:00:00.000Z');
   * ```
   *
   * @example JS integration with node-wot browser bundle
   * ```javascript
   * const calendar = document.getElementById('device-calendar');
   * const initialValue = await (await thing.readProperty('targetDate')).value();
   * await calendar.setValue(initialValue, {
   *   writeOperation: async value => {
   *     await thing.writeProperty('targetDate', value);
   *   }
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
  ): Promise<any> {
    const prevValue = this.value;

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

    // Execute operation with optimistic update + retry handling
    return this.executeOperation(value, prevValue, options);
  }

  /**
   * Gets the current calendar value with optional metadata.
   *
   * @param includeMetadata - Whether to include status, timestamp and other information
   * @returns Current value or detailed metadata object
   */
  @Method()
  async getValue(includeMetadata: boolean = false): Promise<string | undefined | { value: string | undefined; lastUpdated?: number; status: string; error?: string }> {
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
   * @param value - The date string value to set silently (ISO format)
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

  // ============================== LIFECYCLE METHODS ==============================

  /** Initialize component state from props */
  async componentWillLoad() {
    this.isInitialized = true;
    if (this.value) {
      this.selectedDate = this.parseDate(this.value);
      this.currentMonth = this.selectedDate.getMonth();
      this.currentYear = this.selectedDate.getFullYear();
    }

    if (this.showLastUpdated) this.startTimestampUpdater();
  }

  /** Clean up timers when component is removed */
  disconnectedCallback() {
    this.stopTimestampUpdater();
  }

  // ============================== WATCHERS ==============================

  /** Sync internal state when value prop changes externally */
  @Watch('value')
  watchValue() {
    if (!this.isInitialized) return;

    if (this.value) {
      this.selectedDate = new Date(this.value);
      this.currentMonth = this.selectedDate.getMonth();
      this.currentYear = this.selectedDate.getFullYear();
    }
  }

  // ============================== PRIVATE METHODS ==============================

  /**
   * This is the core state update method that handles value changes consistently.
   * It updates both internal state and external prop and also manages timestamps, and emits events (optional).
   */
  private updateValue(value: string, prevValue?: string, emitEvent: boolean = true): void {
    const d = this.parseDate(value);
    if (!isNaN(d.getTime())) {
      this.selectedDate = d;
      this.currentMonth = d.getMonth();
      this.currentYear = d.getFullYear();
      this.value = this.formatDate(d);
    } else {
      this.value = value;
    }

    this.lastUpdatedTs = Date.now();

    if (emitEvent && !this.suppressEvents) {
      this.emitValueMsg(value, prevValue);
    }
  }

  /** Executes stored operations with error handling and retry logic */
  private async executeOperation(value: string, prevValue: string, options: any): Promise<boolean> {
    const optimistic = options?.optimistic !== false;

    // Optimistic state update
    if (optimistic && !options?._isRevert) {
      this.updateValue(value, prevValue);
    }

    StatusIndicator.applyStatus(this, 'loading');

    try {
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
  private emitValueMsg(value: string, prevValue?: string): void {
    // Emit standardized event
    this.valueMsg.emit({
      newVal: value,
      prevVal: prevValue,
      ts: Date.now(),
      source: this.el?.id || 'ui-calendar',
      ok: true,
      meta: {
        component: 'ui-calendar',
        type: 'setValue',
        source: 'method',
      },
    });
  }

  /** Handles user date selection interactions */
  private async handleDateSelect(day: number) {
    if (this.disabled) return;

    const newDate = new Date(this.currentYear, this.currentMonth, day);

    // Preserve time if includeTime is enabled
    if (this.includeTime && this.selectedDate && !isNaN(this.selectedDate.getTime())) {
      newDate.setHours(this.selectedDate.getHours());
      newDate.setMinutes(this.selectedDate.getMinutes());
    }

    const prevValue = this.value;
    const newValue = newDate.toISOString();

    try {
      if (this.storedWriteOperation) {
        this.updateValue(newValue, prevValue);
        await this.storedWriteOperation(newValue);
      } else {
        this.updateValue(newValue, prevValue);
      }

      this.isOpen = false;
    } catch (error) {
      console.error('handleDateSelect error for ui-calendar:', error);
      this.updateValue(prevValue!, newValue, false); // Revert on error
      if (this.storedWriteOperation) {
        StatusIndicator.applyStatus(this, 'error', 'Write operation failed');
      }
    }
  }

  /** Handle keyboard input for calendar interactions */
  private onDocumentKeyDown = (e: KeyboardEvent) => {
    if (!this.isOpen) return;
    if (!this.keyboard) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      this.closeCalendar();
      return;
    }

    if (e.key === 'Tab') {
      // trap focus inside the calendar when open
      const container = this.calendarEl;
      if (!container) return;
      const focusable = Array.from(container.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(
        el => !el.hasAttribute('disabled'),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (active === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  };

  /** Open calendar dropdown */
  private openCalendar() {
    this.previouslyFocused = document.activeElement;
    this.isOpen = true;
    // wait for calendar to render
    setTimeout(() => {
      const container = this.calendarEl;
      const first = container?.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (first) first.focus();
      document.addEventListener('keydown', this.onDocumentKeyDown);
    }, 0);
  }

  /** Close calendar dropdown */
  private closeCalendar() {
    this.isOpen = false;
    document.removeEventListener('keydown', this.onDocumentKeyDown);
    if (this.previouslyFocused && (this.previouslyFocused as HTMLElement).focus) {
      try {
        (this.previouslyFocused as HTMLElement).focus();
      } catch (e) {}
    } else if (this.inputEl) {
      try {
        this.inputEl.focus();
      } catch (e) {}
    }
  }

  /** Toggle calendar open/close state */
  private toggleOpen = () => {
    if (this.isOpen) this.closeCalendar();
    else this.openCalendar();
  };

  /** Clear current selection */
  private clearSelection() {
    const prevValue = this.value;
    this.selectedDate = new Date(NaN);
    this.value = '';
    this.lastUpdatedTs = Date.now();
    this.valueMsg.emit({
      newVal: this.value,
      prevVal: prevValue,
      ts: Date.now(),
      source: this.el?.id || 'ui-calendar',
      ok: true,
      meta: { component: 'ui-calendar', type: 'clear', source: 'user' },
    });
  }

  /** Jump to today */
  private selectToday() {
    const today = new Date();
    this.currentMonth = today.getMonth();
    this.currentYear = today.getFullYear();
    const day = today.getDate();
    if (!this.isDayOutOfRange(day)) {
      this.handleDateSelect(day);
    }
  }

  /** Handle time change */
  private async handleTimeChange(event: Event) {
    if (this.disabled) return;

    const target = event.target as HTMLInputElement;
    const [hours, minutes] = target.value.split(':').map(Number);

    const base = this.selectedDate && !isNaN(this.selectedDate.getTime()) ? new Date(this.selectedDate) : new Date();
    const newDate = base;
    newDate.setHours(hours);
    newDate.setMinutes(minutes);

    const prevValue = this.value;
    const newValue = newDate.toISOString();

    try {
      if (this.storedWriteOperation) {
        this.selectedDate = newDate;
        this.value = newValue;
        await this.storedWriteOperation(newValue);
      } else {
        this.selectedDate = newDate;
        this.value = newValue;
      }

      // Emit standardized event
      this.valueMsg.emit({
        newVal: this.value,
        prevVal: prevValue,
        ts: Date.now(),
        source: this.el?.id || 'ui-calendar',
        ok: true,
        meta: {
          component: 'ui-calendar',
          type: 'timeChange',
          source: 'user',
        },
      });
    } catch (error) {
      console.error('handleTimeChange error for ui-calendar:', error);
      if (this.storedWriteOperation) {
        StatusIndicator.applyStatus(this, 'error', 'Write operation failed');
      }
    }
  }

  /** Clock interface methods */
  private async updateTimeFromClock() {
    if (!this.selectedDate || isNaN(this.selectedDate.getTime())) this.selectedDate = new Date();

    const newDate = new Date(this.selectedDate);
    let hours = this.selectedHour;

    if (this.timeFormat === '12') {
      if (this.selectedHour === 12) {
        hours = this.isAM ? 0 : 12;
      } else {
        hours = this.isAM ? this.selectedHour : this.selectedHour + 12;
      }
    }

    newDate.setHours(hours);
    newDate.setMinutes(this.selectedMinute);

    const prevValue = this.value;
    const newValue = newDate.toISOString();

    try {
      if (this.storedWriteOperation) {
        this.selectedDate = newDate;
        this.value = newValue;
        await this.storedWriteOperation(newValue);
      } else {
        this.selectedDate = newDate;
        this.value = newValue;
      }

      // Emit standardized event
      this.valueMsg.emit({
        newVal: this.value,
        prevVal: prevValue,
        ts: Date.now(),
        source: this.el?.id || 'ui-calendar',
        ok: true,
        meta: {
          component: 'ui-calendar',
          type: 'clockChange',
          source: 'user',
        },
      });
    } catch (error) {
      console.error('updateTimeFromClock error for ui-calendar:', error);
      if (this.storedWriteOperation) {
        StatusIndicator.applyStatus(this, 'error', 'Write operation failed');
      }
    }
  }

  /** Update clock state from selected date */
  private updateClockFromSelectedDate() {
    if (!this.selectedDate || isNaN(this.selectedDate.getTime())) return;

    const hours = this.selectedDate.getHours();
    const minutes = this.selectedDate.getMinutes();

    if (this.timeFormat === '12') {
      if (hours === 0) {
        this.selectedHour = 12;
        this.isAM = true;
      } else if (hours === 12) {
        this.selectedHour = 12;
        this.isAM = false;
      } else if (hours > 12) {
        this.selectedHour = hours - 12;
        this.isAM = false;
      } else {
        this.selectedHour = hours;
        this.isAM = true;
      }
    } else {
      this.selectedHour = hours;
    }

    this.selectedMinute = minutes;
  }

  /** Set hour in clock interface */
  private async setHour(hour: number) {
    this.selectedHour = hour;
    await this.updateTimeFromClock();
  }

  /** Set minute in clock interface */
  private async setMinute(minute: number) {
    this.selectedMinute = minute;
    await this.updateTimeFromClock();
  }

  /** Toggle AM/PM in 12-hour format */
  private async toggleAMPM() {
    this.isAM = !this.isAM;
    await this.updateTimeFromClock();
  }

  /** Toggle between clock and input view */
  private toggleClockView() {
    this.showClockView = !this.showClockView;
    if (this.showClockView) {
      this.updateClockFromSelectedDate();
    }
  }

  /** Navigate month by direction */
  private navigateMonth(direction: number) {
    let newMonth = this.currentMonth + direction;
    let newYear = this.currentYear;

    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }

    this.currentMonth = newMonth;
    this.currentYear = newYear;
  }

  /** Get comprehensive calendar styles matching component family design */
  private getCalendarStyles() {
    const isDisabled = this.disabled;
    const colorVars = this.getColorVars();

    // Base container styles
    let containerClass = `relative ${this.inline ? 'block' : 'inline-block'} w-50`;

    // Enhanced input styles with family consistency
    let inputClass = `w-full h-10 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 px-3 py-2 text-sm ${
      isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
    }`;

    // Calendar popup/inline styles with enhanced design
    let calendarClass = `${this.inline ? 'relative' : 'absolute top-full left-0 mt-1 z-[9999]'} ${
      this.dark ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'
    } border rounded-lg shadow-lg p-4 min-w-72`;

    // Inline styles for CSS variable colors
    let inputStyle: any = {};

    // Variant-specific styling
    if (this.variant === 'outlined') {
      inputClass += ` border bg-transparent ${this.dark ? 'text-white hover:bg-gray-800' : 'hover:bg-gray-50'}`;
      inputStyle.borderColor = colorVars.main;
      if (!this.dark) inputStyle.color = colorVars.main;
    } else if (this.variant === 'filled') {
      inputClass += ` border-0 focus:ring-white`;
      inputStyle.backgroundColor = colorVars.main;
      inputStyle.color = this.dark ? 'black' : 'white';
    }

    return { containerClass, inputClass, calendarClass, inputStyle };
  }

  /** Get CSS variable-based colors for components */
  private getColorVars() {
    switch (this.color) {
      case 'secondary':
        return { main: 'var(--color-secondary)', hover: 'var(--color-secondary-hover)', light: 'var(--color-secondary-light)' };
      case 'neutral':
        return { main: 'var(--color-neutral)', hover: 'var(--color-neutral-hover)', light: 'var(--color-neutral-light)' };
      default:
        return { main: 'var(--color-primary)', hover: 'var(--color-primary-hover)', light: 'var(--color-primary-light)' };
    }
  }

  /** Get days in month */
  private getDaysInMonth() {
    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const nativeStart = firstDay.getDay(); // 0 (Sun) - 6 (Sat)
    const adjustedStart = (nativeStart - this.firstDayOfWeek + 7) % 7; // shift for firstDayOfWeek

    const days: Array<number | null> = [];

    // Leading empty cells
    for (let i = 0; i < adjustedStart; i++) {
      days.push(null);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    // Trailing padding to complete final week
    while (days.length % 7 !== 0) {
      days.push(null);
    }

    return days;
  }

  /** Format display value for the calendar input field */
  private getDisplayValue() {
    // Return empty string if no valid date is selected
    if (!this.selectedDate || isNaN(this.selectedDate.getTime())) return '';

    const currentDate = this.selectedDate;
    const addZero = (numberValue: number) => String(numberValue).padStart(2, '0');

    // Create mapping of date format
    const dateMap: Record<string, string> = {
      dd: addZero(currentDate.getDate()), // Day of month (01-31)
      mm: addZero(currentDate.getMonth() + 1), // Month (01-12, +1 because getMonth() returns 0-11)
      yyyy: String(currentDate.getFullYear()), // Full year (e.g., 2024)
    };

    let formatPattern = this.dateFormat;
    formatPattern = formatPattern.replace(/yyyy|YYYY|MM|mm|dd|DD/g, token => dateMap[token.toLowerCase()]);

    // If time is not included, return just the date part
    if (!this.includeTime) return formatPattern;

    // Handle time formatting when includeTime is enabled
    const hr24Format = currentDate.getHours(); // 0-23 format
    const minFormatted = addZero(currentDate.getMinutes());

    if (this.timeFormat === '12') {
      // Convert to 12-hour format with AM/PM
      const isAM = hr24Format < 12;
      const hr12Format = hr24Format % 12 === 0 ? 12 : hr24Format % 12;
      const amPmIndicator = isAM ? 'AM' : 'PM';

      return `${formatPattern} ${addZero(hr12Format)}:${minFormatted} ${amPmIndicator}`;
    }

    // Return 24-hour format
    return `${formatPattern} ${addZero(hr24Format)}:${minFormatted}`;
  }

  /** Parse date string from various formats */
  private parseDate(dateValue: string): Date {
    // Return invalid date for empty input
    if (!dateValue) return new Date(NaN);

    const inputFormat = this.format.toLowerCase();

    // Handle Unix/Epoch timestamp in milliseconds (e.g., "1640995200000")
    if ((inputFormat === 'epoch-ms' || inputFormat === 'unix-ms') && /^-?\d+$/.test(dateValue)) {
      return new Date(parseInt(dateValue, 10));
    }

    // Handle Unix/Epoch timestamp in seconds (e.g., "1640995200")
    if ((inputFormat === 'epoch-s' || inputFormat === 'unix') && /^-?\d+$/.test(dateValue)) {
      return new Date(parseInt(dateValue, 10) * 1000); // Convert seconds to milliseconds
    }

    // Handle RFC 2822 format (e.g., "Mon, 25 Dec 1995 13:30:00 GMT")
    if (inputFormat === 'rfc2822') return new Date(dateValue);

    // Default: ISO format and other standard formats (e.g., "2023-12-25T10:30:00.000Z")
    return new Date(dateValue);
  }

  /** Format Date object into string */
  private formatDate(dateObject: Date): string {
    const outputFormat = this.format.toLowerCase();

    // Return Unix/Epoch timestamp in milliseconds (e.g., "1640995200000")
    if (outputFormat === 'epoch-ms' || outputFormat === 'unix-ms') {
      return String(dateObject.getTime());
    }

    // Return Unix/Epoch timestamp in seconds (e.g., "1640995200")
    if (outputFormat === 'epoch-s' || outputFormat === 'unix') {
      return String(Math.floor(dateObject.getTime() / 1000)); // Convert milliseconds to seconds
    }

    // Return RFC 2822 format (e.g., "Mon, 25 Dec 1995 13:30:00 GMT")
    if (outputFormat === 'rfc2822') return dateObject.toUTCString();

    // Default: Return ISO 8601 format (e.g., "2023-12-25T10:30:00.000Z")
    return dateObject.toISOString();
  }

  /** Get month name */
  private getMonthName() {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months[this.currentMonth];
  }

  /** Get weekday labels shifted by firstDayOfWeek */
  private getWeekdayLabels() {
    const base = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    if (this.firstDayOfWeek === 0) return base;
    return [...base.slice(1), base[0]]; // Monday-first
  }

  /** Get ISO week number for a given date */
  private getISOWeek(d: Date) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    // Set to nearest Thursday: current date + 4 - current day number
    const dayNum = date.getUTCDay() || 7; // 1..7 (Mon..Sun)
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    // Year of the week
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    // Calculate week number: (days between + 1) / 7
    const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return weekNo;
  }

  /** Determine if a given day (in current month) is disabled by min/max */
  private isDayOutOfRange(day: number) {
    const candidate = new Date(this.currentYear, this.currentMonth, day);
    if (this.minDate) {
      const min = new Date(this.minDate);
      if (candidate < new Date(min.getFullYear(), min.getMonth(), min.getDate())) return true;
    }
    if (this.maxDate) {
      const max = new Date(this.maxDate);
      if (candidate > new Date(max.getFullYear(), max.getMonth(), max.getDate())) return true;
    }
    return false;
  }

  /** Manages timestamp update timer for relative time display */
  private startTimestampUpdater() {
    this.stopTimestampUpdater();
    this.timestampUpdateTimerRef = window.setInterval(() => this.timestampCounter++, 60000); //  Update every minute
  }

  /** Stops the timestamp update timer */
  private stopTimestampUpdater() {
    if (this.timestampUpdateTimerRef) {
      clearInterval(this.timestampUpdateTimerRef);
      this.timestampUpdateTimerRef = undefined;
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
   * Renders the complete calendar component with all features and styles.
   */
  render() {
    const styles = this.getCalendarStyles();
    const isDisabled = this.disabled;
    const days = this.getDaysInMonth();
    const weekDays = this.getWeekdayLabels();
    const weeks: Array<Array<number | null>> = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    return (
      <div class="inline-block" part="container" role="group" aria-label={this.label || 'Calendar'}>
        {/* Label */}
        {this.label && (
          <label
            class={`block mb-2 text-sm font-medium select-none ${isDisabled ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer hover:opacity-80'} ${
              this.dark ? 'text-white' : 'text-gray-900'
            }`}
            onClick={() => !isDisabled && this.toggleOpen()}
            part="label"
          >
            {this.label}
          </label>
        )}
        <div class="relative">
          {/* Calendar Input Container */}
          <div class={styles.containerClass}>
            {/* Input Field */}
            <div class="relative">
              <input
                ref={el => (this.inputEl = el as HTMLInputElement)}
                type="text"
                disabled={isDisabled}
                value={this.getDisplayValue()}
                class={styles.inputClass}
                style={styles.inputStyle}
                onClick={() => !isDisabled && this.toggleOpen()}
                placeholder={this.includeTime ? 'Select date and time' : 'Select date'}
                aria-haspopup="dialog"
                aria-expanded={this.isOpen ? 'true' : 'false'}
                readOnly
              />

              {/* Calendar Icon */}
              <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                {/* License: MIT. Made by Microsoft: https://github.com/microsoft/vscode-codicons */}
                <svg
                  class={this.dark ? 'text-white font-bold' : 'text-gray-900 font-bold'}
                  width="18"
                  height="18"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fill-rule="evenodd"
                    clip-rule="evenodd"
                    d="M14.5 2H13V1h-1v1H4V1H3v1H1.5l-.5.5v12l.5.5h13l.5-.5v-12l-.5-.5zM14 14H2V5h12v9zm0-10H2V3h12v1zM4 8H3v1h1V8zm-1 2h1v1H3v-1zm1 2H3v1h1v-1zm2-4h1v1H6V8zm1 2H6v1h1v-1zm-1 2h1v1H6v-1zm1-6H6v1h1V6zm2 2h1v1H9V8zm1 2H9v1h1v-1zm-1 2h1v1H9v-1zm1-6H9v1h1V6zm2 2h1v1h-1V8zm1 2h-1v1h1v-1zm-1-4h1v1h-1V6z"
                    fill="currentColor"
                    opacity="0.8"
                  />
                </svg>
              </div>
            </div>

            {/* Calendar Dropdown */}
            {this.isOpen && (
              <div ref={el => (this.calendarEl = el as HTMLElement)} class={styles.calendarClass} role="dialog" aria-modal="true">
                {/* Header */}
                <div class="flex items-center justify-between mb-4">
                  <button class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => this.navigateMonth(-1)}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 12L6 8L10 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  </button>

                  <div class={`text-lg font-medium ${this.dark ? 'text-white' : 'text-gray-900'}`}>
                    {this.getMonthName()} {this.currentYear}
                  </div>

                  <button class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => this.navigateMonth(1)}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 4L10 8L6 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  </button>
                </div>

                {/* Week Days */}
                <div class={`${this.showWeekNumbers ? 'grid grid-cols-8' : 'grid grid-cols-7'} gap-1 mb-2`}>
                  {this.showWeekNumbers && <div class={`text-center text-xs font-medium py-2 ${this.dark ? 'text-gray-400' : 'text-gray-500'}`}>Wk</div>}
                  {weekDays.map(day => (
                    <div class={`text-center text-xs font-medium py-2 ${this.dark ? 'text-gray-400' : 'text-gray-500'}`}>{day}</div>
                  ))}
                </div>

                {/* Calendar Grid with optional week numbers */}
                <div class="flex flex-col gap-1">
                  {weeks.map((week, wIdx) => {
                    const firstRealDay = week.find(d => d !== null) as number | null;
                    const weekDate = firstRealDay ? new Date(this.currentYear, this.currentMonth, firstRealDay) : new Date(this.currentYear, this.currentMonth, 1);
                    const weekNo = this.getISOWeek(weekDate);
                    return (
                      <div class={`${this.showWeekNumbers ? 'grid grid-cols-8' : 'grid grid-cols-7'} gap-1`}>
                        {this.showWeekNumbers && <div class={`h-8 text-xs flex items-center justify-center ${this.dark ? 'text-gray-400' : 'text-gray-500'}`}>{weekNo}</div>}
                        {week.map((day, index) => {
                          const isSelected =
                            day === this.selectedDate?.getDate() && this.currentMonth === this.selectedDate?.getMonth() && this.currentYear === this.selectedDate?.getFullYear();
                          const isDisabledDay = day === null || (day !== null && this.isDayOutOfRange(day));
                          const baseText = this.dark ? 'text-white' : 'text-gray-900';
                          return (
                            <button
                              key={`${wIdx}-${index}`}
                              class={`h-8 text-sm rounded transition-colors ${
                                isDisabledDay ? 'opacity-40 cursor-not-allowed' : isSelected ? '' : `hover:bg-gray-100 dark:hover:bg-gray-700 ${baseText}`
                              }`}
                              style={
                                day !== null && isSelected ? { backgroundColor: this.getColorVars().main, color: this.variant === 'filled' && this.dark ? 'black' : 'white' } : {}
                              }
                              disabled={isDisabledDay}
                              onClick={() => day && !isDisabledDay && this.handleDateSelect(day)}
                            >
                              {day ?? ''}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>

                {(this.showTodayButton || this.showClearButton) && (
                  <div class={`mt-3 pt-3 border-t ${this.dark ? 'border-gray-700' : 'border-gray-200'} flex justify-between`}>
                    {this.showTodayButton ? (
                      <button
                        type="button"
                        class={`px-3 py-1 text-sm rounded ${this.dark ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                        onClick={() => this.selectToday()}
                      >
                        Today
                      </button>
                    ) : (
                      <span></span>
                    )}
                    {this.showClearButton && (
                      <button
                        type="button"
                        class={`px-3 py-1 text-sm rounded ${this.dark ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                        onClick={() => this.clearSelection()}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}

                {/* Enhanced Time Picker with Clock Interface */}
                {this.includeTime && (
                  <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <div class="flex items-center justify-between mb-3">
                      <label class={`text-sm font-medium ${this.dark ? 'text-white' : 'text-gray-900'}`}>Time</label>
                      <button
                        type="button"
                        class={`px-2 py-1 text-xs rounded ${
                          this.showClockView ? 'text-white' : this.dark ? 'bg-gray-600 text-white hover:bg-gray-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        style={this.showClockView ? { backgroundColor: this.getColorVars().main } : {}}
                        onClick={() => this.toggleClockView()}
                      >
                        {this.showClockView ? '📝 Input' : '🕐 Clock'}
                      </button>
                    </div>

                    {this.showClockView ? (
                      /* Visual Clock Interface */
                      <div class="flex flex-col items-center space-y-4">
                        {/* Hour Selection */}
                        <div class="text-center">
                          <div class={`text-xs mb-2 ${this.dark ? 'text-gray-300' : 'text-gray-600'}`}>Hours</div>
                          <div class="grid grid-cols-4 gap-1 max-w-48">
                            {Array.from({ length: this.timeFormat === '12' ? 12 : 24 }, (_, i) => {
                              const hour = this.timeFormat === '12' ? i + 1 : i;
                              return (
                                <button
                                  type="button"
                                  class={`w-8 h-8 text-xs rounded-full transition-all ${
                                    this.selectedHour === hour
                                      ? 'text-white'
                                      : this.dark
                                        ? 'bg-gray-700 text-white hover:bg-gray-600'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  }`}
                                  style={this.selectedHour === hour ? { backgroundColor: this.getColorVars().main } : {}}
                                  onClick={async () => await this.setHour(hour)}
                                >
                                  {hour.toString().padStart(2, '0')}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Minute Selection */}
                        <div class="text-center">
                          <div class={`text-xs mb-2 ${this.dark ? 'text-gray-300' : 'text-gray-600'}`}>Minutes</div>
                          <div class="grid grid-cols-6 gap-1 max-w-48">
                            {Array.from({ length: 12 }, (_, i) => {
                              const minute = i * 5;
                              return (
                                <button
                                  type="button"
                                  class={`w-8 h-8 text-xs rounded-full transition-all ${
                                    this.selectedMinute === minute
                                      ? 'text-white'
                                      : this.dark
                                        ? 'bg-gray-700 text-white hover:bg-gray-600'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  }`}
                                  style={this.selectedMinute === minute ? { backgroundColor: this.getColorVars().main } : {}}
                                  onClick={async () => await this.setMinute(minute)}
                                >
                                  {minute.toString().padStart(2, '0')}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* AM/PM Toggle for 12-hour format */}
                        {this.timeFormat === '12' && (
                          <div class="flex space-x-2">
                            <button
                              type="button"
                              class={`px-4 py-2 text-sm rounded transition-all ${
                                this.isAM ? 'text-white' : this.dark ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                              style={this.isAM ? { backgroundColor: this.getColorVars().main } : {}}
                              onClick={async () => !this.isAM && (await this.toggleAMPM())}
                            >
                              AM
                            </button>
                            <button
                              type="button"
                              class={`px-4 py-2 text-sm rounded transition-all ${
                                !this.isAM ? 'text-white' : this.dark ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                              style={!this.isAM ? { backgroundColor: this.getColorVars().main } : {}}
                              onClick={async () => this.isAM && (await this.toggleAMPM())}
                            >
                              PM
                            </button>
                          </div>
                        )}

                        {/* Selected Time Display */}
                        <div class={`text-lg font-mono ${this.dark ? 'text-white' : 'text-gray-900'}`}>
                          {this.timeFormat === '12'
                            ? `${this.selectedHour.toString().padStart(2, '0')}:${this.selectedMinute.toString().padStart(2, '0')} ${this.isAM ? 'AM' : 'PM'}`
                            : `${this.selectedHour.toString().padStart(2, '0')}:${this.selectedMinute.toString().padStart(2, '0')}`}
                        </div>
                      </div>
                    ) : (
                      /* Traditional Time Input */
                      <input
                        type="time"
                        class={`w-full px-3 py-2 text-sm border rounded-md ${this.dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                        value={this.selectedDate ? `${String(this.selectedDate.getHours()).padStart(2, '0')}:${String(this.selectedDate.getMinutes()).padStart(2, '0')}` : ''}
                        onInput={e => this.handleTimeChange(e)}
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Status Badge */}
          {this.renderStatusBadge()}
        </div>

        {/* Last Updated Timestamp */}
        {this.renderLastUpdated()}

        {/* Click outside to close */}
        {this.isOpen && <div class="fixed inset-0 z-40" onClick={() => (this.isOpen = false)}></div>}
      </div>
    );
  }
}
