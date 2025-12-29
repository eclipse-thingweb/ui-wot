import { Component, Prop, Element, h, Event, EventEmitter, State } from '@stencil/core';
import { StatusIndicator } from '../../utils/status-indicator';

/**
 * An image viewer component for displaying image content.
 *
 * @example Basic Usage
 * ```html
 * <ui-image src="https://example.com/image.png" alt="Example Image"></ui-image>
 * ```
 */
@Component({
    tag: 'ui-image',
    styleUrl: 'ui-image.css',
    shadow: true,
})
export class UiImage {
    @Element() el: HTMLElement;

    /** The source URL of the image */
    @Prop() src: string;

    /** Alternative text for the image */
    @Prop() alt?: string;

    /** Image width */
    @Prop() width?: string;

    /** Image height */
    @Prop() height?: string;

    /** Show last updated timestamp below the component */
    @Prop() showLastUpdated: boolean = false;

    /** Emitted when image is loaded */
    @Event() mediaLoaded: EventEmitter<void>;

    /** Emitted when error occurs */
    @Event() mediaError: EventEmitter<string>;

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

    private handleLoad() {
        this.mediaLoaded.emit();
        this.lastUpdatedTs = Date.now();
    }

    private handleError() {
        this.mediaError.emit(`Failed to load image: ${this.src}`);
    }

    private renderLastUpdated() {
        if (!this.showLastUpdated) return null;
        return <div class="mt-1">{StatusIndicator.renderTimestamp(new Date(this.lastUpdatedTs), 'light', h)}</div>;
    }

    render() {
        return (
            <div class="image-wrapper">
                <div class="image-container" style={{ width: this.width, height: this.height }}>
                    <img
                        src={this.src}
                        alt={this.alt}
                        onLoad={() => this.handleLoad()}
                        onError={() => this.handleError()}
                    />
                </div>
                {this.renderLastUpdated()}
            </div>
        );
    }
}
