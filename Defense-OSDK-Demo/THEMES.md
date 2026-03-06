# Theme System

## How to Switch Themes

Open `src/_variables.scss` and change line 38:

```scss
$active-theme: "devcon"; // Change to "katie-classic" to switch themes
```

## Available Themes

### 1. **devcon** (Current)
Terminal-style military theme
- Pure black backgrounds (#000000)
- Bright terminal green (#00ff41)
- Monospace fonts everywhere
- Sharp corners (no border-radius)
- Green glow effects on borders
- Perfect for demos and military aesthetics

### 2. **katie-classic**
Original clean professional theme
- Light/dark mode support (auto-detects system preference)
- Rose/pink accent (Blueprint rose1 for light, rose5 for dark)
- Blueprint JS design system
- Rounded corners (4px border-radius)
- Softer color palette
- Professional business look

## Example

To switch from devcon to katie-classic:

```scss
// In src/_variables.scss, line 38
$active-theme: "katie-classic"; // Changed from "devcon"
```

Save the file and your dev server will automatically reload with the new theme!

## Creating New Themes

To add a new theme:

1. Add a new `@else if` block in `_variables.scss` after the existing themes
2. Define all CSS custom properties (--variables)
3. Add your theme name to the `$active-theme` options

All components use these CSS variables, so they'll automatically adapt to any theme!
