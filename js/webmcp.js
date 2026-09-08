// Optional browser-native read access; no dependency in browsers without WebMCP.
export function registerRaceTool(read){
  if(!document.modelContext?.registerTool)return;
  const lifecycle=new AbortController();
  try{Promise.resolve(document.modelContext.registerTool({
    name:'read_duck_race',title:'Read the Duck Race',
    description:'Read the current public championship, monthly rankings and recent recognition feed.',
    inputSchema:{type:'object',properties:{},additionalProperties:false},
    annotations:{readOnlyHint:true,untrustedContentHint:true},
    async execute(input){if(input===null||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)throw new Error('Expected an empty object.');return read();}
  },{signal:lifecycle.signal})).catch(()=>{});}catch{}
  window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
