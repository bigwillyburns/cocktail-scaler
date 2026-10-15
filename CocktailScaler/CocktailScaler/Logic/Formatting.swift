import Foundation

enum Fmt {
    /// Locale-aware number with up to `maxDigits` decimals, e.g. "1,250.5".
    static func number(_ value: Double, maxDigits: Int = 2) -> String {
        value.formatted(.number.precision(.fractionLength(0...maxDigits)))
    }

    static func percent(_ value: Double) -> String {
        number(value, maxDigits: 1) + "%"
    }

    /// Plain text suitable for putting back into an editable text field.
    static func editable(_ value: Double) -> String {
        value == value.rounded() ? String(Int(value)) : String(value)
    }

    /// Parses user input, accepting either "." or "," as the decimal separator.
    static func parse(_ text: String) -> Double? {
        let cleaned = text
            .trimmingCharacters(in: .whitespaces)
            .replacingOccurrences(of: ",", with: ".")
        guard let value = Double(cleaned), value.isFinite else { return nil }
        return value
    }
}
