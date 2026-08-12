const fs = require('fs');
const lines = fs.readFileSync('C:\\Users\\HP\\.gemini\\antigravity\\brain\\b798d707-b6f4-4ee6-a80c-843b929be4da\\.system_generated\\logs\\transcript.jsonl', 'utf-8').split('\n');
for(const l of lines){
  if(!l) continue;
  const obj = JSON.parse(l);
  if(obj.type==='TOOL_RESPONSE' && obj.content.includes('ContentManager.tsx')){
    console.log(obj.content);
    break;
  }
}
