# ui-checkbox

[Properties](#properties) · [Events](#events) · [Methods](#methods)

<!-- Auto Generated Below -->

## Overview

A versatile checkbox component designed for WoT device control.

It has various features, multiple visual styles, status and last updated timestamps.

### Examples

#### Example – Basic Usage

```html
<ui-checkbox variant="outlined" value="true" label="Accept Terms"></ui-checkbox>
<ui-checkbox variant="radio" value="false" label="Enable Notifications"></ui-checkbox>
<ui-checkbox variant="filled" label="Device Status" show-last-updated="true"></ui-checkbox>
```

#### Example – JS integaration with node-wot browser bundle

```javascript
const checkbox = document.getElementById('device-checkbox');
const initialValue = Boolean(await (await thing.readProperty('enabled')).value());

await checkbox.setValue(initialValue, {
  writeOperation: async value => {
    await thing.writeProperty('enabled', value);
  },
});
```

## Properties

| Property          | Attribute           | Description                                                                                                                                                                          | Type                                    | Default      |
| ----------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- | ------------ |
| `color`           | `color`             | Color theme for the active state matching to thingsweb theme                                                                                                                         | `"neutral" \| "primary" \| "secondary"` | `'primary'`  |
| `dark`            | `dark`              | Enable dark mode theme styling when true                                                                                                                                             | `boolean`                               | `false`      |
| `disabled`        | `disabled`          | Disable user interaction when true                                                                                                                                                   | `boolean`                               | `false`      |
| `keyboard`        | `keyboard`          | Enable keyboard navigation so user can toggle using 'Space' and 'Enter' keys) when true                                                                                              | `boolean`                               | `true`       |
| `label`           | `label`             | Text label displayed right to the checkbox (optional)                                                                                                                                | `string`                                | `undefined`  |
| `showLastUpdated` | `show-last-updated` | Show last updated timestamp below the component                                                                                                                                      | `boolean`                               | `false`      |
| `showStatus`      | `show-status`       | Show visual operation status indicators (loading, success, failed) right to the component                                                                                            | `boolean`                               | `false`      |
| `value`           | `value`             | Current boolean value of the checkbox                                                                                                                                                | `boolean`                               | `false`      |
| `variant`         | `variant`           | Visual style variant of the checkbox. - radio: Clean design with transparent background - outlined: Border-focused design with outline style - filled: Solid background when checked | `"filled" \| "outlined" \| "radio"`     | `'outlined'` |

## Events

| Event      | Description                                                                                                                                                | Type                          |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `valueMsg` | Emitted when checkbox value changes through user interaction or setValue calls. Contains the new value, previous value, timestamp, and source information. | `CustomEvent<UiMsg<boolean>>` |

## Methods

### `getValue(includeMetadata?: boolean) => Promise<boolean | { value: boolean; lastUpdated?: number; status: string; error?: string; }>`

Gets the current checkbox value with optional metadata.

#### Parameters

| Name              | Type      | Description                                                  |
| ----------------- | --------- | ------------------------------------------------------------ |
| `includeMetadata` | `boolean` | - Whether to include status, timestamp and other information |

#### Returns

Type: `Promise<boolean | { value: boolean; lastUpdated?: number; status: string; error?: string; }>`

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

### `setValue(value: boolean, options?: { writeOperation?: (value: boolean) => Promise<any>; readOperation?: () => Promise<any>; optimistic?: boolean; autoRetry?: { attempts: number; delay: number; }; _isRevert?: boolean; }) => Promise<boolean>`

Sets the checkbox value with optional device communication api and other options.

This is the primary method for connecting checkboxes to real devices.
It supports optimistic updates, error handling, and automatic retries.

#### Examples

```javascript
await checkbox.setValue(true);
```

```javascript
const checkbox = document.getElementById('device-checkbox');
const initialValue = Boolean(await (await thing.readProperty('enabled')).value());
await checkbox.setValue(initialValue, {
  writeOperation: async value => {
    await thing.writeProperty('enabled', value);
  },
  autoRetry: { attempts: 3, delay: 1000 },
});
```

#### Parameters

| Name      | Type                                                                                                                                                                                      | Description                                                    |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `value`   | `boolean`                                                                                                                                                                                 | - The boolean value to set (true = checked, false = unchecked) |
| `options` | `{ writeOperation?: (value: boolean) => Promise<any>; readOperation?: () => Promise<any>; optimistic?: boolean; autoRetry?: { attempts: number; delay: number; }; _isRevert?: boolean; }` | - Optional configuration for device communication and behavior |

#### Returns

Type: `Promise<boolean>`

Promise resolving to true if successful, false if failed

### `setValueSilent(value: boolean) => Promise<void>`

This method updates the value silently without triggering events.

Use this for external data synchronization to prevent event loops.
Perfect for WebSocket updates or polling from remote devices.

#### Parameters

| Name    | Type      | Description                         |
| ------- | --------- | ----------------------------------- |
| `value` | `boolean` | - The boolean value to set silently |

#### Returns

Type: `Promise<void>`
