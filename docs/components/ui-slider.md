# ui-slider

[Properties](#properties) · [Events](#events) · [Methods](#methods)

<!-- Auto Generated Below -->

## Overview

A versatile slider component designed for WoT device control and monitoring.

It supports continuous value selection with multiple visual styles, orientations, and different thumb shapes.
Supports both interactive control and read-only monitoring modes with customizable ranges.

### Examples

#### Example – Basic Usage

```html
<ui-slider variant="narrow" value="50" label="Brightness"></ui-slider>
<ui-slider variant="wide" value="75" min="0" max="100"></ui-slider>
<ui-slider readonly="true" label="Sensor" show-last-updated="true"></ui-slider>
```

#### Example – JS integration with node-wot browser bundle

```javascript
const slider = document.getElementById('device-brightness');
const initialValue = Number(await (await thing.readProperty('brightness')).value());

await slider.setValue(initialValue, {
  writeOperation: async value => {
    await thing.writeProperty('brightness', value);
  },
});
```

## Properties

| Property          | Attribute           | Description                                                                                                                                                                                                          | Type                                                         | Default        |
| ----------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------- |
| `color`           | `color`             | Color theme for the active state matching to thingsweb theme                                                                                                                                                         | `"neutral" \| "primary" \| "secondary"`                      | `'primary'`    |
| `connected`       | `connected`         | Connection state for read-only monitoring                                                                                                                                                                            | `boolean`                                                    | `true`         |
| `dark`            | `dark`              | Enable dark mode theme styling when true                                                                                                                                                                             | `boolean`                                                    | `false`        |
| `disabled`        | `disabled`          | Disable user interaction when true                                                                                                                                                                                   | `boolean`                                                    | `false`        |
| `keyboard`        | `keyboard`          | Enable keyboard navigation so user can change value using 'Arrow Up' and 'Arrow Down' keys) when true                                                                                                                | `boolean`                                                    | `true`         |
| `label`           | `label`             | Text label displayed above the slider (optional)                                                                                                                                                                     | `string`                                                     | `undefined`    |
| `max`             | `max`               | Maximum allowed value (optional)                                                                                                                                                                                     | `number`                                                     | `100`          |
| `min`             | `min`               | Minimum allowed value (optional)                                                                                                                                                                                     | `number`                                                     | `0`            |
| `orientation`     | `orientation`       | Orientation of the slider                                                                                                                                                                                            | `"horizontal" \| "vertical"`                                 | `'horizontal'` |
| `readonly`        | `readonly`          | Read only mode, display value but prevent changes when true. Just to monitor changes                                                                                                                                 | `boolean`                                                    | `false`        |
| `showLastUpdated` | `show-last-updated` | Show last updated timestamp below the component                                                                                                                                                                      | `boolean`                                                    | `false`        |
| `showStatus`      | `show-status`       | Show visual operation status indicators (loading, success, failed) right to the component                                                                                                                            | `boolean`                                                    | `false`        |
| `step`            | `step`              | Step increment/decrement amount (optional)                                                                                                                                                                           | `number`                                                     | `1`            |
| `thumbShape`      | `thumb-shape`       | Shape of the slider thumb                                                                                                                                                                                            | `"arrow" \| "circle" \| "diamond" \| "square" \| "triangle"` | `'circle'`     |
| `value`           | `value`             | Current numeric value of the slider                                                                                                                                                                                  | `number`                                                     | `0`            |
| `variant`         | `variant`           | Visual style variant of the slider. - narrow: Thin track with minimal styling (default) - wide: Thicker track - rainbow: Multi-color gradient track - neon: Glowing effect styling - stepped: Visual step indicators | `"narrow" \| "neon" \| "rainbow" \| "stepped" \| "wide"`     | `'narrow'`     |

## Events

| Event      | Description                                                                                                                                              | Type                         |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `valueMsg` | Emitted when slider value changes through user interaction or setValue calls. Contains the new value, previous value, timestamp, and source information. | `CustomEvent<UiMsg<number>>` |

## Methods

### `getValue(includeMetadata?: boolean) => Promise<number | { value: number; lastUpdated?: number; status: string; error?: string; }>`

Get the current slider value with optional metadata.

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

Set the slider value with optional device api and other options.

This is the primary method for connecting slider to real devices.
It supports optimistic updates, error handling, and automatic retries.
Values are automatically clamped to the min/max range.

#### Examples

```javascript
const slider = document.querySelector('ui-slider');
await slider.setValue(50); // Set to 50
await slider.setValue(75.5); // Set to 75.5 (decimals supported)
```

```javascript
// Smart thermostat control
const thermostat = document.querySelector('#thermostat');

await thermostat.setValue(72, {
  writeOperation: async value => {
    await thing.writeProperty('brightness', value);
  },
  optimistic: true,
  autoRetry: {
    attempts: 2,
    delay: 3000,
  },
});
```

#### Parameters

| Name      | Type                                                                                                                                                                                     | Description                                                   |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `value`   | `number`                                                                                                                                                                                 | - The numeric value to set (will be clamped to min/max range) |
| `options` | `{ writeOperation?: (value: number) => Promise<any>; readOperation?: () => Promise<any>; optimistic?: boolean; autoRetry?: { attempts: number; delay: number; }; _isRevert?: boolean; }` | - Optional configuration options for the operation            |

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
