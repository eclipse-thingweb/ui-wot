# text-display

[Properties](#properties) · [Events](#events) · [Methods](#methods)

<!-- Auto Generated Below -->

## Overview

A versatile Text-Display component designed for WoT device control and monitoring
It has various features, visual styles and supports text-heavy data display.
Provides field, area, structured, unstructured, and editable modes with consistent styling.

### Examples

#### Example – Basic Usage

```html
<ui-text mode="field" variant="outlined" value="Sample text" label="Name"></ui-text>
<ui-text mode="area" variant="filled" value="Long text content..." label="Description"></ui-text>
<ui-text mode="structured" variant="minimal" value='{"key": "value"}' label="JSON Data"></ui-text>
<ui-text mode="editable" variant="outlined" value="Edit me" label="Notes" id="notes-field"></ui-text>
```

#### Example – JS integration with node-wot browser bundle

```javascript
const textElement = document.getElementById('text-field');
const value = await (await thing.readProperty('string')).value();

await textElement.setValue(value, {
  writeOperation: async newValue => {
    await thing.writeProperty('string', String(newValue));
  },
});
```

## Properties

| Property          | Attribute           | Description                                                                                                                                                                                                                                                          | Type                                                                | Default          |
| ----------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ---------------- |
| `color`           | `color`             | Color theme for the active state matching to thingsweb theme                                                                                                                                                                                                         | `"neutral" \| "primary" \| "secondary"`                             | `'primary'`      |
| `dark`            | `dark`              | Enable dark mode theme styling when true                                                                                                                                                                                                                             | `boolean`                                                           | `false`          |
| `debounceMs`      | `debounce-ms`       | Debounce delay in milliseconds for editable mode updates (0 = disabled). Enabled it to reduce API calls by only sending updates after user stops typing.                                                                                                             | `number`                                                            | `0`              |
| `label`           | `label`             | Text label displayed above the text display.                                                                                                                                                                                                                         | `string`                                                            | `undefined`      |
| `maxLength`       | `max-length`        | Maximum character limit (editable mode only).                                                                                                                                                                                                                        | `number`                                                            | `undefined`      |
| `maxRows`         | `max-rows`          | Maximum number of rows for area mode.                                                                                                                                                                                                                                | `number`                                                            | `10`             |
| `minRows`         | `min-rows`          | Minimum number of rows for area mode.                                                                                                                                                                                                                                | `number`                                                            | `3`              |
| `mode`            | `mode`              | Display mode for the text component. - field: One-line text display - area: Expandable text box (multi-line) - unstructured: Plain style, no highlighting - structured: Highlighted block (for JSON-like or formatted text) - editable: User can edit/write directly | `"area" \| "editable" \| "field" \| "structured" \| "unstructured"` | `'unstructured'` |
| `placeholder`     | `placeholder`       | Placeholder text shown when value is empty (editable mode only).                                                                                                                                                                                                     | `string`                                                            | `undefined`      |
| `resizable`       | `resizable`         | Enable text area resizable.                                                                                                                                                                                                                                          | `boolean`                                                           | `true`           |
| `showCharCount`   | `show-char-count`   | Show character count                                                                                                                                                                                                                                                 | `boolean`                                                           | `false`          |
| `showLastUpdated` | `show-last-updated` | Show last updated timestamp below the component                                                                                                                                                                                                                      | `boolean`                                                           | `false`          |
| `showLineNumbers` | `show-line-numbers` | Show line numbers                                                                                                                                                                                                                                                    | `boolean`                                                           | `false`          |
| `showSaveButton`  | `show-save-button`  | Show save button for explicit updates (editable mode only). When true, changes are not sent until user clicks save.                                                                                                                                                  | `boolean`                                                           | `false`          |
| `showStatus`      | `show-status`       | Show visual operation status indicators (loading, success, failed) right to the component                                                                                                                                                                            | `boolean`                                                           | `false`          |
| `value`           | `value`             | Current text value of the component.                                                                                                                                                                                                                                 | `string`                                                            | `''`             |
| `variant`         | `variant`           | Visual style variant of the text display. - minimal: Text-only with subtle underline - outlined: Border style applied (default) - filled: Background color applied                                                                                                   | `"filled" \| "minimal" \| "outlined"`                               | `'outlined'`     |

## Events

| Event      | Description                                                                                                                                              | Type                         |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `valueMsg` | Emitted when toggle value changes through user interaction or setValue calls. Contains the new value, previous value, timestamp, and source information. | `CustomEvent<UiMsg<string>>` |

## Methods

### `focusInput() => Promise<void>`

Focus the input element (editable mode only).

#### Returns

Type: `Promise<void>`

### `getValue(includeMetadata?: boolean) => Promise<string | { value: string; lastUpdated?: number; status: string; error?: string; }>`

Get the current text value with optional metadata.

#### Parameters

| Name              | Type      | Description                                                  |
| ----------------- | --------- | ------------------------------------------------------------ |
| `includeMetadata` | `boolean` | - Whether to include status, timestamp and other information |

#### Returns

Type: `Promise<string | { value: string; lastUpdated?: number; status: string; error?: string; }>`

Current value or detailed metadata object

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

### `setValue(value: string, options?: { writeOperation?: (value: string) => Promise<any>; readOperation?: () => Promise<any>; optimistic?: boolean; autoRetry?: { attempts: number; delay: number; }; _isRevert?: boolean; }) => Promise<boolean>`

Set the text value and handle optional operations and status management.

This is the primary method for connecting text to real devices.
It supports optimistic updates, error handling, and automatic retries.

#### Examples

```html
await textElement.setValue(value);
```

```javascript
const textElement = document.getElementById('text-field');
const value = await (await thing.readProperty('string')).value();

await textElement.setValue(value, {
  writeOperation: async newValue => {
    await thing.writeProperty('string', String(newValue));
  },
  autoRetry: { attempts: 3, delay: 1000 },
});
```

#### Parameters

| Name      | Type                                                                                                                                                                                     | Description                                        |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `value`   | `string`                                                                                                                                                                                 | - The string value to set                          |
| `options` | `{ writeOperation?: (value: string) => Promise<any>; readOperation?: () => Promise<any>; optimistic?: boolean; autoRetry?: { attempts: number; delay: number; }; _isRevert?: boolean; }` | - Optional configuration options for the operation |

#### Returns

Type: `Promise<boolean>`

Promise resolving to true if successful, false if failed

### `setValueSilent(value: string) => Promise<void>`

This method updates the value silently without triggering events.

Use this for external data synchronization to prevent event loops.
Perfect for WebSocket updates or polling from remote devices.

#### Parameters

| Name    | Type     | Description                        |
| ------- | -------- | ---------------------------------- |
| `value` | `string` | - The string value to set silently |

#### Returns

Type: `Promise<void>`
