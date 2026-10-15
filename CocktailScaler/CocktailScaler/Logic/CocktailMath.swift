import Foundation

/// Anything with an amount, a unit and an ABV — saved ingredients and editor drafts alike.
protocol AlcoholMeasurable {
    var amount: Double { get }
    var unit: MeasureUnit { get }
    /// Alcohol by volume, 0–100.
    var abv: Double { get }
}

extension AlcoholMeasurable {
    var volumeML: Double { amount * unit.mlPerUnit }
    var alcoholML: Double { volumeML * abv / 100 }
}

enum CocktailMath {
    static func totalVolumeML<T: AlcoholMeasurable>(_ items: [T]) -> Double {
        items.reduce(0) { $0 + $1.volumeML }
    }

    static func totalAlcoholML<T: AlcoholMeasurable>(_ items: [T]) -> Double {
        items.reduce(0) { $0 + $1.alcoholML }
    }

    /// Final ABV (0–100) of the mixed drink. `dilutionPercent` adds water
    /// as a percentage of the undiluted volume (e.g. 20 for a stirred drink).
    static func abv<T: AlcoholMeasurable>(of items: [T], dilutionPercent: Double = 0) -> Double {
        let volume = totalVolumeML(items)
        guard volume > 0 else { return 0 }
        let dilutedVolume = volume * (1 + max(dilutionPercent, 0) / 100)
        return totalAlcoholML(items) / dilutedVolume * 100
    }

    /// Multiplier that turns one serving of `servingVolumeML` into `targetVolumeML`.
    static func scaleFactor(servingVolumeML: Double, targetVolumeML: Double) -> Double {
        guard servingVolumeML > 0, targetVolumeML > 0 else { return 0 }
        return targetVolumeML / servingVolumeML
    }
}
