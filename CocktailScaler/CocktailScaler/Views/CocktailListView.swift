import SwiftUI
import SwiftData

struct CocktailListView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: \Recipe.name) private var recipes: [Recipe]
    @State private var searchText = ""
    @State private var showingNewRecipe = false

    private var filteredRecipes: [Recipe] {
        guard !searchText.isEmpty else { return recipes }
        return recipes.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
    }

    var body: some View {
        NavigationStack {
            Group {
                if recipes.isEmpty {
                    ContentUnavailableView(
                        "No Cocktails Yet",
                        systemImage: "wineglass",
                        description: Text("Tap + to create your first recipe.")
                    )
                } else {
                    List {
                        ForEach(filteredRecipes) { recipe in
                            NavigationLink(value: recipe) {
                                RecipeRow(recipe: recipe)
                            }
                        }
                        .onDelete(perform: delete)
                    }
                    .searchable(text: $searchText, prompt: "Search cocktails")
                }
            }
            .navigationTitle("Cocktail List")
            .navigationDestination(for: Recipe.self) { recipe in
                RecipeDetailView(recipe: recipe)
            }
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showingNewRecipe = true
                    } label: {
                        Label("New Cocktail", systemImage: "plus")
                    }
                }
            }
            .sheet(isPresented: $showingNewRecipe) {
                RecipeEditorView(recipe: nil)
            }
        }
    }

    private func delete(at offsets: IndexSet) {
        let toDelete = offsets.map { filteredRecipes[$0] }
        toDelete.forEach(context.delete)
    }
}

private struct RecipeRow: View {
    let recipe: Recipe

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(recipe.name)
                .font(.headline)
            Text("\(recipe.ingredients.count) ingredients · \(Fmt.percent(recipe.abv)) ABV")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }
}
