import fs from 'fs';
import path from 'path';

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(dirPath);
  });
}

walk('./src', function(filePath) {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    // Replace full line console logs
    content = content.replace(/^[ \t]*console\.(log|error|warn)\(.*\);?[ \t]*$/gm, '');
    fs.writeFileSync(filePath, content);
  }
});

let serverContent = fs.readFileSync('server.ts', 'utf8');
serverContent = serverContent.replace(/^[ \t]*console\.(log|error|warn)\(.*\);?[ \t]*$/gm, '');
fs.writeFileSync('server.ts', serverContent);

console.log("Consoles cleaned.");
