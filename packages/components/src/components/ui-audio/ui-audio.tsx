import { Component, Element, Prop, State, Method, h } from '@stencil/core';

interface AudioMetadata {
    format: string;
    duration: number;
    size: number;
    lastUpdated: Date;
}

@Component({
    tag: 'ui-audio',
    styleUrl: 'ui-audio.css',
    shadow: true,
})
export class UiAudio {
    @Element() el: HTMLElement;

    // Configuration Properties
    @Prop() label: string = 'MicInput';
    @Prop() canRead: boolean = false;
    @Prop() canWrite: boolean = false;
    @Prop() canObserve: boolean = false; // "Auto update when new audio arrives"
    @Prop() acceptedFormats: string = '.mp3,.wav,.ogg,audio/*';
    // No maxFileSize as requested

    @Prop() dark: boolean = false;

    // Internal State
    @State() isObserving: boolean = false;
    @State() selectedFile: File | null = null;
    @State() currentAudioUrl: string | null = null;
    @State() metadata: AudioMetadata | null = null;

    @State() loading: boolean = false;
    @State() statusText: string = 'Waiting for audio data';
    @State() statusType: 'neutral' | 'success' | 'error' = 'neutral';

    // Operations
    // private storedReadOperation?: () => Promise<string>;
    private storedWriteOperation?: (file: File) => Promise<void>;
    // private storedObserveOperation?: (next: (data: string) => void) => Promise<() => void>;

    private fileInput: HTMLInputElement;

    componentDidLoad() {
        // Disabled auto-load: "no audio should be played before selecting the file"
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
        // if (options?.readOperation) this.storedReadOperation = options.readOperation;
        if (options?.writeOperation) this.storedWriteOperation = options.writeOperation;
        // if (options?.observeOperation) this.storedObserveOperation = options.observeOperation;

        // Disabled auto-load on setValue
        // this.attemptAutoLoad();
    }



    /*
        private async handleRead() {
            if (!this.storedReadOperation) return;
            this.loading = true;
            this.updateStatus("Fetching audio...", 'neutral');
            try {
                const result = await this.storedReadOperation();
                this.currentAudioUrl = result;
                // Status updated on playing
            } catch (err) {
                this.updateStatus("Unable to play audio", 'error');
            } finally {
                this.loading = false;
            }
        }
    
        private async handleObserve() {
            if (!this.storedObserveOperation || this.isObserving) return;
            this.isObserving = true;
            // this.updateStatus("Listening...", 'neutral'); 
            try {
                await this.storedObserveOperation((data) => {
                    if (this.currentAudioUrl !== data) {
                        this.currentAudioUrl = data;
                        // "When new audio arrives -> player reloads"
                        // HTML Audio element handles src change automatically
                    }
                });
            } catch (err) {
                this.isObserving = false;
                this.updateStatus("Connection failed", 'error');
            }
        }
    */

    private handleFileSelect(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        this.selectedFile = file;

        // Immediate playback (requested behavior)
        const objectUrl = URL.createObjectURL(file);
        this.currentAudioUrl = objectUrl;

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
            // Cleanup? User might want to send again or similar. Keeping it selected.
        } catch (e) {
            this.updateStatus("Failed to send", 'error');
        } finally {
            this.loading = false;
        }
    }

    private updateStatus(msg: string, type: 'neutral' | 'success' | 'error') {
        this.statusText = msg;
        this.statusType = type;
        if (type === 'success' || (this.currentAudioUrl && type !== 'error')) {
            this.metadata = { ...this.metadata, lastUpdated: new Date() } as any;
        }
    }

    private onAudioEvent(type: string, event: Event) {
        if (type === 'loadedmetadata') {
            const a = event.target as HTMLAudioElement;
            this.metadata = {
                format: 'Audio',
                duration: a.duration,
                size: 0, // Unknown commonly from url
                lastUpdated: new Date()
            };
            this.updateStatus("Audio loaded successfully", 'success');
        } else if (type === 'playing') {
            this.updateStatus("Playing audio", 'success');
        } else if (type === 'error') {
            this.updateStatus("Unable to play audio", 'error');
        }
    }

    render() {
        return (
            <div class="ui-audio-card">
                {/* HEADER */}
                <div class="card-header">
                    <span class="header-title">{this.label}</span>
                    <span class="header-subtitle">Audio</span>
                </div>

                {/* CONTENT */}
                <div class="card-content">
                    {this.currentAudioUrl ? (
                        <div class="audio-wrapper">
                            <audio
                                src={this.currentAudioUrl}
                                controls
                                autoplay={this.isObserving}
                                onLoadedMetaData={e => this.onAudioEvent('loadedmetadata', e)}
                                onPlaying={e => this.onAudioEvent('playing', e)}
                                onError={e => this.onAudioEvent('error', e)}
                            />
                        </div>
                    ) : (
                        <div class="placeholder">
                            <div class="placeholder-icon">🔊</div>
                            <div class="placeholder-text">No audio available</div>
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

                {/* CONTROLS */}
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
                                <button class="btn-control" onClick={() => { this.selectedFile = null; this.fileInput.value = ''; }}>
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
