# ui-image

[Properties](#properties) · [Methods](#methods)

<!-- Auto Generated Below -->

## Overview

A media component for displaying, uploading, or monitoring images.
It supports read, write, and observe patterns similar to other WoT components.
Includes status indicators, file metadata display, and image previewing.

### Examples

#### Example – Basic Display

```html
<ui-image 
  label="Camera Snapshot" 
  can-read="true"
></ui-image>
```

#### Example – Image Upload

```html
<ui-image 
  label="Profile Picture" 
  can-write="true" 
  accepted-formats="image/png, image/jpeg"
></ui-image>
```

## Properties

| Property          | Attribute          | Description                                                                 | Type          | Default             |
| ----------------- | ------------------ | --------------------------------------------------------------------------- | ------------- | ------------------- |
| `acceptedFormats` | `accepted-formats` | Comma-separated list of accepted file types for input (e.g. "image/*").     | `string`      | `'image/*'`         |
| `canObserve`      | `can-observe`      | Indicates if the component supports observing (live updates).               | `boolean`     | `false`             |
| `canRead`         | `can-read`         | Indicates if the component supports reading (displaying) an image.          | `boolean`     | `false`             |
| `canWrite`        | `can-write`        | Indicates if the component supports writing (uploading) an image.           | `boolean`     | `false`             |
| `dark`            | `dark`             | Enable dark mode theme styling.                                             | `boolean`     | `false`             |
| `height`          | `height`           | Height of the image content area.                                           | `string`      | `'240px'`           |
| `label`           | `label`            | Label displayed in the header.                                              | `string`      | `'CameraSnapshot'`  |
| `maxFileSize`     | `max-file-size`    | Maximum allowed file size for upload in bytes.                              | `number`      | `5242880`           |
| `showLastUpdated` | `show-last-updated`| whether to show the last updated timestamp.                                 | `boolean`     | `true`              |
| `showStatus`      | `show-status`      | whether to show the status text.                                            | `boolean`     | `true`              |

## Methods

### `setValue(_value: any, options?: { readOperation?: () => Promise<string>; writeOperation?: (file: File) => Promise<void>; observeOperation?: (next: (data: string) => void) => Promise<() => void>; }) => Promise<void>`

Configure the component with WoT interaction handlers.

#### Parameters

| Name      | Type                                                                                                                                              | Description                                      |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `_value`  | `any`                                                                                                                                             | - Unused for image component (pass null/undefined). |
| `options` | `{ readOperation?: () => Promise<string>; writeOperation?: (file: File) => Promise<void>; observeOperation?: (next: (data: string) => void) => Promise<() => void>; }` | - interaction handlers.                          |

#### Returns

Type: `Promise<void>`
