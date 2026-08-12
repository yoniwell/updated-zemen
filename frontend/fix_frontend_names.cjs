const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(dirPath);
  });
}

walk(srcDir, (filePath) => {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    content = content.replace(/middleName/g, 'fathersName');
    content = content.replace(/lastName/g, 'grandfathersName');
    content = content.replace(/Middle Name/g, 'Father Name');
    content = content.replace(/Last Name/g, 'Grandfather Name');
    content = content.replace(/ማእከላይ ስም/g, 'ስም ኣቦ');
    content = content.replace(/ናይ መወዳእታ ስም/g, 'ስም ኣባሓጎ');

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated: ${filePath}`);
    }
  }
});
