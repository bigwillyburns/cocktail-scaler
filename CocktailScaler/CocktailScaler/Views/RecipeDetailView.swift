import SwiftUI

struct RecipeDetailView: View {
    let recipe: Recipe
    @State private var showingEditor = false

    var body: some View {
        List {
            Section("Ingredients") {
                ForEach(recipe.sortedIngredients) { ingredient in
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(ingredient.name)
                            Text("\(Fmt.percent(ingredient.abv)) ABV")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        Text(ingredient.unit.display(ingredient.amount))
                            .monospacedDigit()
                    }
                }
            }

            Section("Totals") {
                LabeledContent("Volume", value: volumeText(recipe.totalVolumeML))
                LabeledContent("ABV", value: Fmt.percent(recipe.abv))
                if recipe.dilutionPercent > 0 {
                    LabeledContent("Dilution", value: Fmt.percent(recipe.dilutionPercent))
                    LabeledContent(
                        "Volume after dilution",
                        value: volumeText(recipe.totalVolumeML * (1 + recipe.dilutionPercent / 100))
                    )
                    LabeledContent("ABV after dilution", value: Fmt.percent(recipe.dilutedABV))
                }
            }

            if !recipe.notes.isEmpty {
                Section("Notes") {
                    Text(recipe.notes)
                }
            }

            Section {
                NavigationLink {
                    ScaleView(recipe: recipe)
                } label: {
                    Label("Scale Recipe", systemImage: "arrow.up.left.and.arrow.down.right")
                        .font(.headline)
                }
            }
        }
        .navigationTitle(recipe.name)
        .toolbar {
            Button("Edit") { showingEditor = true }
        }
        .sheet(isPresented: $showingEditor) {
            RecipeEditorView(recipe: recipe)
        }
    }

    private func volumeText(_ ml: Double) -> String {
        "\(BatchUnit.ml.display(ml: ml)) · \(BatchUnit.oz.display(ml: ml))"
    }
}
