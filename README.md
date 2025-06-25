<h1>
  <picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/eclipse-thingweb/thingweb/master/brand/logos/ui-wot_for_dark_bg.svg">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/eclipse-thingweb/thingweb/master/brand/logos/ui-wot.svg">
  <img title="ThingWeb ui-wot" alt="Thingweb ui-wot logo" src="https://raw.githubusercontent.com/eclipse-thingweb/thingweb/master/brand/logos/ui-wot.svg" width="300">
</picture>
</h1>

> A library, reusable component, and dashboard tool to interact with any IoT device with a WoT Thing Description (TD).

The Eclipse Thingweb **UI-WoT** is a modular toolkit being designed to serve mutliple use cases. It follows the W3C Web of Things standards, ensuring high interoperability. With UI-WoT, developers can skip manual UI coding and instead generate dynamic, interactive dashboards using standardized TDs.


## What We Aim

UI-WoT is being designed to be used in **three different ways**, depending on your needs:

### 1. Reusable UI Components

Web Components (e.g., `<ui-toggle>`, `<ui-slider>`, `<ui-button>`) that can be used in any web project to represent common WoT affordances like Properties, Actions, and Events. These components:

* Will be implemented as **standard Web Components** (Custom Elements).
* Will work in any framework (React, Vue, Angular) or plain HTML.
* Encapsulated interaction logics like state sync, event listening, property writing etc.

This makes our components easy to use in any custom dashboards, prototyping tools, or in embedded UIs where you want to control individual device affordances without managing low-level WoT TD interaction.

### 2. Embeddable UI Generation Library

UI-WoT can be imported as a JavaScript library into existing applications to dynamically generate user interfaces from any valid TD. By calling this library developers can:

* Parse the TD structure and extract all affordances.
* Attach the UI to any custom container or layout.

This approach will be useful for those who want to integrate dynamic WoT device control into their existing apps or dashboards with minimal effort and maximum flexibility.

### 3. UI Dashboard Generator

UI-WoT will also include a fully functional web application that is a significant upgrade to the example UI of node-wot's browser bundle, i.e. the 'browserified node-wot':

* Allows users to **consume Thing Descriptions (TDs)**.
* Automatically generates a complete UI dashboard.
* Supports **drag, drop, and resize** of widgets/cards using a grid layout.
* Enables **live interaction** with remote or local Things (e.g., change/view values, invoke actions, observe events etc.).
* Offers optional features like **layout saving**.

This standalone interface is aimed for the end users who want to explore and interact with IoT devices visually without writing any code.

## Figma Design (Under Progress)
Feel free to give suggestions here, will love to hear suggestions from you!
[View the UI-WoT Figma Design](https://www.figma.com/design/PcgN3oVPl6387MqqidCF1H/UI-WOT?node-id=0-1&t=6rQYTFoWH27GqBwQ-1)
