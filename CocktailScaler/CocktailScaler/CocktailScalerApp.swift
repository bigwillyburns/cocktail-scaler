import SwiftUI
import SwiftData

@main
struct CocktailScalerApp: App {
    var body: some Scene {
        WindowGroup {
            CocktailListView()
        }
        .modelContainer(for: [Recipe.self, Ingredient.self])
    }
}
