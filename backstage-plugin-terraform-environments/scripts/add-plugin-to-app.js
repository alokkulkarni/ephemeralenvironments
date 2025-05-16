const fs = require('fs');
const path = require('path');

// Try to find the Backstage app root (look for packages/app/src/plugins.ts)
function findAppPluginsFile() {
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const candidate = path.join(dir, 'packages', 'app', 'src', 'plugins.ts');
    if (fs.existsSync(candidate)) return candidate;
    dir = path.dirname(dir);
  }
  return null;
}

const pluginsFile = findAppPluginsFile();
if (!pluginsFile) {
  console.warn('[terraform-environments] Could not find packages/app/src/plugins.ts. Please add the plugin export manually.');
  process.exit(0);
}

const exportLine = `export { terraformEnvironmentsPlugin, TerraformEnvironmentsPage } from '@invincible/backstage-plugin-terraform-environments';\n`;
const fileContent = fs.readFileSync(pluginsFile, 'utf8');
if (!fileContent.includes('terraformEnvironmentsPlugin')) {
  fs.appendFileSync(pluginsFile, '\n' + exportLine);
  console.log('[terraform-environments] Added plugin export to plugins.ts');
} else {
  console.log('[terraform-environments] Plugin export already present in plugins.ts');
} 