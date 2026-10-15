import XCTest
@testable import CocktailScaler

private struct Item: AlcoholMeasurable {
    var amount: Double
    var unit: MeasureUnit
    var abv: Double
}

final class CocktailMathTests: XCTestCase {
    private let negroni = [
        Item(amount: 1, unit: .oz, abv: 40),   // gin
        Item(amount: 1, unit: .oz, abv: 24),   // Campari
        Item(amount: 1, unit: .oz, abv: 16),   // sweet vermouth
    ]

    func testEqualPartsABVIsAverage() {
        XCTAssertEqual(CocktailMath.abv(of: negroni), 26.667, accuracy: 0.001)
    }

    func testDilutionLowersABV() {
        XCTAssertEqual(CocktailMath.abv(of: negroni, dilutionPercent: 25), 21.333, accuracy: 0.001)
    }

    func testMixedUnits() {
        let oldFashioned = [
            Item(amount: 60, unit: .ml, abv: 50),    // bourbon
            Item(amount: 0.25, unit: .oz, abv: 0),   // syrup
            Item(amount: 2, unit: .dash, abv: 44.7), // bitters
        ]
        let volume = 60 + 0.25 * MeasureUnit.mlPerOz + 2 * MeasureUnit.mlPerDash
        let alcohol = 30 + 2 * MeasureUnit.mlPerDash * 0.447
        XCTAssertEqual(CocktailMath.totalVolumeML(oldFashioned), volume, accuracy: 0.0001)
        XCTAssertEqual(CocktailMath.abv(of: oldFashioned), alcohol / volume * 100, accuracy: 0.0001)
    }

    func testEmptyRecipeHasZeroABV() {
        XCTAssertEqual(CocktailMath.abv(of: [Item]()), 0)
    }

    func testScaleFactor() {
        let serving = CocktailMath.totalVolumeML(negroni)
        let factor = CocktailMath.scaleFactor(servingVolumeML: serving, targetVolumeML: 1000)
        XCTAssertEqual(serving * factor, 1000, accuracy: 0.0001)
        XCTAssertEqual(CocktailMath.scaleFactor(servingVolumeML: 0, targetVolumeML: 1000), 0)
    }

    func testParseAcceptsCommaDecimal() {
        XCTAssertEqual(Fmt.parse("1,5"), 1.5)
        XCTAssertEqual(Fmt.parse(" 0.75 "), 0.75)
        XCTAssertNil(Fmt.parse("abc"))
    }
}
