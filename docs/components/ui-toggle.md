# ui-toggle



[Properties](#properties) · [Events](#events) · [Methods](#methods)
<!-- Auto Generated Below -->


## Overview

A versatile toggle switch component designed for WoT device control and monitoring.

It has various features, multiple visual styles, status and last updated timestamps.
Supports both interactive control and read-only monitoring modes.





### Examples

#### Example – Basic Usage

```html
<ui-toggle variant="circle" value="true" label="Light"></ui-toggle>
<ui-toggle variant="neon" value="false" label="Fan"></ui-toggle>
<ui-toggle readonly="true" label="Sensor" show-last-updated="true"></ui-toggle>
```
#### Example – JS integaration with node-wot browser bundle

```javascript
const toggle = document.getElementById('device-toggle');
const initialValue = Boolean(await (await thing.readProperty('power')).value());

await toggle.setValue(initialValue, {
  writeOperation: async value => {
    await thing.writeProperty('power', value);
  }
});
```

## Properties

| Property          | Attribute           | Description                                                                                                                                                                                                                                                                                                           | Type                                                   | Default     |
| ----------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ----------- |
| `color`           | `color`             | Color theme for the active state matching to thingsweb theme                                                                                                                                                                                                                                                          | `"neutral" \| "primary" \| "secondary"`                | `'primary'` |
| `connected`       | `connected`         | Connection state for read-only monitoring                                                                                                                                                                                                                                                                             | `boolean`                                              | `true`      |
| `dark`            | `dark`              | Enable dark mode theme styling when true                                                                                                                                                                                                                                                                              | `boolean`                                              | `false`     |
| `disabled`        | `disabled`          | Disable user interaction when true                                                                                                                                                                                                                                                                                    | `boolean`                                              | `false`     |
| `keyboard`        | `keyboard`          | Enable keyboard navigation so user can toggle using 'Space' and 'Enter' keys) when true                                                                                                                                                                                                                               | `boolean`                                              | `true`      |
| `label`           | `label`             | Text label displayed left to the toggle (optional)                                                                                                                                                                                                                                                                    | `string`                                               | `undefined` |
| `readonly`        | `readonly`          | Read only mode, display value but prevent changes when true. Just to monitor changes                                                                                                                                                                                                                                  | `boolean`                                              | `false`     |
| `showLastUpdated` | `show-last-updated` | Show last updated timestamp below the component                                                                                                                                                                                                                                                                       | `boolean`                                              | `false`     |
| `showStatus`      | `show-status`       | Show visual operation status indicators (loading, success, failed) right to the component                                                                                                                                                                                                                             | `boolean`                                              | `false`     |
| `value`           | `value`             | Current boolean value of the toggle                                                                                                                                                                                                                                                                                   | `boolean`                                              | `false`     |
| `variant`         | `variant`           | Visual style variant of the toggle. - circle: Common pill-shaped toggle (default) - square: Rectangular toggle with square thumb - apple: iOS-style switch (bigger size, rounded edges) - cross: Shows cross when off, tick when on with red background when off and green when on - neon: Glowing effect when active | `"apple" \| "circle" \| "cross" \| "neon" \| "square"` | `'circle'`  |


## Events

| Event      | Description                                                                                                                                              | Type                          |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `valueMsg` | Emitted when toggle value changes through user interaction or setValue calls. Contains the new value, previous value, timestamp, and source information. | `CustomEvent<UiMsg<boolean>>` |


## Methods

### `getValue(includeMetadata?: boolean) => Promise<boolean | { value: boolean; lastUpdated?: number; status: string; error?: string; }>`

Gets the current toggle value with optional metadata.

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

Sets the toggle value with optional device communication api and other options.

This is the primary method for connecting toggles to real devices.
It supports optimistic updates, error handling, and automatic retries.






#### Examples

```javascript
await toggle.setValue(true);
```
```javascript
const toggle = document.getElementById('device-toggle');
const initialValue = Boolean(await (await thing.readProperty('power')).value());
await toggle.setValue(initialValue, {
  writeOperation: async value => {
    await thing.writeProperty('power', value);
  },
  autoRetry: { attempts: 3, delay: 1000 }
});
```

#### Parameters

| Name      | Type                                                                                                                                                                                      | Description                                                    |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `value`   | `boolean`                                                                                                                                                                                 | - The boolean value to set (true = on, false = off)            |
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



### `triggerReadPulse() => Promise<void>`

This triggers a visual pulse for read-only mode.

Useful to shows users when data has been refreshed from an external source.
The pulse automatically fades after 1.5 seconds.

#### Returns

Type: `Promise<void>`



