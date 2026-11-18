// Public artifact contains AES-256-GCM ciphertext only. No plaintext or key is logged.
import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {createReadStream,createWriteStream} from 'node:fs';
import {open,stat,unlink} from 'node:fs/promises';
import {pipeline} from 'node:stream/promises';
const [mode,input,output,sha]=process.argv.slice(2);
const raw=process.env.RELEASE_BUNDLE_KEY||'';
const key=Buffer.from(raw,'base64');
if (!/^[a-f0-9]{40}$/.test(sha||'')||key.length!==32||key.toString('base64')!==raw||!['seal','open'].includes(mode)) throw Error('Invalid release bundle configuration');
const aad=Buffer.from('dongjak-v911-release:'+sha);
try{
 if(mode==='seal'){
   const nonce=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,nonce);cipher.setAAD(aad);
   const fd=await open(output,'wx',0o600);await fd.write(nonce);await fd.close();
   await pipeline(createReadStream(input),cipher,createWriteStream(output,{flags:'a',mode:0o600}));
   const append=await open(output,'a');await append.write(cipher.getAuthTag());await append.close();
 }else{
   const size=(await stat(input)).size;if(size<29)throw Error('Invalid encrypted bundle');
   const fd=await open(input,'r'),nonce=Buffer.alloc(12),tag=Buffer.alloc(16);
   await fd.read(nonce,0,12,0);await fd.read(tag,0,16,size-16);await fd.close();
   const cipher=createDecipheriv('aes-256-gcm',key,nonce);cipher.setAAD(aad);cipher.setAuthTag(tag);
   await pipeline(createReadStream(input,{start:12,end:size-17}),cipher,createWriteStream(output,{flags:'wx',mode:0o600}));
 }
}catch{await unlink(output).catch(()=>{});throw Error('Release bundle operation failed');}
