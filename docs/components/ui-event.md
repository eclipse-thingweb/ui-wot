# ui-event

[Properties](#properties) · [Events](#events) · [Methods](#methods)

<!-- Auto Generated Below -->

## Overview

A versatile event listener component designed for WoT device control.

It has various features, multiple visual styles, status and last updated timestamps.

### Examples

#### Example – Basic Usage

```html
<ui-event variant="outlined" label="Temperature Events" event-name="temperatureChanged"></ui-event>
<ui-event variant="filled" label="Motion Events" max-events="20" show-timestamp="true"></ui-event>
<ui-event variant="outlined" label="Device Status" show-last-updated="true"></ui-event>
```

#### Example – JS integaration with node-wot browser bundle

```javascript
const eventListener = document.getElementById('event-listener');
await eventListener.startListening();

// Subscribe to event and pipe to component
await thing.subscribeEvent('on-bool', async data => {
  const value = data?.value ?? data;
  await eventListener.addEvent({
    event: 'on-bool',
    value,
    timestamp: new Date().toISOString(),
  });
});
```

## Properties

| Property          | Attribute           | Description                                                                                                                        | Type                                    | Default      |
| ----------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------ |
| `color`           | `color`             | Color theme for the active state matching to thingsweb theme                                                                       | `"neutral" \| "primary" \| "secondary"` | `'primary'`  |
| `connected`       | `connected`         | Connection status indicator                                                                                                        | `boolean`                               | `false`      |
| `dark`            | `dark`              | Enable dark mode theme styling when true                                                                                           | `boolean`                               | `false`      |
| `disabled`        | `disabled`          | Disable user interaction when true                                                                                                 | `boolean`                               | `false`      |
| `eventName`       | `event-name`        | Event name to subscribe to (for identification/display purposes)                                                                   | `string`                                | `undefined`  |
| `keyboard`        | `keyboard`          | Enable keyboard navigation so user can interact using keyboard when true                                                           | `boolean`                               | `true`       |
| `label`           | `label`             | Text label displayed above the event listener (optional)                                                                           | `string`                                | `undefined`  |
| `maxEvents`       | `max-events`        | Maximum number of events to keep in history                                                                                        | `number`                                | `15`         |
| `showLastUpdated` | `show-last-updated` | Show last updated timestamp below the component                                                                                    | `boolean`                               | `false`      |
| `showStatus`      | `show-status`       | Show visual operation status indicators (loading, success, failed) right to the component                                          | `boolean`                               | `false`      |
| `showTimestamp`   | `show-timestamp`    | Show event timestamps                                                                                                              | `boolean`                               | `true`       |
| `variant`         | `variant`           | Visual style variant of the event listener. - outlined: Border-focused design with outline style - filled: Solid background design | `"filled" \| "outlined"`                | `'outlined'` |

## Events

| Event           | Description                                                                                      | Type                      |
| --------------- | ------------------------------------------------------------------------------------------------ | ------------------------- |
| `eventReceived` | Emitted when an event is received. Contains the event data with metadata and source information. | `CustomEvent<UiMsg<any>>` |

## Methods

### `addEvent(eventData: any, eventId?: string) => Promise<void>`

This method adds an event.

#### Parameters

| Name        | Type     | Description             |
| ----------- | -------- | ----------------------- |
| `eventData` | `any`    | - The event data to add |
| `eventId`   | `string` | - Optional event ID     |

#### Returns

Type: `Promise<void>`

### `clearEvents() => Promise<void>`

Clear event history and reset counters.

#### Returns

Type: `Promise<void>`

### `getEventHistory(includeMetadata?: boolean) => Promise<Array<any> | { value: Array<any>; lastUpdated?: number; status: string; error?: string; }>`

Gets the current event history with optional metadata.

#### Parameters

| Name              | Type      | Description                                                  |
| ----------------- | --------- | ------------------------------------------------------------ |
| `includeMetadata` | `boolean` | - Whether to include status, timestamp and other information |

#### Returns

Type: `Promise<any[] | { value: any[]; lastUpdated?: number; status: string; error?: string; }>`

Current event history or detailed metadata object

### `isListening() => Promise<boolean>`

Check if component is currently listening for events.

#### Returns

Type: `Promise<boolean>`

Promise resolving to boolean indicating listening status

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

### `startListening() => Promise<void>`

Starts listening for events with optional device communication api and other options.

This is the primary method for connecting event listeners to real devices.
It supports event filtering, history management, and status tracking.

#### Example

```html
<ui-event variant="outlined" label="Temperature Events" event-name="temperatureChanged"></ui-event>
<ui-event variant="filled" label="Motion Events" max-events="20" show-timestamp="true"></ui-event>
<ui-event variant="outlined" label="Device Status" show-last-updated="true"></ui-event>
```

```javascript
const eventListener = document.getElementById('event-listener');
await eventListener.startListening();

// Subscribe to event and pipe to component
await thing.subscribeEvent('on-bool', async data => {
  const value = data?.value ?? data;
  await eventListener.addEvent({
    event: 'on-bool',
    value,
    timestamp: new Date().toISOString(),
  });
});
```

#### Example

```html
<ui-event variant="outlined" label="Temperature Events" event-name="temperatureChanged"></ui-event>
<ui-event variant="filled" label="Motion Events" max-events="20" show-timestamp="true"></ui-event>
<ui-event variant="outlined" label="Device Status" show-last-updated="true"></ui-event>
```

```javascript
const eventListener = document.getElementById('event-listener');
await eventListener.startListening();

// Subscribe to event and pipe to component
await thing.subscribeEvent('on-bool', async data => {
  const value = data?.value ?? data;
  await eventListener.addEvent({
    event: 'on-bool',
    value,
    timestamp: new Date().toISOString(),
  });
});
```

#### Example

```html
<ui-event variant="outlined" label="Temperature Events" event-name="temperatureChanged"></ui-event>
<ui-event variant="filled" label="Motion Events" max-events="20" show-timestamp="true"></ui-event>
<ui-event variant="outlined" label="Device Status" show-last-updated="true"></ui-event>
```

```javascript
const eventListener = document.getElementById('event-listener');
await eventListener.startListening();

// Subscribe to event and pipe to component
await thing.subscribeEvent('on-bool', async data => {
  const value = data?.value ?? data;
  await eventListener.addEvent({
    event: 'on-bool',
    value,
    timestamp: new Date().toISOString(),
  });
});
```

#### Returns

Type: `Promise<void>`

Promise resolving to void when listening starts

```

### `stopListening() => Promise<void>`

Stop listening for events.

#### Returns

Type: `Promise<void>`

Promise resolving to void when listening stops


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
```
