# ui-color-picker



[Properties](#properties) · [Events](#events) · [Methods](#methods)
<!-- Auto Generated Below -->


## Overview

A versatile color picker component designed for WoT device control.





### Examples

#### Example – Basic Usage

```html
<ui-color-picker value="#ff0000" label="Theme Color"></ui-color-picker>
```
#### Example – JS integaration with node-wot browser bundle

```javascript
const colorPicker = document.getElementById('device-color');
const initialValue = String(await (await thing.readProperty('deviceColor')).value());

await colorPicker.setValue(initialValue, {
  writeOperation: async value => {
    await thing.writeProperty('deviceColor', value);
  }
});
```

## Properties

| Property          | Attribute           | Description                                                                               | Type      | Default     |
| ----------------- | ------------------- | ----------------------------------------------------------------------------------------- | --------- | ----------- |
| `dark`            | `dark`              | Enable dark mode theme styling when true                                                  | `boolean` | `false`     |
| `disabled`        | `disabled`          | Disable user interaction when true                                                        | `boolean` | `false`     |
| `format`          | `format`            | Output format: hex \| rgb \| rgba \| hsl \| hsla (defaults to hex)                        | `string`  | `'hex'`     |
| `label`           | `label`             | Text label displayed right to the color picker (optional)                                 | `string`  | `undefined` |
| `showLastUpdated` | `show-last-updated` | Show last updated timestamp below the component                                           | `boolean` | `false`     |
| `showStatus`      | `show-status`       | Show visual operation status indicators (loading, success, failed) right to the component | `boolean` | `true`      |
| `value`           | `value`             | Current color value in hex format (e.g., #ff0000)                                         | `string`  | `'#000000'` |


## Events

| Event      | Description                                                                                                                                                    | Type                         |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `valueMsg` | Emitted when color picker value changes through user interaction or setValue calls. Contains the new value, previous value, timestamp, and source information. | `CustomEvent<UiMsg<string>>` |


## Methods

### `getValue(includeMetadata?: boolean) => Promise<string | { value: string; lastUpdated?: number; status: string; error?: string; }>`

Gets the current color picker value with optional metadata.

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

Sets the color picker value with optional device communication api and other options.

This is the primary method for connecting color pickers to real devices.
It supports optimistic updates, error handling, and automatic retries.






#### Examples

```javascript
await colorPicker.setValue('#ff0000');
```
```javascript
const colorPicker = document.getElementById('device-color');
const initialValue = String(await (await thing.readProperty('deviceColor')).value());
await colorPicker.setValue(initialValue, {
  writeOperation: async value => {
    await thing.writeProperty('deviceColor', value);
  },
  autoRetry: { attempts: 3, delay: 1000 }
});
```

#### Parameters

| Name      | Type                                                                                                                                                                                     | Description                                            |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `value`   | `string`                                                                                                                                                                                 | - The color value to set in hex format (e.g., #ff0000) |
| `options` | `{ writeOperation?: (value: string) => Promise<any>; readOperation?: () => Promise<any>; optimistic?: boolean; autoRetry?: { attempts: number; delay: number; }; _isRevert?: boolean; }` | - Configuration for device communication and behavior  |

#### Returns

Type: `Promise<boolean>`

Promise resolving to true if successful, false if failed

### `setValueSilent(value: string) => Promise<void>`

This method updates the value silently without triggering events.

Use this for external data synchronization to prevent event loops.
Perfect for WebSocket updates or polling from remote devices.

#### Parameters

| Name    | Type     | Description                                     |
| ------- | -------- | ----------------------------------------------- |
| `value` | `string` | - The color value to set silently in hex format |

#### Returns

Type: `Promise<void>`



