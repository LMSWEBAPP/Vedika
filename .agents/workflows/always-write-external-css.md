---
description: Always write CSS in external stylesheet files instead of inline styles or embedded <style> tags. Enforces separation of concerns and consistent styling architecture.
---

# Always Write External CSS

## Rule
Never write inline styles (`style="..."` attributes) or embedded `<style>` blocks in HTML/JSX/TSX files. All CSS must live in dedicated external `.css` (or `.scss`/`.module.css`) files.

## Requirements

1. **No inline styles**
   - Do not use the `style={{ ... }}` prop in React/JSX.
   - Do not use `style="..."` attributes in plain HTML.

2. **No embedded `<style>` tags**
   - Do not add `<style>...</style>` blocks inside HTML files or components.
   - Do not use CSS-in-JS libraries unless the project already depends on one and explicitly requests it.

3. **File organization**
   - Create or reuse a `.css` file colocated with the component/page (e.g. `Button.tsx` → `Button.css`) or in a shared `styles/` directory, following whatever convention already exists in the project.
   - Use CSS Modules (`*.module.css`) if the project is already using them; otherwise use plain `.css` with clear, scoped class names (BEM-style or component-prefixed) to avoid collisions.

4. **Linking styles**
   - Import the CSS file at the top of the component file (`import './Button.css'`) or link it via `<link rel="stylesheet" href="...">` in the HTML `<head>`.

5. **Refactoring existing code**
   - If you encounter inline styles or `<style>` blocks while editing a file, extract them into the appropriate external CSS file and replace them with class names, unless the user explicitly asks you not to.

6. **Exceptions**
   - Dynamic values that cannot be expressed in static CSS (e.g. a computed `transform` based on runtime data, or a chart's dynamically calculated width) may use inline styles for that specific property only. Everything else must remain in the external stylesheet.

## Why
Keeping CSS external improves readability, enables caching, avoids specificity/override issues, and keeps styling consistent and maintainable across the codebase.