import Foundation

/// Units an ingredient can be entered in.
enum MeasureUnit: String, Codable, CaseIterable, Identifiable {
    case ml
    case oz
    case dash

    var id: String { rawValue }

    /// US fluid ounce.
    static let mlPerOz = 29.5735
    /// A dash from a standard bitters bottle is roughly 1/32 oz.
    static let mlPerDash = 0.92

    var mlPerUnit: Double {
        switch self {
        case .ml: 1
        case .oz: Self.mlPerOz
        case .dash: Self.mlPerDash
        }
    }

    var label: String { rawValue }

    func label(for amount: Double) -> String {
        if self == .dash && amount != 1 { return "dashes" }
        return label
    }

    /// e.g. "2 oz", "30 ml", "3 dashes"
    func display(_ amount: Double) -> String {
        "\(Fmt.number(amount)) \(label(for: amount))"
    }

    /// The matching batch unit, if there is one (dashes have no batch equivalent).
    var batchUnit: BatchUnit? {
        switch self {
        case .ml: .ml
        case .oz: .oz
        case .dash: nil
        }
    }
}

/// Units used for batch sizes and scaled output.
enum BatchUnit: String, CaseIterable, Identifiable {
    case ml
    case l = "L"
    case oz
    case gal

    var id: String { rawValue }

    var mlPerUnit: Double {
        switch self {
        case .ml: 1
        case .l: 1000
        case .oz: MeasureUnit.mlPerOz
        case .gal: 3785.41
        }
    }

    var label: String { rawValue }

    func display(ml: Double) -> String {
        "\(Fmt.number(ml / mlPerUnit)) \(label)"
    }
}
