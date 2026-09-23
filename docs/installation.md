# Installing MoneyMoves Toolkit on macOS

This guide targets Premiere Pro 25.6.4 on Apple Silicon.

Set this path once; the commands below reuse it:

```sh
UPIA="/Library/Application Support/Adobe/Adobe Desktop Common/RemoteComponents/UPI/UnifiedPluginInstallerAgent/UnifiedPluginInstallerAgent.app/Contents/macOS/UnifiedPluginInstallerAgent"
```

## Replace a blank panel

Premiere keeps a leftover copy until it is removed. Double-click
`Install MoneyMoves Toolkit.command` in the repository root. If Premiere or
UXP Developer Tool is open, the command pauses while you save your work and
fully quit both apps. Press Return in its Terminal window once they are
closed. This is the normal offline installation path and does not open
Creative Cloud or UXP Developer Tool.

The equivalent Terminal command is:

```sh
pnpm reinstall:panel
```

That command packages and verifies the current `.ccx`, preserves prior panel
copies and UXP storage under `artifacts/install-backups`, installs the verified
files, and updates Premiere's UXP registry. It does not require Creative Cloud
Desktop or UXP Developer Tool. It requests the macOS administrator password
because Adobe's production UXP folders are system-owned.

The double-click installer additionally verifies and installs the matching
`MoneyMoves-Native-Effects-<version>.zip`, which contains all 12 signed Apple
Silicon effects. For the same two-stage installation from Terminal, use:

```sh
pnpm reinstall:panel
pnpm install:native-release
```

Both commands require Premiere to be fully quit. The native installer verifies
the archive checksum, exact manifest, architecture, and every bundle signature
before changing MediaCore. If a copy fails, it restores the previous native
bundles from `artifacts/install-backups`.

The helper refuses to change installation files while Premiere or UXP
Developer Tool is open. The double-clickable command waits for you to quit
them; the direct `pnpm reinstall:panel` command exits instead. Both protect
unsaved projects and prevent stale plugin state from being restored.

## Alternative: install the packaged panel with Adobe UPIA

The current panel package is:

`artifacts/releases/MoneyMoves-Toolkit-0.15.1.ccx`

1. Quit Premiere Pro.
2. Open **Terminal**.
3. From the repository root, verify the package checksum:

   ```sh
   cd "/Users/davidgajdamaka/Desktop/code/moneymoves-plugin-set"
   cd artifacts/releases
   /usr/bin/shasum -a 256 -c MoneyMoves-Toolkit-0.15.1.ccx.sha256
   ```

   The result must end with `OK`.

4. Normally, install the `.ccx` through Adobe's Unified Plugin Installer Agent:

   ```sh
   CCX="/Users/davidgajdamaka/Desktop/code/moneymoves-plugin-set/artifacts/releases/MoneyMoves-Toolkit-0.15.1.ccx"
   sudo "$UPIA" --install "$CCX"
   ```

   Enter the macOS administrator password when prompted.

   UPIA can return error `-631` when Creative Cloud is signed out or cannot
   authorize the install. On this development Mac, use `pnpm reinstall:panel`
   instead while Creative Cloud Desktop is unavailable.

5. Start Premiere Pro, then open **Window → UXP Plugins → MoneyMoves Toolkit**.
   If Premiere was already running during installation, quit and reopen it.

The `.ccx` contains the UXP panel. The production native-effect archive is:

`artifacts/releases/MoneyMoves-Native-Effects-0.15.1.zip`

Developers can rebuild and verify it with:

```sh
pnpm package:native
pnpm verify:native-release
```

For an individual development bundle, the per-effect recipes remain available:

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
just native-progressive-blur-install
just native-crt-install
just native-ascii-install
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

3. Build the panel with `pnpm build:panel`, then in UDT choose **Add Plugin**
   and select:

   `/Users/davidgajdamaka/Desktop/code/moneymoves-plugin-set/apps/panel/dist/manifest.json`

   Do not add the `apps/panel` source tree. Premiere's UXP runtime cannot
   execute that module entry, so `#root` stays empty.

4. In the Premiere Pro row, choose **Load** (or **Load & Watch** while coding).
5. In Premiere, open **Window → UXP Plugins → MoneyMoves Toolkit**.

UDT can load a plugin only while its host application is running. For normal
editing, use the packaged/offline install and close UDT.

## Troubleshooting

- **UXP Plugins is missing:** confirm Premiere is 25.6 or later, then restart it.
- **The panel is blank / `#root` is empty:** quit Premiere, run
  `pnpm reinstall:panel`, then reopen Premiere. Close any UDT-loaded copy
  first. If you are debugging, load `apps/panel/dist`, not the source tree.
- **UPIA cannot be found:** repair Adobe Premiere/Creative Cloud; the executable
  should be at the path shown above.
- **Effects do not appear:** run the native recipes, restart Premiere, and check
  **Effects → Video Effects → MoneyMoves**.

Adobe's official reference documents `.ccx` installation and UPIA commands:
<https://developer.adobe.com/premiere-pro/uxp/plugins/distribution/install/>.
