# Third-party notices

This inventory covers direct runtime dependencies in the current source tree. Release packaging must include the complete corresponding license texts and a generated transitive dependency report.

| Component                      |             Version | License                                         | Use                                                        |
| ------------------------------ | ------------------: | ----------------------------------------------- | ---------------------------------------------------------- |
| React / React DOM              |              18.3.1 | MIT                                             | Panel UI                                                   |
| Spectrum Web Components button |              0.37.0 | Apache-2.0                                      | Panel UI control                                           |
| Zod                            |               4.1.8 | MIT                                             | Shared request validation                                  |
| resvg-js                       |               2.6.2 | MPL-2.0                                         | SVG rasterization                                          |
| d3-geo                         |               3.1.1 | ISC                                             | Map projections and paths                                  |
| topojson-client                |               3.1.0 | ISC                                             | Natural Earth topology decoding                            |
| world-atlas                    |               2.0.2 | ISC; Natural Earth source data is public domain | Country boundaries                                         |
| world-countries                |               5.1.0 | ODbL-1.0                                        | ISO identifiers and display names                          |
| FIGlet.js                      |               1.9.1 | MIT                                             | ASCII title glyph generation                               |
| FFmpeg                         | system installation | Build-dependent (LGPL/GPL configuration)        | ProRes 4444 encoding; not redistributed by this repository |

Basement Studio Shader Lab and Remotion are not included in the implementation. They may be used as visual references only until a source-level license review is recorded for any code proposed for reuse. No Motion Pro source or assets are used.

The ODbL database attribution for `world-countries` must accompany a packaged renderer that redistributes that database. Before a public release, legal/license review should decide whether to retain it or replace the two required fields with a purpose-built public-domain ISO table.
