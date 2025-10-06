# DaisyUI (with Tailwind CSS)

## What is DaisyUI?

It's not just another UI component library; DaisyUI is a Tailwind CSS plugin. It provides useful component class names to write less code and build faster. It has a lot of UI elements like buttons, inputs, modals, and more. It is a super-powered version of Tailwind. It helps to build beautiful UIs faster without having to leave HTML or custom CSS.
It is about implementing Tailwind CSS even better by giving common UI patterns semantic class names. This doesn't take away any of Tailwind's flexibility for customization. It also comes with themes, which is a bonus.

## How DaisyUI Renders Dynamic Data

DaisyUI on its own does not automatically handle rendering dynamic data. It is just a collection of styles of HTML components. The underlying JavaScript framework like React will handle the logic for dynamic data rendering, such as getting the data, managing state, and updating the UI when the data changes. DaisyUI just gives inputs, displays, and controls their look.

For example, a toggle component from DaisyUI will use React state to keep track of whether it is on or off and send that state as a prop to the DaisyUI component. When the user interacts with the toggle, React's event handlers will update the state, and DaisyUI will reflect that change in the frontend.

## Key Component Types

DaisyUI offers a wide array of components that cover most common UI needs. Some key types relevant to our project include:

- **Buttons:** For actions and interactions.

- **Toggles:** Perfect for boolean properties (on/off states).
- **Range Slider:** Ideal for numerical properties with a defined minimum and maximum (sliders).
- **Input:** Generic text, number, and other input fields.
- **Select:** For enum type properties (dropdowns).
- **Cards:** A versatile component that can serve as the base for our affordance cards.
- **Status:** To show the status of a thing (like if it is Online/Offline).
- **Stat:** Used to show numbers and data in a block.
- **Theme Controller:** To change themes, especially dark/light mode.
- **Progress:** For visualizing levels (like water or bean levels in a coffee machine).
- **Modal:** Useful for action inputs or detailed views.

It also provides excellent styling for form controls, which is super helpful.

## Reusability and Relevance for UI-WoT

DaisyUI, especially when paired with Tailwind CSS, is an **excellent choice** and highly reusable for this UI-WoT project. Here's why:

- **Foundational UI Building Blocks:** It gives a full set of all basic UI components that can be directly mapped to the fundamental data types and interaction patterns found in Thing Descriptions. For example, we can use DaisyUI's toggle for booleans, range for numbers, select for enums, and input for strings.
- **Rapid Development:** Pre-styled components and Tailwind's utility-first approach help to build UI quickly, allowing us to focus more on the core logic of TD parsing and dynamic generation.
- **Customization and Theming:** DaisyUI comes with some default settings, but almost everything about it can be changed with Tailwind. Thus anyone can easily change the look and feel of the dashboard to match any style.
- **Clean and Minimal:** It encourages a clean and modern aesthetic, which is great for a functional minimal yet catchy dashboard.

## Identified Gaps (and Our Opportunity!)

When seen as a styling framework and a component library it is perfect. But for UI-WoT, DaisyUI does lack in dynamic UI generation from TDs. These are not the limitations of DaisyUI but places where UI-WoT has to extend from it, so currently it lacks:

- **No Schema-Based UI Generation:** DaisyUI doesn't automatically interpret a JSON Schema to generate a form or best component. DataSchema to the appropriate DaisyUI component.
- **No Semantic Enrichment:** It does not understand that a boolean property with `@type` `saref:LightSwitch` should be rendered as a lightbulb icon toggle.
- **No Dynamic Layout Management:** DaisyUI provides components, but not a system for drag-and-drop layouts or persistence.

## Design Patterns and Features that can be considered for UI-WoT

Since UI-WoT aims to become a more advanced competitor, we can analyze and adopt some of the existing features to strengthen our own system. Below are the features we should consider to add or enhance in our UI-WoT project:

- **Fixed Size Scaling:**
  Looking through DaisyUI's examples it uses consistent sizing tokens (xs, sm, md, lg, xl) across buttons, inputs, and cards. This creates a clear visual hierarchy in dashboards.
  We should apply this same scaling system to affordance cards in UI-WoT. Small cards would be perfect for simple boolean properties like switches, medium cards for standard properties with single values, and larger cards for complex objects or actions that require multiple input parameters.
- **Interactive State Feedback:**
  DaisyUI's interactive components, especially buttons, support multiple visual states: normal, hover, active, disabled, loading. Each state has distinct visual feedback that communicates what's happening to the user.
  For UI-WoT, we need to extend this pattern and have clear visual feedback for execution, value changing and connection loss. These additional states are crucial for WoT because network interactions can be slow or fail, and users need to understand what's happening with their devices.

- **Cards as a Core:**
  DaisyUI's Card component is versatile and well-designed, making it an ideal foundation for our affordance representation. We should standardize on using Cards as the primary container for properties, actions, and events.
  Each affordance card should include consistent elements: a title (from the TD affordance name), a description (from the TD description field), an icon (mapped from semantic annotations), and affordance badges that surface important metadata. This consistent card structure would make dashboards intuitive and scannable, regardless of how many different Things are displayed.

- **Accessibility and Keyboard Support:**
  DaisyUI builds on Tailwind's excellent accessibility features, including focus-visible utilities and proper ARIA attributes. Their components are keyboard-operable by default, which is essential for inclusive design.
  We must leverage these accessible patterns throughout UI-WoT. All interactive elements like toggles, sliders, and others should be fully keyboard operable with visible focus rings. We can tie ARIA labels directly to TD titles and descriptions so that screen readers can announce meaningful information about each affordance.

- **State Styling System:**
  DaisyUI has a pattern of using state classes for different component states (disabled, loading, error, success). These classes apply consistent visual styling across the entire component library.
  We can adopt and extend this pattern for WoT-specific states like offline, readonly, observable, secure. By applying a consistent visual language (e.g., greyed-out for readonly, pulsing for observable), users will immediately understand the nature of each affordance.

- **Animation and Interactions:**
  DaisyUI includes various transitions and hover states that make interfaces smooth and responsive. These micro-interactions provide important feedback without being distracting.
  For UI-WoT, we should leverage these existing animations like a “pulse” or spinner while an action is executing. Connection loss warnings with fade-in/out alerts etc.

- **Icons:**
  While DaisyUI doesn't prescribe a specific icon library, their design language works well with popular icon sets like Heroicons, Lucide, or FontAwesome. Icons improve readability and quick recognition of widgets. For UI-WoT, we need a similar icon mapping strategy. For example, a temperature sensor could automatically get a thermometer icon, a light bulb gets a lamp icon, if not clear then there may be icons based on the type of TD.
