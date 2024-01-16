import "mocha";
import * as assert from "assert";
import { getBestLocale } from "../ts/language-default";

describe("Locale matcher should produce sane results", () => {
    const testLocales = [
        "en",
        "zh-Hant",
        "zh-Hans",
        "ru",
        "pt-BR",
    ];
    
    const tests = [
        // English tests
        [[], "en"],
        [["en-US"], "en"],
        [["en-GB"], "en"],

        // Test language fallback
        [["ru-RU"], "ru"],
        [["pt"], "pt-BR"],
        [["pt-PT"], "pt-BR"],
        [["pt-BR"], "pt-BR"],

        // Test Chinese handling
        [["zh-CN"], "zh-Hans"],
        [["zh-TW"], "zh-Hant"],
        [["zh-HK"], "zh-Hant"],
        [["zh-Hans-CN"], "zh-Hans"],
        [["zh-Hant-TW"], "zh-Hant"],
    ];

    for (const [desiredLocaleStrings, expectedResult] of tests) {
        it(`${desiredLocaleStrings} should match ${expectedResult}`, () => assert.strictEqual(getBestLocale(desiredLocaleStrings as string[], testLocales), expectedResult))
    }

    // And a tricky one
    it("Second choice is better than mismatched language", () => assert.strictEqual(getBestLocale(["zh-HK", "ru-HK"], ["zh-Hans", "ru"]), "ru"));
});
