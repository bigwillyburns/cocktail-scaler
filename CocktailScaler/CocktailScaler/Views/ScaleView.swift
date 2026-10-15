import SwiftUI

struct ScaleView: View {
    let recipe: Recipe

    enum Mode: String, CaseIterable, Identifiable {
        case volume = "Total Volume"
        case servings = "Servings"
        var id: Self { self }
    }

    @State private var mode: Mode = .volume
    @State private var targetText = "1000"
    @State private var targetUnit: BatchUnit = .ml
    @State private var servingsText = "10"
    @State private var outputUnit: BatchUnit = .ml
    @State private var includeDilution = false

    private var ingredients: [Ingredient] { recipe.sortedIngredients }
    private var baseVolumeML: Double { recipe.totalVolumeML }

    /// Water added per serving when batching pre-diluted (e.g. for a bottled cocktail).
    private var waterPerServingML: Double {
        includeDilution ? baseVolumeML * recipe.dilutionPercent / 100 : 0
    }

    private var servingVolumeML: Double { baseVolumeML + waterPerServingML }

    private var factor: Double {
        switch mode {
        case .volume:
            let target = (Fmt.parse(targetText) ?? 0) * targetUnit.mlPerUnit
            return CocktailMath.scaleFactor(servingVolumeML: servingVolumeML, targetVolumeML: target)
        case .servings:
            return max(Fmt.parse(servingsText) ?? 0, 0)
        }
    }

    private var batchABV: Double {
        includeDilution ? recipe.dilutedABV : recipe.abv
    }

    var body: some View {
        Form {
            Section("Scale By") {
                Picker("Scale by", selection: $mode) {
                    ForEach(Mode.allCases) { Text($0.rawValue).tag($0) }
                }
                .pickerStyle(.segmented)

                switch mode {
                case .volume:
                    HStack {
                        TextField("Volume", text: $targetText)
                            .keyboardType(.decimalPad)
                            .font(.title3)
                        Picker("Unit", selection: $targetUnit) {
                            ForEach(BatchUnit.allCases) { Text($0.label).tag($0) }
                        }
                        .labelsHidden()
                    }
                case .servings:
                    HStack {
                        TextField("Servings", text: $servingsText)
                            .keyboardType(.decimalPad)
                            .font(.title3)
                        Text("servings").foregroundStyle(.secondary)
                    }
                }

                if recipe.dilutionPercent > 0 {
                    Toggle("Add dilution water (\(Fmt.percent(recipe.dilutionPercent)))", isOn: $includeDilution)
                }
            }

            Section {
                Picker("Show amounts in", selection: $outputUnit) {
                    ForEach([BatchUnit.ml, .l, .oz]) { Text($0.label).tag($0) }
                }
                .pickerStyle(.segmented)

                ForEach(ingredients) { ingredient in
                    ScaledRow(
                        name: ingredient.name,
                        scaledML: ingredient.volumeML * factor,
                        outputUnit: outputUnit,
                        originalUnitText: secondaryText(for: ingredient)
                    )
                }

                if waterPerServingML > 0 {
                    ScaledRow(
                        name: "Water",
                        scaledML: waterPerServingML * factor,
                        outputUnit: outputUnit,
                        originalUnitText: nil
                    )
                }
            } header: {
                Text("Batch")
            }

            Section("Summary") {
                LabeledContent("Scale factor", value: "×\(Fmt.number(factor))")
                if mode == .volume {
                    LabeledContent("Servings", value: Fmt.number(factor, maxDigits: 1))
                }
                LabeledContent("Total volume", value: outputUnit.display(ml: servingVolumeML * factor))
                LabeledContent("ABV", value: Fmt.percent(batchABV))
            }

            Section {
                ShareLink(item: shareText) {
                    Label("Share Batch Recipe", systemImage: "square.and.arrow.up")
                }
            }
        }
        .scrollDismissesKeyboard(.interactively)
        .navigationTitle("Scale \(recipe.name)")
        .navigationBarTitleDisplayMode(.inline)
    }

    /// The scaled amount in the ingredient's own unit, when it differs from the output unit.
    private func secondaryText(for ingredient: Ingredient) -> String? {
        if ingredient.unit.batchUnit == outputUnit { return nil }
        return ingredient.unit.display(ingredient.amount * factor)
    }

    private var shareText: String {
        var lines = ["\(recipe.name) — batch (×\(Fmt.number(factor)))"]
        for ingredient in ingredients {
            lines.append("• \(ingredient.name): \(outputUnit.display(ml: ingredient.volumeML * factor))")
        }
        if waterPerServingML > 0 {
            lines.append("• Water: \(outputUnit.display(ml: waterPerServingML * factor))")
        }
        lines.append("Total: \(outputUnit.display(ml: servingVolumeML * factor)) · \(Fmt.percent(batchABV)) ABV")
        return lines.joined(separator: "\n")
    }
}

private struct ScaledRow: View {
    let name: String
    let scaledML: Double
    let outputUnit: BatchUnit
    let originalUnitText: String?

    var body: some View {
        HStack {
            Text(name)
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
                Text(outputUnit.display(ml: scaledML))
                    .font(.headline)
                    .monospacedDigit()
                if let originalUnitText {
                    Text(originalUnitText)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .monospacedDigit()
                }
            }
        }
    }
}
