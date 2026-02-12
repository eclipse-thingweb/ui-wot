import { Component, Element, Prop, State, Method, h } from '@stencil/core';

interface VideoMetadata {
    format: string;
    duration: number;
    width: number;
    height: number;
    size: number;
    lastUpdated: Date;
}

@Component({
    tag: 'ui-video',
    styleUrl: 'ui-video.css',
    shadow: true,
})
export class UiVideo {
    @Element() el: HTMLElement;

    // Configuration Props
    @Prop() label: string = 'EntranceStream';
    @Prop() canRead: boolean = false;
    @Prop() canWrite: boolean = false;
    @Prop() canObserve: boolean = false;
    @Prop() acceptedFormats: string = 'video/*';
    @Prop() maxFileSize: number = 50 * 1024 * 1024; // 50MB for video

    @Prop() height: string = '300px';

    @Prop() dark: boolean = false;

    // Internal State

    @State() selectedFile: File | null = null;
    @State() currentVideoUrl: string | null = null;
    @State() metadata: VideoMetadata | null = null;

    @State() loading: boolean = false;
    @State() statusText: string = 'Waiting for video data';
    @State() statusType: 'neutral' | 'success' | 'error' = 'neutral';

    // Stored operations
    private storedWriteOperation?: (file: File) => Promise<void>;

    private fileInput: HTMLInputElement;

    componentDidLoad() {
        // Removed auto-load to prevent playing without user interaction/selection
        // this.attemptAutoLoad();
    }

    @Method()
    async setValue(
        _value: any,
        options?: {
            readOperation?: () => Promise<string>;
            writeOperation?: (file: File) => Promise<void>;
            observeOperation?: (next: (data: string) => void) => Promise<() => void>;
        }
    ) {
        if (options?.writeOperation) this.storedWriteOperation = options.writeOperation;

        // Removed auto-load on setValue
    }





    // Logic Handlers



    private handleFileSelect(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        // Removed maxFileSize check

        this.selectedFile = file;
        // For video, we might want to preview it locally?
        const objectUrl = URL.createObjectURL(file);
        this.currentVideoUrl = objectUrl;
        this.updateStatus(`Selected: ${file.name}`, 'neutral');
    }

    private formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    private async handleSend() {
        if (!this.selectedFile || !this.storedWriteOperation) return;
        this.loading = true;
        this.updateStatus("Sending...", 'neutral');
        try {
            await this.storedWriteOperation(this.selectedFile);
            this.updateStatus("Sent successfully", 'success');
            // cleanup prop?
            this.selectedFile = null;
        } catch (e) {
            this.updateStatus("Failed to send", 'error');
        } finally {
            this.loading = false;
        }
    }

    private updateStatus(msg: string, type: 'neutral' | 'success' | 'error') {
        this.statusText = msg;
        this.statusType = type;
        if (type === 'success' || (this.currentVideoUrl && type !== 'error')) {
            this.metadata = { ...this.metadata, lastUpdated: new Date() } as any;
        }
    }

    private onVideoEvent(type: string, event: Event) {
        if (type === 'loadedmetadata') {
            const v = event.target as HTMLVideoElement;
            this.loading = false;
            this.metadata = {
                format: 'Video',
                duration: v.duration,
                width: v.videoWidth,
                height: v.videoHeight,
                size: this.selectedFile?.size || 0,
                lastUpdated: new Date()
            };
        } else if (type === 'playing') {
            this.updateStatus("Playing video", 'success');
        } else if (type === 'error') {
            this.updateStatus("Unable to load video", 'error');
        }
    }

    render() {
        return (
            <div class="ui-video-card">
                {/* HEADER */}
                <div class="card-header">
                    <span class="header-title">{this.label}</span>
                    <span class="header-subtitle">Video</span>
                </div>

                {/* CONTENT */}
                <div class="card-content" style={{ height: this.height }}>
                    {this.currentVideoUrl ? (
                        <div class="video-wrapper">
                            <video
                                src={this.currentVideoUrl}
                                controls
                                autoplay
                                muted
                                onLoadedMetaData={e => this.onVideoEvent('loadedmetadata', e)}
                                onPlaying={e => this.onVideoEvent('playing', e)}
                                onError={e => this.onVideoEvent('error', e)}
                            />
                        </div>
                    ) : (
                        <div class="placeholder">
                            <div class="placeholder-icon">🎬</div>
                            <div class="placeholder-text">
                                No video selected
                            </div>
                        </div>
                    )}

                    {this.loading && <div class="loading-overlay"><div class="spinner"></div></div>}
                </div>

                {/* FILE METADATA ROW */}
                {this.selectedFile && (
                    <div class="file-metadata-row">
                        <span class="file-name" title={this.selectedFile.name}>{this.selectedFile.name}</span>
                        <span class="file-size">{this.formatFileSize(this.selectedFile.size)}</span>
                    </div>
                )}

                {/* CONTROLS (Only visible if write is enabled) */}
                {this.canWrite && (
                    <div class="card-controls">
                        {!this.selectedFile && (
                            <button class="btn-control" onClick={() => this.fileInput?.click()}>
                                Choose File
                            </button>
                        )}

                        {this.selectedFile && (
                            <div class="file-actions">
                                <button class="btn-control primary" onClick={() => this.handleSend()}>
                                    Send
                                </button>
                                <button class="btn-control" onClick={() => { this.selectedFile = null; this.fileInput.value = ''; this.currentVideoUrl = null; }}>
                                    Cancel
                                </button>
                            </div>
                        )}

                        <input
                            type="file"
                            class="hidden"
                            ref={el => this.fileInput = el}
                            onChange={e => this.handleFileSelect(e)}
                            accept={this.acceptedFormats}
                        />
                    </div>
                )}

                {/* STATUS */}
                <div class="card-status">
                    <div class="status-row">
                        <span class="status-label">Status:</span>
                        <span class={{ 'status-value': true, [this.statusType]: true }}>
                            {this.statusType === 'success' && '✔ '}
                            {this.statusType === 'error' && '⚠ '}
                            {this.statusText}
                        </span>
                    </div>

                    <div class="status-row">
                        <span class="status-label">Last update:</span>
                        <span class="status-value">
                            {this.metadata?.lastUpdated ? this.metadata.lastUpdated.toLocaleTimeString() : '—'}
                        </span>
                    </div>
                </div>
            </div>
        );
    }
}
