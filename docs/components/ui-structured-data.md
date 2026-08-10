# ui-structured-data

[Properties](#properties) · [Events](#events)

<!-- Auto Generated Below -->

## Overview

A dual-mode component for exploring and editing complex JSON data.
It provides a **Explorer** mode (interactive tree view) and a **Writer** mode (schema-driven form), along with a raw **JSON** preview.
It supports fetching and saving data directly to a WoT Thing Description (TD) property or action.

### Examples

#### Example – Basic Usage

```html
<ui-structured-data
  name="My Config"
  data='{"setting": "A", "count": 10}'
  editable="true"
></ui-structured-data>
```

#### Example – WoT Integration

```html
<ui-structured-data
  td-url="http://192.168.1.10/things/lamp"
  td-property="config"
  auto-save="true"
></ui-structured-data>
```

## Properties

| Property      | Attribute     | Description                                                                                     | Type                                    | Default      |
| ------------- | ------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------- | ------------ |
| `autoSave`    | `auto-save`   | Automatically save changes to the TD property when editing.                                     | `boolean`                               | `false`      |
| `data`        | `data`        | The JSON data to display. Can be a JSON string or an Object.                                    | `any`                                   | `{}`         |
| `editable`    | `editable`    | Enables inline editing in Explorer mode. Writer mode is always editable.                        | `boolean`                               | `false`      |
| `mode`        | `mode`        | Initial display mode.                                                                           | `"explorer" \| "writer" \| "json"`      | `'explorer'` |
| `name`        | `name`        | Title/Name of the root node or component header.                                                | `string`                                | `undefined`  |
| `schema`      | `schema`      | Optional JSON Schema to guide the Writer form generation.                                       | `any`                                   | `null`       |
| `src`         | `src`         | Generic source URL for fetching JSON directly (alternative to td-url).                          | `string`                                | `undefined`  |
| `tdAction`    | `td-action`   | Action Name to bind to (if td-url is set). Used for submitting data as an Action.               | `string`                                | `undefined`  |
| `tdProperty`  | `td-property` | Property Name to bind to (if td-url is set). Used for fetching/updating a Property.             | `string`                                | `undefined`  |
| `tdUrl`       | `td-url`      | Thing Description URL for automatic fetching/writing.                                           | `string`                                | `undefined`  |

## Events

| Event            | Description                                                  | Type                          |
| ---------------- | ------------------------------------------------------------ | ----------------------------- |
| `valueSubmitted` | Emitted when data is successfully saved to the Thing Description URL. | `CustomEvent<any>` |
