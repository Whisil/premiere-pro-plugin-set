# Phase 0 validation results

Target host: Premiere Pro 25.6.4 on Apple Silicon macOS.

| Gate                                          | Status  | Evidence                                                       |
| --------------------------------------------- | ------- | -------------------------------------------------------------- |
| UXP batch effect transaction                  | pending | Requires UXP Developer Tool 2.2+ and signed Frame Gate bundle  |
| RGB Shift Metal + CPU fallback                | pending | Requires Adobe SDK headers and Xcode 16.2+                     |
| ProRes 4444 alpha round trip                  | pending | Renderer is implemented; Premiere/AME host test remains        |
| Generated MOGRT insertion/property inspection | pending | Authoring script is implemented; AE/Premiere host test remains |

Do not replace `pending` with `pass` without the date, exact build commit, test project, output location, timing, and reviewer.
