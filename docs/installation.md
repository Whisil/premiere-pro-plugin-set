# Installing MoneyMoves Toolkit on macOS

This guide targets Premiere Pro 25.6.4 on Apple Silicon.

## Recommended: install the packaged panel without Creative Cloud Desktop

The current panel package is:

`artifacts/releases/MoneyMoves-Toolkit-0.9.0.ccx`

1. Quit Premiere Pro.
2. Open **Terminal**.
3. From the repository root, verify the package checksum:

   ```sh
   cd "/Users/davidgajdamaka/Desktop/code/moneymoves-plugin-set"
   cd artifacts/releases
   /usr/bin/shasum -a 256 -c MoneyMoves-Toolkit-0.9.0.ccx.sha256
   ```

   The result must end with `OK`.

4. Install the `.ccx` through Adobe's Unified Plugin Installer Agent. This is
   the supported command-line alternative when Creative Cloud Desktop does not
   open:

   ```sh
   UPIA="/Library/Application Support/Adobe/Adobe Desktop Common/RemoteComponents/UPI/UnifiedPluginInstallerAgent/UnifiedPluginInstallerAgent.app/Contents/macOS/UnifiedPluginInstallerAgent"
   CCX="/Users/davidgajdamaka/Desktop/code/moneymoves-plugin-set/artifacts/releases/MoneyMoves-Toolkit-0.9.0.ccx"
   sudo "$UPIA" --install "$CCX"
   ```

   Enter the macOS administrator password when prompted.

5. Start Premiere Pro, then open **Window → UXP Plugins → MoneyMoves Toolkit**.
   If Premiere was already running during installation, quit and reopen it.

The `.ccx` contains the UXP panel. Native video effects are installed into
Premiere's per-user MediaCore folder separately. From the repository root, run
the recipes for the effects you want:

```sh
just native-rgb-install
just native-frame-install
just native-halftone-install
just native-dot-matrix-install
just native-eight-bit-install
just native-dither-install
just native-chromatic-install
just native-barrel-blur-install
just native-bloom-install
```

Restart Premiere after installing native bundles. They are copied to:

`~/Library/Application Support/Adobe/Common/Plug-ins/7.0/MediaCore`

## Development fallback: UXP Developer Tool

Use this only for live reload or debugging. It is not a permanent installation.

1. Launch Premiere Pro 25.6.4 and **UXP Developer Tool 2.2 or later**.
2. Enable Developer Mode if prompted. If that fails, quit UDT and create
   `/Library/Application Support/Adobe/UXP/Developer/settings.json` containing:

   ```json
   { "developer": true }
   ```

3. In UDT, choose **Add Plugin** and select:

   `/Users/davidgajdamaka/Desktop/code/moneymoves-plugin-set/apps/panel`

4. In the Premiere Pro row, choose **Load** (or **Load & Watch** while coding).
5. In Premiere, open **Window → UXP Plugins → MoneyMoves Toolkit**.

UDT can load a plugin only while its host application is running. For normal
editing, use UPIA and close UDT.

## Troubleshooting

- **UXP Plugins is missing:** confirm Premiere is 25.6 or later, then restart it.
- **The panel is blank:** close any UDT-loaded copy, restart Premiere, and open
  the installed panel. If it remains blank, inspect UDT's Logs panel.
- **UPIA cannot be found:** repair Adobe Premiere/Creative Cloud; the executable
  should be at the path shown above.
- **Effects do not appear:** run the native recipes, restart Premiere, and check
  **Effects → Video Effects → MoneyMoves**.

Adobe's official reference documents `.ccx` installation and UPIA commands:
<https://developer.adobe.com/premiere-pro/uxp/plugins/distribution/install/>.
