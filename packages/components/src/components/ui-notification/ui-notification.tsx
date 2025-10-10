import { Component, Element, Prop, State, Event, EventEmitter, Method, Watch, h } from '@stencil/core';

/**
 * A versatile notification component designed for WoT device control.
 *
 * @example Basic Usage
 * ```html
 * <ui-notification type="info" message="Operation completed successfully"></ui-notification>
 * <ui-notification type="success" duration="3000" message="Device connected successfully"></ui-notification>
 * <ui-notification type="warning" show-close-button="true" message="Low battery warning"></ui-notification>
 * ```
 *
 * @example JS integration with node-wot browser bundle
 * ```javascript
 * const notificationElement = document.getElementById('alert-notification');
 * const eventName = 'temperature-critical';
 * await thing.subscribeEvent(eventName, async (eventData) => {
 *   const value = await eventData.value();
 *   notificationElement.message = `Alert: ${eventName} - ${JSON.stringify(value)}`;
 *   notificationElement.type = 'warning';
 *   await notificationElement.show();
 * });
 * ```
 */
@Component({
  tag: 'ui-notification',
  styleUrl: 'ui-notification.css',
  shadow: true,
})
export class UiNotification {
  @Element() el: HTMLElement;

  // ============================== COMPONENT PROPERTIES ==============================

  /**
   * Type of notification for different visual styling and icons.
   * - info: General information (blue)
   * - success: Success messages (green)
   * - warning: Warning messages (orange)
   * - error: Error messages (red)
   */
  @Prop() type: 'info' | 'success' | 'warning' | 'error' = 'info';

  /** Enable dark mode theme styling when true */
  @Prop() dark: boolean = false;

  /** The message text to display in the notification */
  @Prop() message: string = '';

  /** Duration before auto-dismiss (0 to disable auto-dismiss) */
  @Prop() duration: number = 3000;

  /** Whether to show a close button */
  @Prop() showCloseButton: boolean = true;

  /** Whether to show an icon based on the notification type */
  @Prop() showIcon: boolean = true;

  // ============================== COMPONENT STATE ==============================

  /** Internal state that controls the visibility of the notification */
  @State() private isVisible: boolean = false;

  /** Internal state counter for timestamp re-rendering */
  @State() private isAnimating: boolean = false;

  /** Internal state to prevents from infinite event loops while programmatic updates */
  @State() private dismissTimer?: number;

  // ============================== EVENTS ==============================

  /**
   * Emitted when the notification is closed/dismissed.
   * Contains information about how it was closed (auto, manual, programmatic).
   */
  @Event() notificationClose: EventEmitter<{
    message: string;
    type: string;
    dismissMethod: 'auto' | 'manual' | 'programmatic';
    timestamp: number;
  }>;

  // ============================== PUBLIC METHODS ==============================

  /**
   * Shows the notification with animation.
   *
   * This is the primary method for displaying notifications programmatically.
   *
   * @returns Promise resolving to void when animation completes
   *
   * @example Basic Usage
   * ```javascript
   * await notification.show();
   * ```
   */
  @Method()
  async show(): Promise<void> {
    if (this.isVisible) return;

    this.isAnimating = true;
    this.isVisible = true;

    // Allow animation to complete
    setTimeout(() => {
      this.isAnimating = false;
    }, 300);

    this.setupAutoDismiss();
  }

  /**
   * Gets the current notification visibility with optional metadata.
   *
   * @param includeMetadata - Whether to include status, timestamp and other information
   * @returns Current visibility or detailed metadata object
   */
  @Method()
  async getValue(includeMetadata: boolean = false): Promise<boolean | { value: boolean; message: string; type: string; duration: number }> {
    if (includeMetadata) {
      return {
        value: this.isVisible,
        message: this.message,
        type: this.type,
        duration: this.duration,
      };
    }
    return this.isVisible;
  }

  /**
   * This method dismisses the notification with animation.
   *
   * For external control or programmatic dismissal.
   * @param method - How the notification was dismissed
   */
  @Method()
  async dismiss(method: 'auto' | 'manual' | 'programmatic' = 'programmatic'): Promise<void> {
    if (!this.isVisible) return;

    this.clearAutoDismiss();
    this.isAnimating = true;

    // Emit close event
    this.notificationClose.emit({
      message: this.message,
      type: this.type,
      dismissMethod: method,
      timestamp: Date.now(),
    });

    // Start exit animation
    setTimeout(() => {
      this.isVisible = false;
      this.isAnimating = false;
    }, 300);
  }

  /**
   * (Advance) to toggle the notification visibility.
   *
   * Useful when managing notification state externally and you want to show/hide conditionally.
   */
  @Method()
  async toggle(): Promise<void> {
    if (this.isVisible) {
      await this.dismiss('programmatic');
    } else {
      await this.show();
    }
  }

  // ============================== LIFECYCLE METHODS ==============================

  /** Initialize component state from props */
  componentWillLoad() {}

  componentDidLoad() {}

  /** Clean up timers when component is removed */
  disconnectedCallback() {
    this.clearAutoDismiss();
  }

  // ============================== WATCHERS ==============================

  /** Sync internal state when duration prop changes externally */
  @Watch('duration')
  onDurationChange() {
    this.setupAutoDismiss();
  }

  // ============================== PRIVATE METHODS ==============================

  /** Setup auto-dismiss timer for notification */
  private setupAutoDismiss(): void {
    this.clearAutoDismiss();

    if (this.duration > 0) {
      this.dismissTimer = window.setTimeout(() => {
        this.dismiss('auto');
      }, this.duration);
    }
  }

  /** Clear auto-dismiss timer */
  private clearAutoDismiss(): void {
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = undefined;
    }
  }

  /** Handles user clicked close button */
  private handleCloseClick = (): void => {
    this.dismiss('manual');
  };

  /** Specific configuration for styling and icons */
  private getTypeConfig() {
    const configs = {
      info: {
        color: 'blue',
        bgClass: 'bg-blue-50 border-blue-200',
        textClass: 'text-blue-800',
        iconClass: 'text-blue-400',
        darkBgClass: 'bg-blue-900/20 border-blue-700',
        darkTextClass: 'text-blue-200',
        darkIconClass: 'text-blue-400',
        icon: 'info',
      },
      success: {
        color: 'green',
        bgClass: 'bg-green-50 border-green-200',
        textClass: 'text-green-800',
        iconClass: 'text-green-400',
        darkBgClass: 'bg-green-900/20 border-green-700',
        darkTextClass: 'text-green-200',
        darkIconClass: 'text-green-400',
        icon: 'check',
      },
      warning: {
        color: 'orange',
        bgClass: 'bg-orange-50 border-orange-200',
        textClass: 'text-orange-800',
        iconClass: 'text-orange-400',
        darkBgClass: 'bg-orange-900/20 border-orange-700',
        darkTextClass: 'text-orange-200',
        darkIconClass: 'text-orange-400',
        icon: 'warning',
      },
      error: {
        color: 'red',
        bgClass: 'bg-red-50 border-red-200',
        textClass: 'text-red-800',
        iconClass: 'text-red-400',
        darkBgClass: 'bg-red-900/20 border-red-700',
        darkTextClass: 'text-red-200',
        darkIconClass: 'text-red-400',
        icon: 'error',
      },
    };

    return configs[this.type] || configs.info;
  }

  // ============================== RENDERING HELPERS ==============================

  /** Renders the appropriate icon based on notification type */
  private renderIcon(iconType: string, classes: string): any {
    const baseProps = {
      class: `w-5 h-5 ${classes}`,
      fill: 'none',
      stroke: 'currentColor',
      viewBox: '0 0 24 24',
    };

    switch (iconType) {
      case 'info':
        return (
          <svg {...baseProps}>
            <circle cx="12" cy="12" r="10" stroke-width="2"></circle>
            <path d="M12 16l0-4" stroke-width="2" stroke-linecap="round"></path>
            <path d="M12 8l.01 0" stroke-width="2" stroke-linecap="round"></path>
          </svg>
        );
      case 'check':
        return (
          <svg {...baseProps}>
            <circle cx="12" cy="12" r="10" stroke-width="2"></circle>
            <path d="M9 12l2 2 4-4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
          </svg>
        );
      case 'warning':
        return (
          <svg {...baseProps}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke-width="2"></path>
            <line x1="12" y1="9" x2="12" y2="13" stroke-width="2" stroke-linecap="round"></line>
            <line x1="12" y1="17" x2="12.01" y2="17" stroke-width="2" stroke-linecap="round"></line>
          </svg>
        );
      case 'error':
        return (
          <svg {...baseProps}>
            <circle cx="12" cy="12" r="10" stroke-width="2"></circle>
            <line x1="15" y1="9" x2="9" y2="15" stroke-width="2" stroke-linecap="round"></line>
            <line x1="9" y1="9" x2="15" y2="15" stroke-width="2" stroke-linecap="round"></line>
          </svg>
        );
      default:
        return null;
    }
  }

  /** Renders the close button if enabled */
  private renderCloseButton(): any {
    if (!this.showCloseButton) return null;

    const typeConfig = this.getTypeConfig();
    const buttonClass = this.dark ? typeConfig.darkIconClass : typeConfig.iconClass;

    return (
      <button class={`ml-auto pl-3 ${buttonClass} hover:opacity-75 transition-opacity`} onClick={this.handleCloseClick}>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    );
  }

  // ============================== MAIN COMPONENT RENDER METHOD ==============================

  /**
   * Renders the complete notification component with all features and styles.
   */
  render() {
    if (!this.isVisible && !this.isAnimating) {
      return null;
    }

    const typeConfig = this.getTypeConfig();
    let containerClasses = 'notification-container border rounded-lg p-4 shadow-lg transition-all duration-300 ease-in-out';

    // Theme-specific styling
    if (this.dark) {
      containerClasses += ` ${typeConfig.darkBgClass} ${typeConfig.darkTextClass}`;
    } else {
      containerClasses += ` ${typeConfig.bgClass} ${typeConfig.textClass}`;
    }

    // Animation classes
    if (this.isAnimating && this.isVisible) {
      containerClasses += ' notification-enter';
    } else if (this.isAnimating && !this.isVisible) {
      containerClasses += ' notification-exit';
    } else if (this.isVisible) {
      containerClasses += ' notification-visible';
    }

    const iconClasses = this.dark ? typeConfig.darkIconClass : typeConfig.iconClass;

    return (
      <div class={containerClasses} role="alert">
        <div class="flex items-start">
          {/* Icon */}
          {this.showIcon && <div class="flex-shrink-0 mr-3">{this.renderIcon(typeConfig.icon, iconClasses)}</div>}

          {/* Message */}
          <div class="flex-1 font-medium">{this.message}</div>

          {/* Close button */}
          {this.renderCloseButton()}
        </div>

        {/* Progress bar for auto-dismiss */}
        {this.duration > 0 && this.isVisible && !this.isAnimating && (
          <div class="mt-2 h-1 bg-black/10 rounded-full overflow-hidden">
            <div class={`h-full bg-current opacity-30 notification-progress`} style={{ animationDuration: `${this.duration}ms` }}></div>
          </div>
        )}
      </div>
    );
  }
}
