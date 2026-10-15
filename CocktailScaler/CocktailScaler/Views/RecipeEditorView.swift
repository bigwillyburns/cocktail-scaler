import SwiftUI
import SwiftData

/// Editable copy of an ingredient. Amount and ABV are kept as text so the
/// totals update live while typing.
struct IngredientDraft: Identifiable, AlcoholMeasurable {
    let id = UUID()
    var name = ""
    var amountText = ""
    var unit: MeasureUnit = .ml
    var abvText = ""

    var amount: Double { max(Fmt.parse(amountText) ?? 0, 0) }
    var abv: Double { min(max(Fmt.parse(abvText) ?? 0, 0), 100) }

    var isValid: Bool {
        !name.trimmingCharacters(in: .whitespaces).isEmpty && amount > 0
    }
}

extension IngredientDraft {
    init(ingredient: Ingredient) {
        name = ingredient.name
        amountText = Fmt.editable(ingredient.amount)
        unit = ingredient.unit
        abvText = Fmt.editable(ingredient.abv)
    }
}

struct RecipeEditorView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss

    let recipe: Recipe?

    @State private var name: String
    @State private var notes: String
    @State private var dilutionText: String
    @State private var drafts: [IngredientDraft]

    init(recipe: Recipe?) {
        self.recipe = recipe
        _name = State(initialValue: recipe?.name ?? "")
        _notes = State(initialValue: recipe?.notes ?? "")
        _dilutionText = State(initialValue: recipe.map { Fmt.editable($0.dilutionPercent) } ?? "0")
        let existing = recipe?.sortedIngredients.map(IngredientDraft.init(ingredient:)) ?? []
        _drafts = State(initialValue: existing.isEmpty ? [IngredientDraft()] : existing)
    }

    private var validDrafts: [IngredientDraft] { drafts.filter(\.isValid) }
    private var dilution: Double { max(Fmt.parse(dilutionText) ?? 0, 0) }

    private var canSave: Bool {
        !name.trimmingCharacters(in: .whitespaces).isEmpty && !validDrafts.isEmpty
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Cocktail") {
                    TextField("Name", text: $name)
                        .font(.headline)
                    TextField("Notes (optional)", text: $notes, axis: .vertical)
                        .lineLimit(1...4)
                }

                Section {
                    ForEach($drafts) { $draft in
                        IngredientEditorRow(draft: $draft)
                    }
                    .onDelete { drafts.remove(atOffsets: $0) }

                    Button {
                        drafts.append(IngredientDraft())
                    } label: {
                        Label("Add Ingredient", systemImage: "plus.circle.fill")
                    }
                } header: {
                    Text("Ingredients")
                } footer: {
                    Text("ABV is the alcohol by volume of each ingredient — e.g. 40 for most spirits, 0 for juice or syrup. Swipe left to remove an ingredient.")
                }

                Section {
                    HStack {
                        Text("Water from ice")
                        Spacer()
                        TextField("0", text: $dilutionText)
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                            .frame(width: 60)
                        Text("%").foregroundStyle(.secondary)
                    }
                } header: {
                    Text("Dilution (optional)")
                } footer: {
                    Text("Roughly 20% for stirred drinks and 25% for shaken. Leave at 0 to ignore.")
                }

                Section("Totals") {
                    let volume = CocktailMath.totalVolumeML(validDrafts)
                    LabeledContent("Volume", value: "\(BatchUnit.ml.display(ml: volume)) · \(BatchUnit.oz.display(ml: volume))")
                    LabeledContent("ABV", value: Fmt.percent(CocktailMath.abv(of: validDrafts)))
                    if dilution > 0 {
                        LabeledContent(
                            "ABV after dilution",
                            value: Fmt.percent(CocktailMath.abv(of: validDrafts, dilutionPercent: dilution))
                        )
                    }
                }
            }
            .scrollDismissesKeyboard(.interactively)
            .navigationTitle(recipe == nil ? "New Cocktail" : "Edit Cocktail")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save", action: save)
                        .disabled(!canSave)
                }
                ToolbarItemGroup(placement: .keyboard) {
                    Spacer()
                    Button("Done") {
                        UIApplication.shared.sendAction(
                            #selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil
                        )
                    }
                }
            }
        }
    }

    private func save() {
        let target: Recipe
        if let recipe {
            target = recipe
            let old = recipe.ingredients
            recipe.ingredients.removeAll()
            old.forEach(context.delete)
        } else {
            target = Recipe(name: "")
            context.insert(target)
        }

        target.name = name.trimmingCharacters(in: .whitespaces)
        target.notes = notes.trimmingCharacters(in: .whitespacesAndNewlines)
        target.dilutionPercent = dilution

        for (index, draft) in validDrafts.enumerated() {
            let ingredient = Ingredient(
                name: draft.name.trimmingCharacters(in: .whitespaces),
                amount: draft.amount,
                unit: draft.unit,
                abv: draft.abv,
                position: index
            )
            context.insert(ingredient)
            target.ingredients.append(ingredient)
        }

        dismiss()
    }
}

private struct IngredientEditorRow: View {
    @Binding var draft: IngredientDraft

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            TextField("Ingredient (e.g. Gin)", text: $draft.name)
                .font(.headline)

            HStack(spacing: 8) {
                TextField("Amount", text: $draft.amountText)
                    .keyboardType(.decimalPad)
                    .textFieldStyle(.roundedBorder)
                    .frame(width: 72)

                Picker("Unit", selection: $draft.unit) {
                    ForEach(MeasureUnit.allCases) { unit in
                        Text(unit.label).tag(unit)
                    }
                }
                .pickerStyle(.segmented)
                .frame(maxWidth: 150)

                Spacer(minLength: 4)

                TextField("ABV", text: $draft.abvText)
                    .keyboardType(.decimalPad)
                    .multilineTextAlignment(.trailing)
                    .textFieldStyle(.roundedBorder)
                    .frame(width: 56)
                Text("%")
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 4)
    }
}
