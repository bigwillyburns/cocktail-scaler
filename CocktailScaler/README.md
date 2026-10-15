# Cocktail Scaler (iOS)

A SwiftUI + SwiftData iPhone app for building cocktail recipes, calculating
their ABV, and scaling them to any batch size.

## Features

- **Ingredients in ml, oz or dashes**, each with its own ABV.
- **Live ABV** while you edit: total alcohol ÷ total volume. Optionally set a
  dilution % (water from ice) to see the ABV of the finished drink.
- **Cocktail List**: recipes are saved on the device (SwiftData), searchable,
  and swipe to delete.
- **Scaling** to a total volume (ml, L, oz, gal) or a number of servings. Shows
  each ingredient's batch amount in ml, L or oz, with the original unit
  alongside (e.g. "≈ 40 dashes"). You can add the dilution water to the batch
  for pre-diluted bottled cocktails, and share the batch as text.

Conversions: 1 oz = 29.5735 ml (US fl oz), 1 dash ≈ 0.92 ml. They're defined in
`CocktailScaler/Models/Units.swift`.

## Requirements

You need a **Mac with Xcode 15 or later**. iOS apps can't be built on Windows.
Runs on iOS 17+.

## Build & run

### Option A: XcodeGen (quickest)

```bash
brew install xcodegen
cd CocktailScaler
xcodegen
open CocktailScaler.xcodeproj
```

### Option B: plain Xcode

1. Xcode → File → New → Project → iOS **App**. Name it `CocktailScaler`,
   Interface **SwiftUI**, Storage **None**.
2. Delete the generated `ContentView.swift` and `CocktailScalerApp.swift`.
3. Drag the `CocktailScaler/` source folders (`Models`, `Logic`, `Views`,
   `CocktailScalerApp.swift`) into the project, ticking "Copy items if needed".
4. Set the deployment target to iOS 17.0.

Then choose an iPhone simulator, or your own iPhone, and press ⌘R. To install
on a real phone, pick your Apple ID team under Signing & Capabilities. A free
account works, but the app expires after 7 days.

Run the unit tests with ⌘U.

## Project layout

```
CocktailScaler/
  CocktailScalerApp.swift     App entry + SwiftData container
  Models/Recipe.swift         Recipe and Ingredient (persisted)
  Models/Units.swift          ml/oz/dash and batch units, conversions
  Logic/CocktailMath.swift    Volume, ABV and scale-factor maths
  Logic/Formatting.swift      Number formatting & parsing
  Views/CocktailListView.swift   Saved cocktails
  Views/RecipeDetailView.swift   Recipe, totals, entry to scaling
  Views/RecipeEditorView.swift   Create / edit a recipe
  Views/ScaleView.swift          Batch scaling
CocktailScalerTests/          Unit tests for the maths
```
