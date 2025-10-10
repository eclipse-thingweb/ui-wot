# ui-notification

[Properties](#properties) · [Events](#events) · [Methods](#methods)

<!-- Auto Generated Below -->

## Overview

A versatile notification component designed for WoT device control.

### Examples

#### Example – Basic Usage

```html
<ui-notification type="info" message="Operation completed successfully"></ui-notification>
<ui-notification type="success" duration="3000" message="Device connected successfully"></ui-notification>
<ui-notification type="warning" show-close-button="true" message="Low battery warning"></ui-notification>
```

#### Example – JS integration with node-wot browser bundle

```javascript
const notificationElement = document.getElementById('alert-notification');
const eventName = 'temperature-critical';
await thing.subscribeEvent(eventName, async eventData => {
  const value = await eventData.value();
  notificationElement.message = `Alert: ${eventName} - ${JSON.stringify(value)}`;
  notificationElement.type = 'warning';
  await notificationElement.show();
});
```

## Properties

| Property          | Attribute           | Description                                                                                                                                                                                            | Type                                          | Default  |
| ----------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- | -------- |
| `dark`            | `dark`              | Enable dark mode theme styling when true                                                                                                                                                               | `boolean`                                     | `false`  |
| `duration`        | `duration`          | Duration before auto-dismiss (0 to disable auto-dismiss)                                                                                                                                               | `number`                                      | `3000`   |
| `message`         | `message`           | The message text to display in the notification                                                                                                                                                        | `string`                                      | `''`     |
| `showCloseButton` | `show-close-button` | Whether to show a close button                                                                                                                                                                         | `boolean`                                     | `true`   |
| `showIcon`        | `show-icon`         | Whether to show an icon based on the notification type                                                                                                                                                 | `boolean`                                     | `true`   |
| `type`            | `type`              | Type of notification for different visual styling and icons. - info: General information (blue) - success: Success messages (green) - warning: Warning messages (orange) - error: Error messages (red) | `"error" \| "info" \| "success" \| "warning"` | `'info'` |

## Events

| Event               | Description                                                                                                                   | Type                                                                                                                      |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `notificationClose` | Emitted when the notification is closed/dismissed. Contains information about how it was closed (auto, manual, programmatic). | `CustomEvent<{ message: string; type: string; dismissMethod: "auto" \| "manual" \| "programmatic"; timestamp: number; }>` |

## Methods

### `dismiss(method?: "auto" | "manual" | "programmatic") => Promise<void>`

This method dismisses the notification with animation.

For external control or programmatic dismissal.

#### Parameters

| Name     | Type                                   | Description                          |
| -------- | -------------------------------------- | ------------------------------------ |
| `method` | `"auto" \| "manual" \| "programmatic"` | - How the notification was dismissed |

#### Returns

Type: `Promise<void>`

### `getValue(includeMetadata?: boolean) => Promise<boolean | { value: boolean; message: string; type: string; duration: number; }>`

Gets the current notification visibility with optional metadata.

#### Parameters

| Name              | Type      | Description                                                  |
| ----------------- | --------- | ------------------------------------------------------------ |
| `includeMetadata` | `boolean` | - Whether to include status, timestamp and other information |

#### Returns

Type: `Promise<boolean | { value: boolean; message: string; type: string; duration: number; }>`

Current visibility or detailed metadata object

### `show() => Promise<void>`

Shows the notification with animation.

This is the primary method for displaying notifications programmatically.

#### Examples

```javascript
await notification.show();
```

#### Returns

Type: `Promise<void>`

Promise resolving to void when animation completes

### `toggle() => Promise<void>`

(Advance) to toggle the notification visibility.

Useful when managing notification state externally and you want to show/hide conditionally.

#### Returns

Type: `Promise<void>`

---

_Built with [StencilJS](https://stenciljs.com/)_
