import { Component, Element, Prop, State, Method, h } from '@stencil/core';

interface ImageMetadata {
    format: string;
    width: number;
    height: number;
    size: number;
    lastUpdated: Date;
}

@Component({
    tag: 'ui-image',
    styleUrl: 'ui-image.css',
    shadow: true,
})
export class UiImage {
    @Element() el: HTMLElement;

    // Configuration Props
    @Prop() label: string = 'CameraSnapshot';
    @Prop() canRead: boolean = false;
    @Prop() canWrite: boolean = false;
    @Prop() canObserve: boolean = false;
    @Prop() acceptedFormats: string = 'image/*';
    @Prop() maxFileSize: number = 5 * 1024 * 1024;

    @Prop() height: string = '240px';
    @Prop() showLastUpdated: boolean = true;
    @Prop() showStatus: boolean = true;

    @Prop() dark: boolean = false;
    @Prop() color: 'primary' | 'secondary' | 'neutral' = 'primary';
    @Prop() disabled: boolean = false;

    // Internal State
    @State() isObserving: boolean = false;
    @State() selectedFile: File | null = null;
    @State() currentImageUrl: string | null = null;
    @State() metadata: ImageMetadata | null = null;

    @State() loading: boolean = false;
    @State() statusText: string = 'No data received yet';
    @State() statusType: 'neutral' | 'success' | 'error' = 'neutral';
    @State() isDragging: boolean = false;

    // Stored operations
    // private storedReadOperation?: () => Promise<string>;
    private storedWriteOperation?: (file: File) => Promise<void>;
    // private storedObserveOperation?: (next: (data: string) => void) => Promise<() => void>;

    private fileInput: HTMLInputElement;


    componentDidLoad() {
        // Disabled auto-load to prevent showing image before selection
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

        // Disabled auto-load
    }

    // Logic Handlers

    private handleFileSelect(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        this.selectedFile = file;

        if (this.isObserving) {
            this.isObserving = false;
            this.updateStatus("Live stopped for selection", 'neutral');
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            if (e.target?.result) {
                // Ensure the result is treated as a string for currentImageUrl.
                // TypeScript might infer string | ArrayBuffer, forcing conversion.
                this.currentImageUrl = e.target.result as string;
            }
            this.updateStatus("Displaying", 'neutral');
        };
        reader.readAsDataURL(file);
    }

    private handleDragOver(e: DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        this.isDragging = true;
    }

    private handleDragLeave(e: DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        this.isDragging = false;
    }

    private handleDrop(e: DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        this.isDragging = false;

        const file = e.dataTransfer?.files?.[0];
        if (file) {
            // Check file type if acceptedFormats is set
            if (this.acceptedFormats && this.acceptedFormats !== '*') {
                const type = file.type;
                const accepted = this.acceptedFormats.replace(/\s/g, '').split(',');
                // Simple wildcard check like image/*
                const isAccepted = accepted.some(format => {
                    if (format.endsWith('/*')) {
                        const base = format.split('/')[0];
                        return type.startsWith(base + '/');
                    }
                    return type === format;
                });

                if (!isAccepted) {
                    this.updateStatus(`Invalid format: ${type}`, 'error');
                    return;
                }
            }

            // Manually trigger file selection logic
            // Use a mock event or just call core logic. 
            // We'll refactor logic slightly to reuse.
            this.processFile(file);
        }
    }

    private processFile(file: File) {
        this.selectedFile = file;

        if (this.isObserving) {
            this.isObserving = false;
            this.updateStatus("Live stopped for selection", 'neutral');
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            if (e.target?.result) {
                this.currentImageUrl = e.target.result as string;
            }
            this.updateStatus("Displaying", 'neutral');
        };
        reader.readAsDataURL(file);
    }

    private formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
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
        } catch (e) {
            this.updateStatus("Failed to send", 'error');
        } finally {
            this.loading = false;
        }
    }

    private updateStatus(msg: string, type: 'neutral' | 'success' | 'error') {
        this.statusText = msg;
        this.statusType = type;
        if (type === 'success' || (this.currentImageUrl && type !== 'error')) {
            this.metadata = { ...this.metadata, lastUpdated: new Date() } as any;
        }
    }

    private onImageLoad(event: Event) {
        const img = event.target as HTMLImageElement;
        this.metadata = {
            format: 'IMG',
            width: img.naturalWidth,
            height: img.naturalHeight,
            size: this.selectedFile?.size || 0,
            lastUpdated: new Date()
        };
        this.loading = false;
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

    private clearSelection(e: Event) {
        e.stopPropagation();
        this.selectedFile = null;
        this.currentImageUrl = null;
        if (this.fileInput) this.fileInput.value = '';
    }

    /** Gets the CSS classes and styles matching ui-file-picker but fixed/static */
    private getVariantStyles(): { classes: string; style: any } {
        // Removed transition-all and duration-200 to stop animation
        const baseClasses = 'border-2 border-dashed rounded-lg p-4 text-center w-full flex flex-col items-center justify-center relative overflow-hidden';
        const style: any = {};

        style.height = this.height;
        style.borderColor = this.getActiveColor();
        style.backgroundColor = this.dark ? 'transparent' : 'rgba(248, 250, 252, 0.5)';

        return { classes: `${baseClasses} bg-transparent`, style };
    }

    render() {
        // Colors & Interaction States
        const canInteract = !this.disabled && (this.canWrite || this.selectedFile === null);

        const activeColor = this.getActiveColor();
        const variantStyles = this.getVariantStyles();

        return (
            <div class="block w-full">
                {/* Label */}
                {this.label && (
                    <label class={`block text-sm font-medium mb-2 component-label ${!canInteract ? 'cursor-not-allowed opacity-50' : ''}`}>
                        {this.label}
                    </label>
                )}

                {/* Main Content Area */}
                <div
                    class={`ui-image-container ${variantStyles.classes} ${this.isDragging ? 'drag-over' : ''} ${canInteract ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                        }`}
                    style={{
                        ...variantStyles.style,
                        // Fixed border color, no hover change
                        borderColor: variantStyles.style.borderColor,
                        // Background still subtly changes on drag for feedback, or keep fixed if strict "no animator"
                        backgroundColor: this.isDragging ? `${activeColor}20` : variantStyles.style.backgroundColor,
                    }}
                    onDragOver={(e) => canInteract && this.handleDragOver(e)}
                    onDragLeave={(e) => canInteract && this.handleDragLeave(e)}
                    onDrop={(e) => canInteract && this.handleDrop(e)}
                    onClick={() => canInteract && !this.currentImageUrl && this.fileInput?.click()}
                >
                    {/* Hidden Input */}
                    <input
                        type="file"
                        class="hidden"
                        ref={el => this.fileInput = el}
                        onChange={e => this.handleFileSelect(e)}
                        accept={this.acceptedFormats}
                        disabled={this.disabled}
                    />

                    {/* Content Logic: 
                        1. If Loading -> Show Spinner
                        2. If Image/File Selected -> Show Image + Controls (Overlay or Below)
                        3. If Empty -> Show Icon + Text
                    */}

                    {/* Loading Overlay */}
                    {this.loading && (
                        <div class="absolute inset-0 bg-white dark:bg-gray-800 bg-opacity-75 dark:bg-opacity-75 flex items-center justify-center z-20">
                            <div class="spinner"></div>
                        </div>
                    )}

                    {!this.selectedFile && !this.currentImageUrl ? (
                        /* EMPTY STATE */
                        <div class="flex flex-col items-center gap-3 p-2 text-center z-10">
                            <div class="w-12 h-12 flex items-center justify-center" style={{ color: activeColor }}>
                                <svg width="15" height="16" viewBox="0 0 15 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M8.56404 0.294922C8.17341 -0.0957031 7.53904 -0.0957031 7.14841 0.294922L3.14841 4.29492C2.75779 4.68555 2.75779 5.31992 3.14841 5.71055C3.53904 6.10117 4.17341 6.10117 4.56404 5.71055L6.85779 3.4168V10.0012C6.85779 10.5543 7.30466 11.0012 7.85779 11.0012C8.41091 11.0012 8.85779 10.5543 8.85779 10.0012V3.4168L11.1515 5.71055C11.5422 6.10117 12.1765 6.10117 12.5672 5.71055C12.9578 5.31992 12.9578 4.68555 12.5672 4.29492L8.56716 0.294922H8.56404ZM2.85779 11.0012C2.85779 10.448 2.41091 10.0012 1.85779 10.0012C1.30466 10.0012 0.857788 10.448 0.857788 11.0012V13.0012C0.857788 14.6574 2.20154 16.0012 3.85779 16.0012H11.8578C13.514 16.0012 14.8578 14.6574 14.8578 13.0012V11.0012C14.8578 10.448 14.4109 10.0012 13.8578 10.0012C13.3047 10.0012 12.8578 10.448 12.8578 11.0012V13.0012C12.8578 13.5543 12.4109 14.0012 11.8578 14.0012H3.85779C3.30466 14.0012 2.85779 13.5543 2.85779 13.0012V11.0012Z" fill="currentColor" />
                                </svg>
                            </div>
                            <div class="flex flex-col">
                                <span class="font-medium text-secondary">Click to select or drag and drop</span>
                                <span class="text-xs mt-1 text-muted">Accepted types: {this.acceptedFormats}</span>
                            </div>
                        </div>
                    ) : (
                        /* SELECTED STATE */
                        <div class="flex flex-col items-center justify-center w-full h-full p-2 z-10 relative">
                            {/* Image Preview */}
                            <div class="relative w-full flex-1 mb-2 flex items-center justify-center overflow-hidden">
                                {this.currentImageUrl ? (
                                    <img
                                        src={this.currentImageUrl}
                                        onLoad={(e) => this.onImageLoad(e)}
                                        onError={() => this.updateStatus("Failed to display image", 'error')}
                                        class="max-w-full max-h-full object-contain rounded"
                                    />
                                ) : (
                                    // Fallback if no preview string but file selected
                                    <div class="w-12 h-12 flex items-center justify-center" style={{ color: activeColor }}>
                                        <svg width="19" height="14" viewBox="0 0 19 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M2.97378 5.9957L0.201904 10.7457V2.00195C0.201904 0.898828 1.09878 0.00195312 2.2019 0.00195312H5.87378C6.40503 0.00195312 6.9144 0.211328 7.2894 0.586328L8.11753 1.41445C8.49253 1.78945 9.0019 1.99883 9.53315 1.99883H13.2019C14.305 1.99883 15.2019 2.8957 15.2019 3.99883V4.99883H4.7019C3.9894 4.99883 3.33315 5.37695 2.97378 5.99258V5.9957ZM3.83628 6.49883C4.01753 6.18945 4.34565 6.00195 4.7019 6.00195H17.2019C17.5613 6.00195 17.8894 6.19258 18.0675 6.50508C18.2457 6.81758 18.2457 7.19883 18.0644 7.5082L14.5644 13.5082C14.3863 13.8145 14.0582 14.002 13.7019 14.002H1.2019C0.842529 14.002 0.514404 13.8113 0.336279 13.4988C0.158154 13.1863 0.158154 12.8051 0.339404 12.4957L3.8394 6.4957L3.83628 6.49883Z" fill="currentColor" />
                                        </svg>
                                    </div>
                                )}
                            </div>

                            {/* File Info */}
                            {this.selectedFile && (
                                <div class="text-center mb-2 max-w-full px-2">
                                    <div class="text-sm truncate text-secondary" title={this.selectedFile.name}>
                                        {this.selectedFile.name}
                                    </div>
                                    <div class="text-xs text-muted">
                                        {this.formatFileSize(this.selectedFile.size)}
                                    </div>
                                </div>
                            )}

                            {/* Actions Row */}
                            {canInteract && this.selectedFile && (
                                <div class="file-actions flex gap-2">
                                    <button
                                        class="px-3 py-1 text-sm font-medium text-white rounded hover:opacity-90 transition-opacity"
                                        style={{ backgroundColor: activeColor }}
                                        onClick={(e) => { e.stopPropagation(); this.handleSend(); }}
                                    >
                                        Upload
                                    </button>
                                    <button
                                        class="px-3 py-1 text-sm font-medium border rounded hover:bg-opacity-10 transition-colors"
                                        style={{
                                            borderColor: 'var(--color-danger)',
                                            color: 'var(--color-danger)',
                                            backgroundColor: 'transparent',
                                        }}
                                        onClick={(e) => { this.clearSelection(e); }}
                                    >
                                        Clear
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }
}
