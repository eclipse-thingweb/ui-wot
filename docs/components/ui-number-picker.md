# ui-number-picker

[Properties](#properties) · [Events](#events) · [Methods](#methods)

<!-- Auto Generated Below -->

## Overview

A versatile number picker component designed for WoT device control and monitoring.

It has increment/decrement buttons, multiple visual styles, status and last updated timestamps.
Supports both interactive control and read-only monitoring modes with customizable ranges.

### Examples

#### Example – Basic Usage

```html
<ui-number-picker variant="minimal" value="3" label="Quantity"></ui-number-picker>
<ui-number-picker variant="filled" value="50" min="0" max="100"></ui-number-picker>
<ui-number-picker readonly="true" label="Sensor" show-last-updated="true"></ui-number-picker>
```

#### Example – JS integaration with node-wot browser bundle

```javascript
const numberPicker = document.getElementById('device-volume');
const initialValue = Number(await (await thing.readProperty('volume')).value());

await numberPicker.setValue(initialValue, {
  writeOperation: async value => {
    await thing.writeProperty('volume', value);
  },
});
```

## Properties

| Property          | Attribute           | Description                                                                                                                                                                 | Type                                    | Default     |
| ----------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ----------- |
| `color`           | `color`             | Color theme for the active state matching to thingsweb theme                                                                                                                | `"neutral" \| "primary" \| "secondary"` | `'primary'` |
| `connected`       | `connected`         | Connection state for read-only monitoring                                                                                                                                   | `boolean`                               | `true`      |
| `dark`            | `dark`              | Enable dark mode theme styling when true                                                                                                                                    | `boolean`                               | `false`     |
| `disabled`        | `disabled`          | Disable user interaction when true                                                                                                                                          | `boolean`                               | `false`     |
| `keyboard`        | `keyboard`          | Enable keyboard navigation so user can change value using 'Arrow Up' and 'Arrow Down' keys) when true                                                                       | `boolean`                               | `true`      |
| `label`           | `label`             | Text label displayed above the number picker (optional)                                                                                                                     | `string`                                | `undefined` |
| `max`             | `max`               | Maximum allowed value (optional)                                                                                                                                            | `number`                                | `100`       |
| `min`             | `min`               | Minimum allowed value (optional)                                                                                                                                            | `number`                                | `0`         |
| `readonly`        | `readonly`          | Read only mode, display value but prevent changes when true. Just to monitor changes                                                                                        | `boolean`                               | `false`     |
| `showLastUpdated` | `show-last-updated` | Show last updated timestamp below the component                                                                                                                             | `boolean`                               | `false`     |
| `showStatus`      | `show-status`       | Show visual operation status indicators (loading, success, failed) right to the component                                                                                   | `boolean`                               | `false`     |
| `step`            | `step`              | Step increment/decrement amount (optional)                                                                                                                                  | `number`                                | `1`         |
| `value`           | `value`             | Current numeric value of the number picker                                                                                                                                  | `number`                                | `0`         |
| `variant`         | `variant`           | Visual style variant of the number picker. - minimal: Clean buttons with subtle background (default) - outlined: Buttons with border outline - filled: Solid filled buttons | `"filled" \| "minimal" \| "outlined"`   | `'minimal'` |

## Events

| Event      | Description                                                                                                                                                     | Type                         |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `valueMsg` | Emitted when number picker value changes through user interaction or setValue calls. Contains the new value, previous value, timestamp, and source information. | `CustomEvent<UiMsg<number>>` |

## Methods

### `getValue(includeMetadata?: boolean) => Promise<number | { value: number; lastUpdated?: number; status: string; error?: string; }>`

Gets the current number picker value with optional metadata.

#### Parameters

| Name              | Type      | Description                                                  |
| ----------------- | --------- | ------------------------------------------------------------ |
| `includeMetadata` | `boolean` | - Whether to include status, timestamp and other information |

#### Returns

Type: `Promise<number | { value: number; lastUpdated?: number; status: string; error?: string; }>`

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

### `setValue(value: number, options?: { writeOperation?: (value: number) => Promise<any>; readOperation?: () => Promise<any>; optimistic?: boolean; autoRetry?: { attempts: number; delay: number; }; _isRevert?: boolean; }) => Promise<boolean>`

Sets the number picker value with optional device communication api and other options.

This is the primary method for connecting number pickers to real devices.
It supports optimistic updates, error handling, and automatic retries.

#### Examples

```javascript
await numberPicker.setValue(50);
```

```javascript
const numberPicker = document.getElementById('device-volume');
const initialValue = Number(await (await thing.readProperty('volume')).value());
await numberPicker.setValue(initialValue, {
  writeOperation: async value => {
    await thing.writeProperty('volume', value);
  },
  autoRetry: { attempts: 3, delay: 1000 },
});
```

#### Parameters

| Name      | Type                                                                                                                                                                                     | Description                                                    |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `value`   | `number`                                                                                                                                                                                 | - The numeric value to set                                     |
| `options` | `{ writeOperation?: (value: number) => Promise<any>; readOperation?: () => Promise<any>; optimistic?: boolean; autoRetry?: { attempts: number; delay: number; }; _isRevert?: boolean; }` | - Optional configuration for device communication and behavior |

#### Returns

Type: `Promise<boolean>`

Promise resolving to true if successful, false if failed

### `setValueSilent(value: number) => Promise<void>`

This method updates the value silently without triggering events.

Use this for external data synchronization to prevent event loops.
Perfect for WebSocket updates or polling from remote devices.

#### Parameters

| Name    | Type     | Description                         |
| ------- | -------- | ----------------------------------- |
| `value` | `number` | - The numeric value to set silently |

#### Returns

Type: `Promise<void>`

### `triggerReadPulse() => Promise<void>`

This triggers a visual pulse for read-only mode.

Useful to shows users when data has been refreshed from an external source.
The pulse automatically fades after 1.5 seconds.

#### Returns

Type: `Promise<void>`
