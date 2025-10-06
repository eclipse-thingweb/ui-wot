# ui-button



[Properties](#properties) · [Events](#events) · [Methods](#methods)
<!-- Auto Generated Below -->


## Overview

A simple button component designed for WoT device actions.

Features multiple visual styles, status indicators, and Web of Things integration.
Buttons trigger actions rather than managing state values.





### Examples

#### Example – Basic Usage

```html
<ui-button label="Click Me"></ui-button>
<ui-button variant="filled" label="Submit" show-status="true"></ui-button>
```
#### Example – WoT Action Integration

```javascript
const button = document.getElementById('device-button');
await button.setAction(async () => {
  await thing.invokeAction('execute');
});
```

## Properties

| Property          | Attribute           | Description                                                                                                                                                                    | Type                                    | Default      |
| ----------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- | ------------ |
| `color`           | `color`             | Color theme for the button matching to thingsweb theme                                                                                                                         | `"neutral" \| "primary" \| "secondary"` | `'primary'`  |
| `dark`            | `dark`              | Enable dark mode theme styling when true                                                                                                                                       | `boolean`                               | `false`      |
| `disabled`        | `disabled`          | Disable user interaction when true                                                                                                                                             | `boolean`                               | `false`      |
| `keyboard`        | `keyboard`          | Enable keyboard navigation so user can click using 'Space' and 'Enter' keys when true                                                                                          | `boolean`                               | `true`       |
| `label`           | `label`             | Text label displayed on the button                                                                                                                                             | `string`                                | `'Button'`   |
| `showLastUpdated` | `show-last-updated` | Show last updated timestamp below the component                                                                                                                                | `boolean`                               | `false`      |
| `showStatus`      | `show-status`       | Show visual operation status indicators (loading, success, failed) right to the component                                                                                      | `boolean`                               | `false`      |
| `variant`         | `variant`           | Visual style variant of the button. - minimal: Clean design with transparent background - outlined: Border-focused design with outline style - filled: Solid background design | `"filled" \| "minimal" \| "outlined"`   | `'outlined'` |


## Events

| Event      | Description                                                                                                            | Type                         |
| ---------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `clickMsg` | Emitted when button is clicked through user interaction. Contains the button label, timestamp, and source information. | `CustomEvent<UiMsg<string>>` |


## Methods

### `setAction(actionFn?: () => Promise<any>) => Promise<boolean>`

Sets the action to execute when button is clicked.
This is the primary method for connecting button to real devices .






#### Examples

```javascript
await button.setAction(async () => {
  await thing.invokeAction('execute');
});
```

#### Parameters

| Name       | Type                 | Description                                     |
| ---------- | -------------------- | ----------------------------------------------- |
| `actionFn` | `() => Promise<any>` | - The async function to execute on button click |

#### Returns

Type: `Promise<boolean>`

Promise resolving to true if successful, false if failed

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



