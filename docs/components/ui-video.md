# ui-video

[Properties](#properties) · [Methods](#methods)

<!-- Auto Generated Below -->

## Overview

A media component for playing and uploading video content.
It features a video player with controls, status tracking, and file selection for upload.

### Examples

#### Example – Live Stream

```html
<ui-video 
  label="Security Camera" 
  can-observe="true" 
  height="400px"
></ui-video>
```

#### Example – Video Uploader

```html
<ui-video 
  label="Upload Clip" 
  can-write="true" 
  max-file-size="104857600"
></ui-video>
```

## Properties

| Property          | Attribute          | Description                                                                 | Type          | Default             |
| ----------------- | ------------------ | --------------------------------------------------------------------------- | ------------- | ------------------- |
| `acceptedFormats` | `accepted-formats` | Comma-separated list of accepted file types for input.                      | `string`      | `'video/*'`         |
| `canObserve`      | `can-observe`      | Indicates if the component supports live video stream observing.            | `boolean`     | `false`             |
| `canRead`         | `can-read`         | Indicates if the component supports reading a stored video.                 | `boolean`     | `false`             |
| `canWrite`        | `can-write`        | Indicates if the component supports uploading a video file.                 | `boolean`     | `false`             |
| `dark`            | `dark`             | Enable dark mode theme styling.                                             | `boolean`     | `false`             |
| `height`          | `height`           | Height of the video player area.                                            | `string`      | `'300px'`           |
| `label`           | `label`            | Label displayed in the header.                                              | `string`      | `'EntranceStream'`  |
| `maxFileSize`     | `max-file-size`    | Maximum allowed file size for upload in bytes.                              | `number`      | `52428800`          |

## Methods

### `setValue(_value: any, options?: { readOperation?: () => Promise<string>; writeOperation?: (file: File) => Promise<void>; observeOperation?: (next: (data: string) => void) => Promise<() => void>; }) => Promise<void>`

Configure the component with WoT interaction handlers.

#### Parameters

| Name      | Type                                                                                                                                              | Description                                      |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `_value`  | `any`                                                                                                                                             | - Unused for video component.                    |
| `options` | `{ readOperation?: () => Promise<string>; writeOperation?: (file: File) => Promise<void>; observeOperation?: (next: (data: string) => void) => Promise<() => void>; }` | - interaction handlers.                          |

#### Returns

Type: `Promise<void>`
