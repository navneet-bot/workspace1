const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.tsx')) results.push(file);
        }
    });
    return results;
}

const files = walk('/Users/mani/Documents/Projects/intern/Intern-Manager/next-app/app/dashboard');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    const target = `} catch (error) {
    console.error("SERVER COMPONENT ERROR:", error);
    throw error;
  }`;
    
    const replacement = `} catch (error: any) {
    if (error?.digest === "DYNAMIC_SERVER_USAGE" || error?.message?.includes("NEXT_REDIRECT")) {
      throw error;
    }
    console.error("SERVER COMPONENT ERROR:", error);
    throw error;
  }`;

    if (content.includes(target)) {
        content = content.replace(target, replacement);
        fs.writeFileSync(file, content, 'utf8');
        console.log("Updated", file);
    } else {
        const regex = /\} catch \(error\) \{\s+console\.error\("SERVER COMPONENT ERROR:", error\);\s+throw error;\s+\}/g;
        if (regex.test(content)) {
            content = content.replace(regex, replacement);
            fs.writeFileSync(file, content, 'utf8');
            console.log("Updated (regex)", file);
        }
    }
});
