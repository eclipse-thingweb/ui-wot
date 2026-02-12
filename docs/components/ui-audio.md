# ui-audio

[Properties](#properties) · [Methods](#methods)

<!-- Auto Generated Below -->

## Overview

A media component for playing and uploading audio content.
Includes an audio player, status tracking, and file handling capabilities.

### Examples

#### Example – Audio Player

```html
<ui-audio 
  label="Voicemail" 
  can-read="true"
></ui-audio>
```

#### Example – Audio Input

```html
<ui-audio 
  label="Microphone Upload" 
  can-write="true" 
  accepted-formats="audio/wav, audio/mp3"
></ui-audio>
```

## Properties

| Property          | Attribute          | Description                                                                 | Type          | Default                        |
| ----------------- | ------------------ | --------------------------------------------------------------------------- | ------------- | ------------------------------ |
| `acceptedFormats` | `accepted-formats` | Comma-separated list of accepted file types for input.                      | `string`      | `'.mp3,.wav,.ogg,audio/*'`     |
| `canObserve`      | `can-observe`      | Indicates if the component supports live audio stream observing.            | `boolean`     | `false`                        |
| `canRead`         | `can-read`         | Indicates if the component supports reading audio data.                     | `boolean`     | `false`                        |
| `canWrite`        | `can-write`        | Indicates if the component supports uploading audio files.                  | `boolean`     | `false`                        |
| `dark`            | `dark`             | Enable dark mode theme styling.                                             | `boolean`     | `false`                        |
| `label`           | `label`            | Label displayed in the header.                                              | `string`      | `'MicInput'`                   |

## Methods

### `setValue(_value: any, options?: { readOperation?: () => Promise<string>; writeOperation?: (file: File) => Promise<void>; observeOperation?: (next: (data: string) => void) => Promise<() => void>; }) => Promise<void>`

Configure the component with WoT interaction handlers.

#### Parameters

| Name      | Type                                                                                                                                              | Description                                      |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `_value`  | `any`                                                                                                                                             | - Unused for audio component.                    |
| `options` | `{ readOperation?: () => Promise<string>; writeOperation?: (file: File) => Promise<void>; observeOperation?: (next: (data: string) => void) => Promise<() => void>; }` | - interaction handlers.                          |

#### Returns

Type: `Promise<void>`
