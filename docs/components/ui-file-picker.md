# ui-file-picker

[Properties](#properties) · [Events](#events) · [Methods](#methods)

<!-- Auto Generated Below -->

## Overview

A versatile file picker component designed for WoT device control.

It supports single and multiple file selection, drag-and-drop, and file type restrictions.

### Examples

#### Example – Basic Usage

```html
<ui-file-picker label="Upload Document" accept=".pdf,.doc,.docx"></ui-file-picker>
<ui-file-picker multiple="true" label="Select Images" accept="image/*"></ui-file-picker>
<ui-file-picker label="Device Files" show-last-updated="true"></ui-file-picker>
```

#### Example – JS integration with node-wot browser bundle

```javascript
const file = document.getElementById('file');
await file.setUpload(
  async fileData => {
    console.log('File processed:', fileData.name, 'Size:', fileData.size);
    // Just log the file data, don't invoke action yet
    return { success: true, message: 'File processed successfully' };
  },
  {
    propertyName: 'selectedFile',
    writeProperty: async (prop, value) => {
      console.log('Writing to property:', prop, value);
      await thing.writeProperty(prop, value);
    },
  },
);
```

## Properties

| Property          | Attribute           | Description                                                                               | Type                                    | Default     |
| ----------------- | ------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------- | ----------- |
| `accept`          | `accept`            | File type restrictions (e.g., ".pdf,.doc", "image/\*")                                    | `string`                                | `undefined` |
| `color`           | `color`             | Color theme for the active state matching to thingsweb theme                              | `"neutral" \| "primary" \| "secondary"` | `'primary'` |
| `dark`            | `dark`              | Enable dark mode theme styling when true                                                  | `boolean`                               | `false`     |
| `disabled`        | `disabled`          | Disable user interaction when true                                                        | `boolean`                               | `false`     |
| `label`           | `label`             | Text label displayed above the file picker (optional)                                     | `string`                                | `undefined` |
| `maxFiles`        | `max-files`         | Maximum number of files when multiple is true                                             | `number`                                | `undefined` |
| `maxSize`         | `max-size`          | Maximum file size in bytes                                                                | `number`                                | `undefined` |
| `multiple`        | `multiple`          | Whether multiple files can be selected                                                    | `boolean`                               | `false`     |
| `showLastUpdated` | `show-last-updated` | Show last updated timestamp below the component                                           | `boolean`                               | `false`     |
| `showStatus`      | `show-status`       | Show visual operation status indicators (loading, success, failed) right to the component | `boolean`                               | `true`      |

## Events

| Event      | Description                                                                                                                                                   | Type                         |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `valueMsg` | Emitted when file picker value changes through user interaction or setValue calls. Contains the new value, previous value, timestamp, and source information. | `CustomEvent<UiMsg<File[]>>` |

## Methods

### `clearFiles() => Promise<void>`

This method clears the files silently without triggering events.

Use this for external data synchronization to prevent event loops.
Perfect for WebSocket updates or polling from remote devices.

#### Returns

Type: `Promise<void>`

### `getFiles(includeMetadata?: boolean) => Promise<File[] | { value: File[]; lastUpdated?: number; status: string; error?: string; }>`

Gets the currently selected files with optional metadata.

#### Parameters

| Name              | Type      | Description                                                  |
| ----------------- | --------- | ------------------------------------------------------------ |
| `includeMetadata` | `boolean` | - Whether to include status, timestamp and other information |

#### Returns

Type: `Promise<File[] | { value: File[]; lastUpdated?: number; status: string; error?: string; }>`

Current files or detailed metadata object

### `setStatus(status: "idle" | "loading" | "success" | "error", errorMessage?: string) => Promise<void>`

(Advance) to manually set the operation status indicator.

Useful when managing device communication externally and you want to show loading/success/error states.

#### Parameters

| Name           | Type                                          | Description                                 |
| -------------- | --------------------------------------------- | ------------------------------------------- |
| `status`       | `"error" \| "loading" \| "success" \| "idle"` | - The status to display                     |
| `errorMessage` | `string`                                      | - (Optional) error message for error status |

#### Returns

Type: `Promise<void>`

### `setUpload(operation: (fileData: { name: string; size: number; type: string; content: string; }) => Promise<any>, options?: { propertyName?: string; writeProperty?: (propertyName: string, value: any) => Promise<void>; }) => Promise<boolean>`

Sets the file picker upload operation with optional device communication api and other options.

This is the primary method for connecting file pickers to real devices.
Files are automatically converted to base64 with metadata for WoT integration.

#### Examples

```javascript
const file = document.getElementById('file');
await file.setUpload(
  async fileData => {
    console.log('File processed:', fileData.name, 'Size:', fileData.size);
    // Just log the file data, don't invoke action yet
    return { success: true, message: 'File processed successfully' };
  },
  {
    propertyName: 'selectedFile',
    writeProperty: async (prop, value) => {
      console.log('Writing to property:', prop, value);
      await thing.writeProperty(prop, value);
    },
  },
);
```

```javascript
const files = document.getElementById('files');
await files.setUpload(
  async fileData => {
    console.log('File processed:', fileData.name, 'Size:', fileData.size);
    // Just log the file data, don't invoke action yet
    return { success: true, message: 'File processed successfully' };
  },
  {
    propertyName: 'fileList',
    writeProperty: async (prop, value) => {
      console.log('Writing to property:', prop, value);
      await thing.writeProperty(prop, value);
    },
  },
);
```

#### Parameters

| Name        | Type                                                                                              | Description                                                    |
| ----------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `operation` | `(fileData: { name: string; size: number; type: string; content: string; }) => Promise<any>`      | - Function that receives processed file data                   |
| `options`   | `{ propertyName?: string; writeProperty?: (propertyName: string, value: any) => Promise<void>; }` | - Optional configuration for device communication and behavior |

#### Returns

Type: `Promise<boolean>`

Promise resolving to true if successful, false if failed
