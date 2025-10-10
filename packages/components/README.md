<h1>
  <picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/eclipse-thingweb/thingweb/master/brand/logos/ui-wot_for_dark_bg.svg">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/eclipse-thingweb/thingweb/master/brand/logos/ui-wot.svg">
  <img title="ThingWeb ui-wot" alt="Thingweb ui-wot logo" src="https://raw.githubusercontent.com/eclipse-thingweb/thingweb/master/brand/logos/ui-wot.svg" width="300">
</picture>
</h1>

> Independent Web Components library for building UIs for IoT applications using **Web of Things (WoT)**. These components provide ready-to-use UI elements with simple TD integration.

![Components Showcase](../../assets/components.gif)

### Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
  - [1. Vanilla HTML with node-wot Browser Bundle](#1-vanilla-html-with-node-wot-browser-bundle)
  - [2. Framework Integration (React/Vue/Angular)](#2-framework-integration-reactvueangular)
    - [React Example (Complete Setup)](#react-example-complete-setup)
- [Components Overview](#components-overview)
  - [Input Components](#input-components)
  - [Action Components](#action-components)
  - [Monitoring Components](#monitoring-components)
  - [Complex Data Components](#complex-data-components)
- [Services](#services)
  - [Core Services Overview](#core-services-overview)
    - [`initializeWot()`](#initializewot)
    - [`connectAll(options)`](#connectalloptions)
    - [Individual Connection Utilities](#individual-connection-utilities)
  - [TD attributes that can be attached to any component using the service](#td-attributes-that-can-be-attached-to-any-component-using-the-service)

## Installation

Clone the repository and build the components:

```bash
git clone https://github.com/eclipse-thingweb/ui-wot.git
cd ui-wot
npm install
cd ui-wot/packages/components
npm run build
npm start
```

You will be redirected to http://localhost:3333/. if not, open the url to view the components UIs and demos.

## Quick Start

### 1. Vanilla HTML with node-wot Browser Bundle

For vanilla HTML applications, you need to add this script inside the head tag, then you can directly use the custom components tag

```html
<script type="module" src="<your-directory-path>/ui-wot/packages/components/www/build/ui-wot-components.esm.js"></script>
```

To interact with a Thing, you also need the node-wot browser bundle:

```html
<script src="https://cdn.jsdelivr.net/npm/@node-wot/browser-bundle@latest/dist/wot-bundle.min.js"></script>
```

Example:

```html
<!DOCTYPE html>
<html>

<head>
  <!-- Required: node-wot browser bundle for WoT functionality -->
  <script src="https://cdn.jsdelivr.net/npm/@node-wot/browser-bundle@latest/dist/wot-bundle.min.js"></script>
  <!-- Load all components -->
  <script type="module"
    src="./packages/components/www/build/ui-wot-components.esm.js"></script> 
    <!-- the path assumes an html in the root of the repository. Change as you see fit or use the npm module -->
</head>

<body>
  <ui-slider id="integer" label="Integer" min="0" max="100" value="50"></ui-slider>
</body>
<script>
  // Put your TD connection logic here, use defined methods for ease

  (async () => {
    // Wait for components to be defined
    await Promise.all(['ui-slider'].map(tag => customElements.whenDefined(tag)));

    // Initialize WoT and consume Thing Description
    const servient = new window.WoT.Core.Servient();
    servient.addClientFactory(new window.WoT.Http.HttpClientFactory());
    const wot = await servient.start();
    const td = await fetch('http://plugfest.thingweb.io/http-data-schema-thing').then(r => r.json());
    const thing = await wot.consume(td);

    // Connect components manually - wait for the component to be ready
    const slider = document.getElementById('integer');
    await slider.componentOnReady();
    const curVal = await (await thing.readProperty('int')).value();
    console.log(`Initial value: ${curVal}`);
    await slider.setValue(curVal, {
       writeOperation: async value => {
         await thing.writeProperty('int', value);
       }
     });
  })();
</script>

</html>

```

### 2. Framework Integration (React/Vue/Angular)

The components work seamlessly with modern frameworks. The library provides both components and services for complete WoT integration.

#### React Example (Complete Setup)

**main.tsx** - Define Custom Elements:

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { defineCustomElement as UiToggle } from '@thingweb/ui-wot-components/components/ui-toggle';
import { defineCustomElement as UiSlider } from '@thingweb/ui-wot-components/components/ui-slider';
// Similarly, you can add more components
import App from './App';

UiToggle();
UiSlider();

createRoot(document.getElementById('root')!).render(<App />);
```

**index.html** - Include node-wot Bundle:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>UI-WoT React Example</title>
    <!-- Required: node-wot browser bundle -->
    <script src="https://cdn.jsdelivr.net/npm/@node-wot/browser-bundle@latest/dist/wot-bundle.min.js"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**App.tsx** - Use Components with Services:

```tsx
import { useEffect } from 'react';
import { initializeWot, connectAll } from '@thingweb/ui-wot-components/services';

const TD_URL = '<td-url>';

export default function App() {
  useEffect(() => {
    (async () => {
      // Wait for custom elements to be defined
      const tags = ['ui-toggle', 'ui-slider'];
      await Promise.all(tags.map(t => customElements.whenDefined(t)));

      // Initialize WoT and connect components
      await initializeWot();
      await connectAll({ baseUrl: TD_URL, container: document });
    })();
  }, []);

  return (
    <div>
      <h2>UI‑WoT React Demo</h2>
      {/* td-property directly connects to that property */}
      <ui-toggle td-property="bool" td-strategy="poll" label="Toggle" show-last-updated="true" show-status="true"></ui-toggle>
      {/* td-strategy keeps polling data at a fixed interval (default = 3000 ms) */}

      <ui-slider td-property="int" label="Slider" min="0" max="100" step="1" show-last-updated="true" show-status="true"></ui-slider>
    </div>
  );
}
```

## Components Overview

UI-WoT Components provide a complete set of Web Components for WoT interactions:

### Input Components

- [`<ui-toggle>`](../../docs/components/ui-toggle.md) - **On/off switch for boolean properties**

  - Visual switch for boolean values, perfect for controlling device power states, modes, or any boolean property.
  - Supports multiple color themes and dark mode.
  - Shows status indicators and timestamps to provide better feedback and indicate when something was last changed.

- [`<ui-slider>`](../../docs/components/ui-slider.md) - **Smooth range control for numeric properties**

  - Intuitive sliding control that makes adjusting brightness, temperature, or volume feel effortless.
  - You can set custom min/max boundaries and step increments to match your device's capabilities perfectly.
  - Displays the current value in real-time, so users always know exactly where they've set things.

- [`<ui-number-picker>`](../../docs/components/ui-number-picker.md) - **Precise numeric input specifically for integers.**

  - Features handy increment/decrement buttons alongside direct keyboard input for when you need exact values.
  - Great for settings like timer durations, counts, or any scenario where precision matters.

- [`<ui-text>`](../../docs/components/ui-text.md) - **Flexible text input with JSON support**

  - Works for both single-line inputs (like device names) and multi-line text (like descriptions or logs).
  - Smart debouncing to avoid continuous data writing to the Thing while someone is still typing.
  - Choose between debounced or manual data write using the save button.
  - Has structured (Array and JSON support) and unstructured modes with show-line-number option.

- [`<ui-checkbox>`](../../docs/components/ui-checkbox.md) - **Traditional checkbox**

  - Perfect alternative to toggle switches when you have multiple boolean options in a list or form.
  - Includes proper label association and radio variant.

- [`<ui-file-picker>`](../../docs/components/ui-file-picker.md) - **Simple file handler**

  - Supports both traditional file browsing and modern drag-and-drop interactions.
  - Handles single files or multiple selections depending on what your application needs.
  - Built-in file type filtering helps users select only the files your device can actually process.

- [`<ui-color-picker>`](../../docs/components/ui-color-picker.md) - **Color picker with various formats**

  - Understands whatever color format you use, whether that's hex codes (#FF0000), RGB values, HSL, or even CSS color names like "red" or "blue".
  - Automatically converts between formats (hex, rgb, rgba, hsl, hsla) so your Thing gets exactly what it expects.
  - Features an intuitive color box interface with real-time preview.

- [`<ui-calendar>`](../../docs/components/ui-calendar.md) - **Versatile date and time picker**
  - Supports both 12-hour and 24-hour time formats, with optional time selection for when you need precise scheduling.
  - Calendar popup with easy month/year navigation makes selecting dates feel natural and intuitive.
  - Option for Today and clear button, with many other customization.
  - Configurable display patterns (dd/MM/yyyy, MM/dd/yyyy, etc.) ensure dates appear the way your users expect them.

### Action Components

- [`<ui-button>`](../../docs/components/ui-button.md) - **Smart buttons that handle Thing actions**
  - A button that invokes device actions and shows visual feedback during execution.
  - Supports variants and colors.

### Monitoring Components

- [`<ui-event>`](../../docs/components/ui-event.md) - **Real-time event monitoring**

  - Subscribes to your Thing and displays events as they happen.
  - Has timestamps so you can track what happened and when.
  - Gives you full control with Subscribe/Unsubscribe buttons, perfect for debugging or monitoring specific time periods.

- [`<ui-notification>`](../../docs/components/ui-notification.md) - **Notifications and status alerts**
  - Toast-style notifications that appear when important things happen.
  - Supports different types (info, warning, error, success) with appropriate colors and icons.
  - Smart auto-dismiss timing with manual override controls for notifications that need attention.

**Key difference to understand**: Notifications subscribe automatically when your UI loads and something changes, while events require you explicitly to subscribe first, think of notifications as "always on" status updates versus events as "on-demand" monitoring. Notifications are for transient updates.

### Complex Data Components

- [`<ui-object>`](../../docs/components/ui-object.md) - **Dynamic component for complex device configurations**
  - Automatically generates different components from object schemas.
  - Handles nested objects and complex data structures in a single write operation.

Each component supports:

- **Automatic WoT Integration** via `td-*` attributes
- **Manual Connection** via component methods (eg., setValue etc.)
- **Observation** either via Observe property or Polling
- **Status Indicators** (loading, success, error)
- **Last Updated Timestamps**
- **Multiple Colors** (primary, secondary, neutral)
- **Dark Mode**
- **Keyboard Interaction**

## Services

The services module is built on top of node-wot broswer bundle and provides utilities for WoT integration, component management and TD connections. For comprehensive documentation, usage patterns, and examples, see the **[Services Documentation](../../docs/components/services.md)**.

### Core Services Overview

#### `initializeWot()`

Initializes the WoT runtime using the node-wot browser bundle. Must be called before using any WoT features.

```javascript
import { initializeWot } from '@thingweb/ui-wot-components/services';

// Initialize WoT runtime
await initializeWot();
```

#### `connectAll(options)`

Automatically discovers and connects all components with `td-*` attributes to their corresponding WoT properties, actions, and events.

```javascript
import { connectAll } from '@thingweb/ui-wot-components/services';

// Connect all components to a Thing Description
await connectAll({
  baseUrl: 'http://device.local/td', // Thing Description URL
  container: document, // Container to search for components
});
```

#### Individual Connection Utilities

For individual component connections:

```javascript
import { connectProperty, connectAction, connectEvent } from '@thingweb/ui-wot-components/services';

// Connect individual components to specific WoT features
await connectProperty(element, { baseUrl: 'http://device.local/td', name: 'temperature' });
await connectAction(button, { baseUrl: 'http://device.local/td', name: 'restart' });
await connectEvent(monitor, { baseUrl: 'http://device.local/td', name: 'alert' });
```

### TD attributes that can be attached to any component using the service

- **`td-property`**: Connect to a WoT property
- **`td-action`**: Connect to a WoT action
- **`td-event`**: Connect to a WoT event
- **`td-strategy`**: Connection strategy ('observe', 'poll', 'auto'); disabled by default
- **`td-poll-ms`**: Polling interval in milliseconds
- **`td-url`**: Specific Thing Description URL to connect
