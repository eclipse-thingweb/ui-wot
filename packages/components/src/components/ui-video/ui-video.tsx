import { Component, Prop, Element, h, Event, EventEmitter, State } from '@stencil/core';
import { StatusIndicator } from '../../utils/status-indicator';

/**
 * A video player component for displaying video content.
 *
 * @example Basic Usage
 * ```html
 * <ui-video src="https://example.com/video.mp4" controls></ui-video>
 * ```
 */
@Component({
    tag: 'ui-video',
    styleUrl: 'ui-video.css',
    shadow: true,
})
export class UiVideo {
    @Element() el: HTMLElement;

    /** The source URL of the video */
    @Prop() src: string;

    /** The poster image URL to show before playback begins */
    @Prop() poster?: string;

    /** Show default video controls */
    @Prop() controls: boolean = true;

    /** Automatically start playback */
    @Prop() autoplay: boolean = false;

    /** Loop the video */
    @Prop() loop: boolean = false;

    /** Mute the audio */
    @Prop() muted: boolean = false;

    /** Video width */
    @Prop() width?: string;

    /** Video height */
    @Prop() height?: string;

    /** Show last updated timestamp below the component */
    @Prop() showLastUpdated: boolean = false;

    /** Emitted when video is loaded and ready to play */
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

    private handleLoadedString() {
        this.mediaLoaded.emit();
        this.lastUpdatedTs = Date.now();
    }

    private handleError(e: Event) {
        const target = e.target as HTMLVideoElement;
        const error = target.error;
        this.mediaError.emit(error ? error.message : 'Unknown video error');
    }

    private renderLastUpdated() {
        if (!this.showLastUpdated) return null;
        return <div class="mt-1">{StatusIndicator.renderTimestamp(new Date(this.lastUpdatedTs), 'light', h)}</div>;
    }

    render() {
        return (
            <div class="video-wrapper">
                <div class="video-container" style={{ width: this.width, height: this.height }}>
                    <video
                        src={this.src}
                        poster={this.poster}
                        controls={this.controls}
                        autoplay={this.autoplay}
                        loop={this.loop}
                        muted={this.muted}
                        onLoadedData={() => this.handleLoadedString()}
                        onError={(e) => this.handleError(e)}
                    >
                        <slot>Your browser does not support the video tag.</slot>
                    </video>
                </div>
                {this.renderLastUpdated()}
            </div>
        );
    }
}
