// MOCK / TEST ONLY. No credentials, JWTs, remote service or durable storage.
export function createMockProvider(){
  const issued=new WeakSet(), queue=[];
  const issue=identity=>{const value=Object.freeze({...identity});issued.add(value);return value;};
  return Object.freeze({kind:'synthetic',isIdentity:value=>value && issued.has(value),issue,
    beginLogin(scope,uid,lease){return new Promise((resolve,reject)=>queue.push({scope,uid,lease,resolve,reject}));},
    requests:()=>queue.map(({uid,lease})=>({uid,lease})),
    resolveNext(patch={}){const job=queue.shift();if(!job)throw Error('No mock request pending.');job.resolve(issue({environment:job.scope.environment,projectId:job.scope.projectId,uid:job.uid,assurance:'synthetic',...patch}));},
    rejectNext(error=Error('Mock failure')){const job=queue.shift();if(!job)throw Error('No mock request pending.');job.reject(error);}
  });
}
export function createMockWorkspaces(){
  const records=new Map();
  const key=scope=>JSON.stringify([scope.environment,scope.projectId,scope.uid,scope.deviceId]);
  return Object.freeze({kind:'synthetic-memory',read:scope=>({...records.get(key(scope))||{text:'',pending:false}}),
    write:(scope,candidate)=>records.set(key(scope),{...candidate})});
}
