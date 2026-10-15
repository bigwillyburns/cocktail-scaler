import Foundation
import SwiftData

@Model
final class Recipe {
    var name: String
    var notes: String
    /// Water added by shaking or stirring, as a percentage of the undiluted volume.
    var dilutionPercent: Double
    var createdAt: Date

    @Relationship(deleteRule: .cascade, inverse: \Ingredient.recipe)
    var ingredients: [Ingredient] = []

    init(name: String, notes: String = "", dilutionPercent: Double = 0) {
        self.name = name
        self.notes = notes
        self.dilutionPercent = dilutionPercent
        self.createdAt = .now
    }

    var sortedIngredients: [Ingredient] {
        ingredients.sorted { $0.position < $1.position }
    }

    var totalVolumeML: Double {
        CocktailMath.totalVolumeML(ingredients)
    }

    var abv: Double {
        CocktailMath.abv(of: ingredients)
    }

    var dilutedABV: Double {
        CocktailMath.abv(of: ingredients, dilutionPercent: dilutionPercent)
    }
}

@Model
final class Ingredient: AlcoholMeasurable {
    var name: String
    var amount: Double
    var unitRaw: String
    /// Alcohol by volume, 0–100.
    var abv: Double
    var position: Int
    var recipe: Recipe?

    init(name: String, amount: Double, unit: MeasureUnit, abv: Double, position: Int) {
        self.name = name
        self.amount = amount
        self.unitRaw = unit.rawValue
        self.abv = abv
        self.position = position
    }

    var unit: MeasureUnit {
        get { MeasureUnit(rawValue: unitRaw) ?? .ml }
        set { unitRaw = newValue.rawValue }
    }
}
