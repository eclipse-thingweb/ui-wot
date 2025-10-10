# ui-calendar

[Properties](#properties) · [Events](#events) · [Methods](#methods)

<!-- Auto Generated Below -->

## Overview

A versatile calendar component designed for WoT device control.

It has various features, visual styles, status and last updated timestamps and other options.

### Examples

#### Example – Basic Usage

```html
<ui-calendar variant="outlined" value="2023-12-25T00:00:00.000Z" label="Select Date"></ui-calendar>
<ui-calendar variant="filled" include-time="true" label="Pick Date & Time"></ui-calendar>
<ui-calendar variant="outlined" label="Device Calendar" show-last-updated="true"></ui-calendar>
```

#### Example – JS integaration with node-wot browser bundle

```javascript
const calendar = document.getElementById('device-calendar');
const initialValue = await (await thing.readProperty('targetDate')).value();

await calendar.setValue(initialValue, {
  writeOperation: async value => {
    await thing.writeProperty('targetDate', value);
  },
});
```

## Properties

| Property          | Attribute           | Description                                                                                                                  | Type                                    | Default        |
| ----------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | -------------- |
| `color`           | `color`             | Color theme for the active state matching to thingsweb theme                                                                 | `"neutral" \| "primary" \| "secondary"` | `'primary'`    |
| `connected`       | `connected`         | Connection state for readonly mode                                                                                           | `boolean`                               | `true`         |
| `dark`            | `dark`              | Enable dark mode theme styling when true                                                                                     | `boolean`                               | `false`        |
| `dateFormat`      | `date-format`       | Date display pattern (dd/MM/yyyy, MM-dd-yyyy, yyyy/MM/dd, etc.)                                                              | `string`                                | `'dd/MM/yyyy'` |
| `disabled`        | `disabled`          | Disable user interaction when true                                                                                           | `boolean`                               | `false`        |
| `firstDayOfWeek`  | `first-day-of-week` | First day of week (0 = Sunday, 1 = Monday)                                                                                   | `0 \| 1`                                | `0`            |
| `format`          | `format`            | Output/storage format: iso \| epoch-ms \| epoch-s \| unix \| rfc2822                                                         | `string`                                | `'iso'`        |
| `includeTime`     | `include-time`      | Include time picker alongside date picker                                                                                    | `boolean`                               | `false`        |
| `inline`          | `inline`            | Display calendar inline instead of as a popup                                                                                | `boolean`                               | `false`        |
| `keyboard`        | `keyboard`          | Enable keyboard navigation so user can interact using keyboard when true                                                     | `boolean`                               | `true`         |
| `label`           | `label`             | Text label displayed above the calendar (optional)                                                                           | `string`                                | `undefined`    |
| `maxDate`         | `max-date`          | Maximum selectable date (ISO string) (Optional)                                                                              | `string`                                | `undefined`    |
| `minDate`         | `min-date`          | Minimum selectable date (ISO string) (Optional)                                                                              | `string`                                | `undefined`    |
| `showClearButton` | `show-clear-button` | Show clear button to reset selection                                                                                         | `boolean`                               | `true`         |
| `showLastUpdated` | `show-last-updated` | Show last updated timestamp below the component                                                                              | `boolean`                               | `false`        |
| `showStatus`      | `show-status`       | Show visual operation status indicators (loading, success, failed) right to the component                                    | `boolean`                               | `true`         |
| `showTodayButton` | `show-today-button` | Show today button                                                                                                            | `boolean`                               | `true`         |
| `showWeekNumbers` | `show-week-numbers` | Show week numbers in calendar grid                                                                                           | `boolean`                               | `false`        |
| `timeFormat`      | `time-format`       | Time format when includeTime is enabled (12-hour or 24-hour)                                                                 | `"12" \| "24"`                          | `'12'`         |
| `value`           | `value`             | Current date-time value of the calendar (ISO string)                                                                         | `string`                                | `undefined`    |
| `variant`         | `variant`           | Visual style variant of the calendar. - outlined: Border-focused design with outline style - filled: Solid background design | `"filled" \| "outlined"`                | `'outlined'`   |

## Events

| Event      | Description                                                                                                                                                | Type                         |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `valueMsg` | Emitted when calendar value changes through user interaction or setValue calls. Contains the new value, previous value, timestamp, and source information. | `CustomEvent<UiMsg<string>>` |

## Methods

### `getValue(includeMetadata?: boolean) => Promise<string | undefined | { value: string | undefined; lastUpdated?: number; status: string; error?: string; }>`

Gets the current calendar value with optional metadata.

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

### `setValue(value: string, options?: { writeOperation?: (value: string) => Promise<any>; readOperation?: () => Promise<any>; optimistic?: boolean; autoRetry?: { attempts: number; delay: number; }; _isRevert?: boolean; }) => Promise<any>`

Sets the calendar value with optional device communication api and other options.

This is the primary method for connecting calendars to real devices.
It supports optimistic updates, error handling, and automatic retries.

#### Examples

```javascript
await calendar.setValue('2023-12-25T00:00:00.000Z');
```

```javascript
const calendar = document.getElementById('device-calendar');
const initialValue = await (await thing.readProperty('targetDate')).value();
await calendar.setValue(initialValue, {
  writeOperation: async value => {
    await thing.writeProperty('targetDate', value);
  },
});
```

#### Parameters

| Name      | Type                                                                                                                                                                                     | Description                                                    |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `value`   | `string`                                                                                                                                                                                 | - The date string value to set (ISO format)                    |
| `options` | `{ writeOperation?: (value: string) => Promise<any>; readOperation?: () => Promise<any>; optimistic?: boolean; autoRetry?: { attempts: number; delay: number; }; _isRevert?: boolean; }` | - Optional configuration for device communication and behavior |

#### Returns

Type: `Promise<any>`

Promise resolving to any result from the operation

### `setValueSilent(value: string) => Promise<void>`

This method updates the value silently without triggering events.

Use this for external data synchronization to prevent event loops.
Perfect for WebSocket updates or polling from remote devices.

#### Parameters

| Name    | Type     | Description                                          |
| ------- | -------- | ---------------------------------------------------- |
| `value` | `string` | - The date string value to set silently (ISO format) |

#### Returns

Type: `Promise<void>`
