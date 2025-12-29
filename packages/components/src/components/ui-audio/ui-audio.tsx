import { Component, Prop, Element, h, Event, EventEmitter, State } from '@stencil/core';
import { StatusIndicator } from '../../utils/status-indicator';

/**
 * An audio player component for playing audio content.
 *
 * @example Basic Usage
 * ```html
 * <ui-audio src="https://example.com/audio.mp3" controls></ui-audio>
 * ```
 */
@Component({
    tag: 'ui-audio',
    styleUrl: 'ui-audio.css',
    shadow: true,
})
export class UiAudio {
    @Element() el: HTMLElement;

    /** The source URL of the audio */
    @Prop() src: string;

    /** Show default audio controls */
    @Prop() controls: boolean = true;

    /** Automatically start playback */
    @Prop() autoplay: boolean = false;

    /** Loop the audio */
    @Prop() loop: boolean = false;

    /** Mute the audio */
    @Prop() muted: boolean = false;

    /** Show last updated timestamp below the component */
    @Prop() showLastUpdated: boolean = false;

    /** Emitted when audio is loaded and ready to play */
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
        const target = e.target as HTMLAudioElement;
        const error = target.error;
        this.mediaError.emit(error ? error.message : 'Unknown audio error');
    }

    private renderLastUpdated() {
        if (!this.showLastUpdated) return null;
        return <div class="mt-1">{StatusIndicator.renderTimestamp(new Date(this.lastUpdatedTs), 'light', h)}</div>;
    }

    render() {
        return (
            <div class="audio-wrapper">
                <div class="audio-container">
                    <audio
                        src={this.src}
                        controls={this.controls}
                        autoplay={this.autoplay}
                        loop={this.loop}
                        muted={this.muted}
                        onLoadedData={() => this.handleLoadedString()}
                        onError={(e) => this.handleError(e)}
                    >
                        <slot>Your browser does not support the audio tag.</slot>
                    </audio>
                </div>
                {this.renderLastUpdated()}
            </div>
        );
    }
}
