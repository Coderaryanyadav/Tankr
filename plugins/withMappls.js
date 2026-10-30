const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo Config Plugin for Mappls (MapmyIndia) SDK
 * Automatically deploys .conf and .olf offline license files to native Android and iOS builds.
 */
const withMappls = (config) => {
  // 1. Android Mod: Copy .a.conf and .a.olf into android/app/
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const androidSrcDir = path.join(projectRoot, 'assets', 'mappls', 'android');
      const androidAppDir = path.join(config.modRequest.platformProjectRoot, 'app');

      if (fs.existsSync(androidSrcDir)) {
        const files = fs.readdirSync(androidSrcDir);
        for (const file of files) {
          if (file.endsWith('.a.conf') || file.endsWith('.a.olf')) {
            const src = path.join(androidSrcDir, file);
            const dest = path.join(androidAppDir, file);
            fs.copyFileSync(src, dest);
            console.log(`[withMappls] Android: Copied ${file} to android/app/`);
          }
        }
      }
      return config;
    },
  ]);

  // 2. iOS Mod: Copy .i.conf and .i.olf into ios/TANKR/ (Xcode app bundle)
  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const iosSrcDir = path.join(projectRoot, 'assets', 'mappls', 'ios');
      const iosAppDir = path.join(
        config.modRequest.platformProjectRoot,
        config.modRequest.projectName || 'TANKR'
      );

      if (fs.existsSync(iosSrcDir)) {
        if (!fs.existsSync(iosAppDir)) {
          fs.mkdirSync(iosAppDir, { recursive: true });
        }
        const files = fs.readdirSync(iosSrcDir);
        for (const file of files) {
          if (file.endsWith('.i.conf') || file.endsWith('.i.olf')) {
            const src = path.join(iosSrcDir, file);
            const dest = path.join(iosAppDir, file);
            fs.copyFileSync(src, dest);
            console.log(`[withMappls] iOS: Copied ${file} to ios/${config.modRequest.projectName || 'TANKR'}/`);
          }
        }
      }
      return config;
    },
  ]);

  return config;
};

module.exports = withMappls;
