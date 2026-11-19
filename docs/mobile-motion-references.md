# Mobile motion design references
- Apple Human Interface Guidelines, Motion: https://developer.apple.com/design/human-interface-guidelines/motion
- Apple, Designing Fluid Interfaces (WWDC18): https://developer.apple.com/videos/play/wwdc2018/803/
- Apple, Animate with springs (WWDC23): https://developer.apple.com/videos/play/wwdc2023/10158/
- Apple, Sheets: https://developer.apple.com/design/human-interface-guidelines/sheets
- Apple, Tab bars: https://developer.apple.com/design/human-interface-guidelines/tab-bars
- Apple, Feedback: https://developer.apple.com/design/human-interface-guidelines/feedback
- WebKit, Individual Transform Properties: https://webkit.org/blog/11420/css-individual-transform-properties/
- MDN, touch-action: https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action
- MDN, prefers-reduced-motion: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
- web.dev, high-performance CSS animations: https://web.dev/articles/animations-guide

Design mapping: gesture continuity, velocity projection and resisted overshoot; preserve native clicks, map interactions and existing accessibility. Spring-like settling uses a bounded cubic curve (not a native UIKit simulation). Prefer composited translation and opacity. Keep motion short and respect reduced motion. Do not animate the entire map or add a second sheet animator.
