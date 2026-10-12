import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
// Execute the real scope-change handler, like the existing backup-handler harness.
const source=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const start=source.indexOf('function resetWorkspaceView()');
const end=source.indexOf('\ncloudWorkspace.subscribe',start);
test('switching workspace closes old private editors/artifacts and initializes baselines from the new scope',()=>{
 const resetCalls=[],revoked=[],dialogs=[];const next={owner:'B',draft:null};
 const env={data:{owner:'A',draft:{id:'A-private'}},document:{querySelectorAll:()=>[{close:()=>dialogs.push('closed')}]},
  photoUrls:['blob:A-photo'],backupUrl:'blob:A-json',photoBackupUrl:'blob:A-photos',restoreSafetyUrl:'blob:A-safety',URL:{revokeObjectURL:v=>revoked.push(v)},
  readData:()=>next,emptyData:()=>({owner:'empty'}),localDate:()=> '2026-10-10',backupState:{data:'A',photos:'A'},main:{replaceChildren:()=>resetCalls.push('clear DOM')},updateNavigation(){},render(){resetCalls.push('render');},
  drafts:{reset(){resetCalls.push(['draft baseline',env.data.owner]);}},sessionStore:{reset(){resetCalls.push(['session baseline',env.data.owner]);}},
  ...Object.fromEntries(['sessionUI','gymBuilder','plannerView','nutritionBatch','cookbook','journalRetrieval','accountRecoveryUI','accountImportUI'].map(name=>[name,{reset:()=>resetCalls.push(name)}])),myDay:{setDate:()=>resetCalls.push('myDay')}
 };
 for(const name of ['restorePreview','photoRestorePreview','editingFood','editingEntry','editingCheckin','editingCardio','editingKnee','editingPhoto','editingSavedMeal','editingRecipe','lifeSourceContext','daySourceContext','lifeReturnContext','sourceNavigationBaseline','restTimer','selectedExercise','view','nutritionSubView','journalSection','journalDate','progressSubView','journalReturnToResults','foodDateSelection','sourceFormBaseline'])env[name]='A-private';
 vm.runInNewContext(source.slice(start,end)+'\nresetWorkspaceView();',env);
 assert.equal(env.data.owner,'B');assert.deepEqual(resetCalls.filter(v=>Array.isArray(v)),[['draft baseline','B'],['session baseline','B']]);
 assert.deepEqual(revoked,['blob:A-photo','blob:A-json','blob:A-photos','blob:A-safety']);assert.deepEqual(dialogs,['closed']);
 for(const name of ['editingSavedMeal','editingRecipe','lifeSourceContext','daySourceContext','restorePreview','photoRestorePreview','backupUrl','photoBackupUrl','restoreSafetyUrl'])assert.equal(env[name],null);
 for(const name of ['sessionUI','gymBuilder','plannerView','nutritionBatch','cookbook','journalRetrieval','accountRecoveryUI','accountImportUI','clear DOM','render'])assert.ok(resetCalls.includes(name));
 assert.equal(env.view,'settings');assert.equal(env.journalDate,'2026-10-10');
});
