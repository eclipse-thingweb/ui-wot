<h1>
  <picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/eclipse-thingweb/thingweb/master/brand/logos/ui-wot_for_dark_bg.svg">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/eclipse-thingweb/thingweb/master/brand/logos/ui-wot.svg">
  <img title="ThingWeb ui-wot" alt="Thingweb ui-wot logo" src="https://raw.githubusercontent.com/eclipse-thingweb/thingweb/master/brand/logos/ui-wot.svg" width="300">
</picture>
</h1>

> A comprehensive toolkit for building interactive user interfaces from Web of Things (WoT) Thing Descriptions. Whether you're a developer integrating IoT controls into an existing application or someone who wants to quickly create dashboards without coding, UI-WoT is for you.

Building user interfaces for IoT devices can be time-consuming and repetitive. You need to handle device connections, parse Thing Descriptions, create appropriate UI controls, and manage real-time data updates. UI-WoT solves these challenges by providing ready-to-use Web Components and a visual dashboard generator that automatically generates interfaces from standard Thing Descriptions.

The toolkit consists of two complementary packages that can be used together or independently, depending on the project needs.

## Packages

### Components Library

Location: [`packages/components/`](packages/components/)

The Components Library is a collection of Web Components designed specifically for WoT device interaction. If you're building a custom application and need to add IoT device controls, these components can save you significant development time. Simply drop them into your existing HTML, React, Vue, or Angular project.

Each component understands Thing Description affordances and can automatically connect to device properties, actions, and events. For example, a `<ui-toggle>` can bind to a boolean property and stay in sync with the device state in real-time.

**What makes these components special:**

- Framework-agnostic, meaning it will work anywhere from vanilla html to any framework
- Smart connection strategies that can observe device changes or poll for updates
- Built-in status indicators so users know when something is loading, connected, or has an error
- Comprehensive theming system with dark mode support
- Full keyboard accessibility for all components

**Available components cover common IoT use cases:**

- **Input Controls:** Toggle switches, sliders, number inputs, text fields, checkboxes, file uploads, color pickers, and date/time selectors
- **Action Triggers:** Buttons that can invoke device actions with visual feedback
- **Data Display:** Event monitors and notification systems for real-time device updates

**Getting started with the library:**

```bash
cd packages/components
npm install
npm run build
npm start  # Demo server at http://localhost:3333
```

The demo server showcases all available components with interactive examples.

**[View detailed Components Documentation](packages/components/README.md)**

### Dashboard Generator

Location: [`packages/generator/`](packages/generator/)

The Dashboard Generator is a complete web application that turns Thing Descriptions into interactive dashboards without requiring any programming knowledge. It's designed for system integrators, device manufacturers, researchers, and anyone who needs to quickly create functional interfaces for IoT devices.

Simply provide a Thing Description URL or upload a TD file, and the generator automatically creates appropriate UI components for all available device features. You can then arrange these components on a visual canvas, customize their appearance and behavior, and save the resulting dashboard for later use or sharing.

**What you can do with the generator:**

- Load Thing Descriptions from device URLs or local files
- Automatically generate UI components for all device properties, actions, and events
- Arrange components using an intuitive drag-and-drop interface with grid snapping
- Combine multiple devices into a single unified dashboard
- Configure how components update (real-time observation vs. periodic polling)
- Customize themes, colors, labels, and other visual properties
- Save dashboard configurations as JSON files for sharing or backup
- Export working dashboards that others can import and use immediately

**Perfect for these scenarios:**

- Quickly prototyping IoT interfaces during device development
- Creating test dashboards for system integration and validation
- Building end-user device management interfaces without custom development

**Getting started with the generator:**

```bash
cd packages/generator
npm install
npm run dev  # Application opens at http://localhost:5173
```

The generator includes built-in example Thing Descriptions so you can explore its features even without real devices.

**[View comprehensive Generator Documentation](packages/generator/README.md)**

## Getting Started

**Prerequisites:** You'll need Node.js version 18 or higher and npm version 8 or higher installed on your system.

**Initial setup:**

```bash
# Clone the repository
git clone https://github.com/eclipse-thingweb/ui-wot.git
cd ui-wot

# Install dependencies and build both packages
npm install
npm run build
```

**To explore the Dashboard Generator:**
This is the fastest way to see UI-WoT in action. The generator provides a complete visual interface for creating IoT dashboards.

```bash
cd packages/generator
npm run dev
```

Then open your browser to http://localhost:5173. You'll see the dashboard generator with example Thing Descriptions you can load immediately.

**To explore the Components Library:**
If you want to see all available components and their capabilities:

```bash
cd packages/components
npm start
```

Open http://localhost:3333 to view the component showcase with interactive demos.
