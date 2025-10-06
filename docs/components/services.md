# UI-WoT Services Documentation

## Overview

The UI-WoT Services module provides utilities for connecting Web Components to Web of Things (WoT) devices using the node-wot browser bundle. It handles automatic component discovery, TD (Thing Description) consumption, and real-time data synchronization.

## Table of Contents

- [Core Services](#core-services)
- [Connection Functions](#connection-functions)
- [TD Attributes](#td-attributes)
- [API Reference](#api-reference)
- [Best-Practices](#best-practices)

## Core Services

### `initializeWot(options?)`

Initializes and caches a WoT instance from the node-wot browser bundle.

```typescript
import { initializeWot } from '@thingweb/ui-wot-components/services';

// Initialize WoT runtime
const { wot } = await initializeWot();

// Reuse existing instance (default behavior)
const { wot: cached } = await initializeWot({ reuseExisting: true });

// Force new instance
const { wot: fresh } = await initializeWot({ reuseExisting: false });
```

**Options:**
- `reuseExisting?: boolean` - Whether to reuse existing WoT instance (default: `true`)

**Returns:** `Promise<{ wot: any }>`

**Throws:** Error if node-wot browser bundle is not available or unsupported

### `connectAll(options)`

Automatically discovers and connects all components with `td-*` attributes within a container.

```typescript
import { connectAll } from '@thingweb/ui-wot-components/services';

// Connect all components to a Thing Description
const cleanups = await connectAll({
  baseUrl: 'http://device.local/td',
  container: document, // Optional: defaults to document
});

// Later, cleanup all connections
cleanups.forEach(cleanup => cleanup());
```

**Options:**
- `baseUrl: string` - Thing Description URL
- `container?: ParentNode` - Container to search for components (default: `document`)

**Returns:** `Promise<Cleanup[]>` - Array of cleanup functions

## Connection Functions

### `connectProperty(element, options)`

Connects a component to a WoT Thing property with optional real-time updates.

```typescript
import { connectProperty } from '@thingweb/ui-wot-components/services';

const cleanup = await connectProperty(toggleElement, {
  baseUrl: 'http://device.local/td',
  name: 'power',
  strategy: 'observe', // 'observe' | 'poll' | 'auto'
  pollMs: 5000, // Polling interval in milliseconds
});

// Later, stop updates
cleanup();
```

**Options:**
- `baseUrl: string` - Thing Description URL
- `name: string` - Property name in the TD
- `observe?: boolean` - Deprecated, use `strategy` instead
- `strategy?: 'observe' | 'poll' | 'auto'` - Update strategy
- `pollMs?: number` - Polling interval (default: 3000ms)

**Update Strategies:**
- `observe` - Use WoT property observation (throws if not supported)
- `poll` - Poll property at regular intervals
- `auto` - Try observe first, fall back to polling
- `undefined` - No automatic updates (manual setValue only)

### `connectAction(element, options)`

Connects a button component to invoke a WoT Thing action.

```typescript
import { connectAction } from '@thingweb/ui-wot-components/services';

await connectAction(buttonElement, {
  baseUrl: 'http://device.local/td',
  name: 'restart',
});
```

**Options:**
- `baseUrl: string` - Thing Description URL
- `name: string` - Action name in the TD

### `connectEvent(element, options)`

Connects an event component to subscribe to WoT Thing events.

```typescript
import { connectEvent } from '@thingweb/ui-wot-components/services';

const cleanup = await connectEvent(eventElement, {
  baseUrl: 'http://device.local/td',
  name: 'alert',
});

// Later, cleanup subscription
cleanup();
```

**Options:**
- `baseUrl: string` - Thing Description URL
- `name: string` - Event name in the TD

**Returns:** `Promise<Cleanup>` - Cleanup function to unsubscribe

## TD Attributes

Components can be automatically connected using HTML attributes:

### Property Attributes

```html
<!-- Basic property connection -->
<ui-toggle td-property="power" td-url="http://device.local/td"></ui-toggle>

<!-- With observation strategy -->
<ui-slider 
  td-property="brightness" 
  td-strategy="observe"
  td-url="http://device.local/td">
</ui-slider>

<!-- With polling -->
<ui-number-picker 
  td-property="temperature" 
  td-strategy="poll"
  td-poll-ms="1000"
  td-url="http://device.local/td">
</ui-number-picker>
```

### Action Attributes

```html
<ui-button td-action="restart" td-url="http://device.local/td">
  Restart Device
</ui-button>
```

### Event Attributes

```html
<ui-event td-event="alert" td-url="http://device.local/td"></ui-event>
```

### Attribute Reference

- `td-property` - Property name in the Thing Description
- `td-action` - Action name in the Thing Description
- `td-event` - Event name in the Thing Description
- `td-url` - Specific Thing Description URL (optional if using `connectAll` baseUrl)
- `td-strategy` - Update strategy: `'observe'`, `'poll'`, or `'auto'`
- `td-poll-ms` - Polling interval in milliseconds (default: 3000)


## API Reference

### Types

```typescript
type ObserveStrategy = 'observe' | 'poll' | 'auto';
type Cleanup = () => void | Promise<void>;

interface InitializeWotOptions {
  reuseExisting?: boolean;
}

interface ConnectPropertyOptions {
  baseUrl: string;
  name: string;
  observe?: boolean; // Deprecated
  strategy?: ObserveStrategy;
  pollMs?: number;
}

interface ConnectActionOptions {
  baseUrl: string;
  name: string;
}

interface ConnectEventOptions {
  baseUrl: string;
  name: string;
}

interface ConnectAllOptions {
  baseUrl: string;
  container?: ParentNode;
}
```

### Helper Functions

```typescript
// Common misspelling safety
export const initiliseWot = initializeWot;
```

## Best Practices

1. **Always initialize WoT first:**
   ```javascript
   await initializeWot();
   ```

2. **Wait for custom elements:**
   ```javascript
   await customElements.whenDefined('ui-toggle');
   ```

3. **Use cleanup functions:**
   ```javascript
   const cleanup = await connectProperty(/* ... */);
   // Later...
   cleanup();
   ```

4. **Handle errors gracefully:**
   ```javascript
   try {
     await connectAll({ baseUrl: 'http://device.local/td' });
   } catch (error) {
     console.warn('Connection failed:', error);
   }
   ```

5. **Choose appropriate update strategies:**
   - Use `'observe'` for real-time critical properties
   - Use `'poll'` for stable, slow-changing values
   - Use `'auto'` when unsure about device capabilities

