# AuraCSS

AuraCSS is a dependency-free CSS and vanilla JavaScript UI framework for responsive, themeable interfaces. It includes a 12-column grid, utility classes, reusable components, and optional accessible interactions.

## Quick start

Build the distributable files:

```sh
npm run build
```

The build also assembles the root `index.html` showcase from `src/pages/index.html`,
the section files in `src/pages/`, and shared layout fragments in `src/components/`.
Edit those source files instead of editing the generated `index.html` directly.

Include the generated files in your page:

```html
<link rel="stylesheet" href="dist/aura.css">
<script src="dist/aura.js" defer></script>
```

AuraCSS can also be used from its CSS source entry at `src/aura.css`. JavaScript is optional; CSS utilities and components work without it.

Run the JavaScript syntax checks with:

```sh
npm run check
```

## Responsive layout

The grid has 12 columns, with `sm`, `md`, `lg`, and `xl` breakpoints at 576px, 768px, 992px, and 1200px. Rows are centered and capped at the container width to prevent standalone component sections from stretching beyond their frame. Legacy `.col-1` through `.col-12` classes stack on mobile and take effect from `md` upwards.

```html
<main class="aura-container">
  <div class="aura-row">
    <aside class="col-12 col-md-4">Sidebar</aside>
    <section class="col-12 col-md-8">Main content</section>
  </div>
</main>
```

Use `.col-sm-6`, `.col-lg-4`, or `.col-xl-3` to change a column span at a specific breakpoint. `.aura-row-auto` creates an auto-fitting grid; `.aura-row-2`, `.aura-row-3`, and `.aura-row-4` create fixed column layouts.

## Utility classes

Utilities cover display and flex layout (`aura-d-flex`, `aura-flex-column`, `aura-justify-between`, `aura-items-center`), spacing (`aura-gap-4`, `aura-mt-6`, `aura-p-4`), typography (`aura-text-lg`, `aura-font-semibold`, `aura-text-muted`), semantic text/surface colors, borders, radii, shadows, sizing, overflow, positioning, truncation, and screen-reader-only text. Responsive display helpers use prefixes such as `.aura-md-d-none` and `.aura-lg-d-flex`.

## Themes

Themes are controlled by `data-aura-theme="dark|light|system"` on the root element. The default is dark; system mode follows the operating-system color preference.

```html
<html data-aura-theme="dark">
<body>
  <button class="aura-btn aura-btn-glass" onclick="Aura.toggleTheme()">Toggle theme</button>
  <button class="aura-btn aura-btn-outline" onclick="Aura.setTheme('system')">Use system theme</button>
</body>
</html>
```

The selected theme is persisted in local storage when available. `Aura.getTheme()` returns the active setting.

## Components

### Buttons, forms, and feedback

```html
<button class="aura-btn aura-btn-cosmic">Primary action</button>
<button class="aura-btn aura-btn-outline aura-btn-sm">Secondary</button>

<label class="aura-label" for="email">Email</label>
<input class="aura-input" id="email" type="email" placeholder="name@example.com">
<label class="aura-switch">
  <input type="checkbox" role="switch">
  <span class="aura-switch-track" aria-hidden="true"></span>
  Enable notifications
</label>

<div class="aura-alert aura-alert-success">Your changes are saved.</div>
<div class="aura-alert aura-alert-warning aura-alert-dismissible">
  <span>Review this change before continuing.</span>
  <button class="aura-alert-close" type="button" data-aura-dismiss="alert" aria-label="Dismiss">×</button>
</div>
<div class="aura-table-responsive">
  <table class="aura-table aura-table-striped aura-table-hover">...</table>
</div>
```

Additional components include badges, avatars and avatar groups, progress bars, skeletons, spinners, list groups, breadcrumbs, pagination, accordions, dropdowns, tabs, and responsive navigation.

### Interactive components

Load `dist/aura.js` to enable theme persistence, toast notifications, copy-to-clipboard, modals with focus handling, accordions, collapsible panels, dropdowns, keyboard-accessible tabs, mobile navigation, tooltips, counters, spotlight/tilt effects, and reveal-on-scroll.

```js
Aura.toast({ title: 'Saved', message: 'Your changes are ready.', type: 'success' });
Aura.modal('#details').open();
Aura.setTheme('light');
```

```html
<button class="aura-btn aura-btn-outline"
        data-aura-toggle="collapse"
        data-aura-target="#more">
  Show details
</button>
<div class="aura-collapse" id="more">Additional content</div>
```

Tabs use `data-aura-tabs` on their container, `data-aura-tab` on each button, and `data-aura-target` pointing to each panel ID. Dropdown triggers use `data-aura-toggle="dropdown"` inside `.aura-dropdown`.

```html
<div class="aura-tabs" data-aura-tabs>
  <button class="aura-tab" type="button" data-aura-tab data-aura-target="#overview">Overview</button>
  <button class="aura-tab" type="button" data-aura-tab data-aura-target="#activity">Activity</button>
</div>
<section class="aura-tab-panel" id="overview">Overview content</section>
<section class="aura-tab-panel" id="activity" hidden>Activity content</section>

<div class="aura-dropdown">
  <button class="aura-btn aura-btn-outline" type="button" data-aura-toggle="dropdown">Actions</button>
  <div class="aura-dropdown-menu">
    <a class="aura-dropdown-item" href="#overview">View overview</a>
  </div>
</div>
```

## Project files

- `src/aura.css` is the CSS source entry.
- `src/css/` contains design tokens, base styles, grid, utilities, and component styles.
- `src/aura.js` contains the browser controller.
- `build.js` compiles the ordered source files to `dist/aura.css` and `dist/aura.js`.
- `src/pages/index.html` is the showcase page template; its sections live alongside it.
- `src/components/` contains the shared navigation, hero, footer, and overlay fragments.
- `index.html` is the assembled interactive framework showcase.
