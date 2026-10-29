import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import vm from 'node:vm';

// Keep the local portable document intact. Cloud pages load binary media as
// separate immutable files so JavaScript never waits behind megabytes of data.
export async function externalizeCloudMedia(html,outputDirectory){
  const context=vm.createContext({window:{}});
  const scripts=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
  const isAssets=body=>/^\s*window\.__ASSETS\s*=/.test(body);
  const isCatalog=body=>/^\s*window\.DONGHO_CATALOG\s*=/.test(body);
  for(const [,attributes,body]of scripts){
    if(isAssets(body)||isCatalog(body)||/id="(?:motion-assets|heritage-data|object-mask-data)"/.test(attributes))vm.runInContext(body,context,{timeout:10000});
  }
  const original=context.window.__ASSETS,content=context.window.HERITAGE_REQUIREMENTS;
  if(!original||!content)throw new Error('Cloud media requires the complete learning catalogue.');
  await mkdir(path.join(outputDirectory,'media'),{recursive:true});
  const cache=new Map();
  async function emit(uri){
    if(!uri.startsWith('data:'))return uri;
    if(cache.has(uri))return cache.get(uri);
    const comma=uri.indexOf(','),header=uri.slice(5,comma),type=header.split(';')[0];
    const extensions={'image/png':'png','image/jpeg':'jpg','image/jpg':'jpg','image/webp':'webp','image/gif':'gif','image/svg+xml':'svg','video/mp4':'mp4'};
    if(comma<0||!extensions[type])throw new Error('Unsupported embedded media type: '+type);
    const bytes=header.includes(';base64')?Buffer.from(uri.slice(comma+1),'base64'):Buffer.from(decodeURIComponent(uri.slice(comma+1)),'utf8');
    const name=createHash('sha256').update(bytes).digest('hex').slice(0,24)+'.'+extensions[type];
    await writeFile(path.join(outputDirectory,'media',name),bytes);
    const url='/media/'+name;cache.set(uri,url);return url;
  }
  const assets={};for(const [key,value]of Object.entries(original))assets[key]=await emit(value);
  const json=value=>JSON.stringify(value).replace(/</g,'\\u003c');
  html=html.replace(/<script([^>]*)>([\s\S]*?)<\/script>/g,(all,attributes,body)=>{
    if(isAssets(body))return '<script>window.__ASSETS='+json(assets)+';</script>';
    if(attributes.includes('id="motion-assets"')||attributes.includes('id="object-mask-data"'))return '';
    // SVG crops above are emitted as self-contained SVG files, preserving their
    // embedded original PNG. Do not rebuild them with external nested images.
    if(attributes.includes('id="heritage-data"'))return '<script id="heritage-data">window.HERITAGE_REQUIREMENTS='+json(content)+';</script>';
    return all;
  });
  const binary=/data:(?:image\/(?:png|jpeg|jpg|webp|gif|svg\+xml)|video\/mp4);base64,[A-Za-z0-9+/=]+/g;
  for(const uri of new Set([...html.matchAll(binary)].map(match=>match[0])))await emit(uri);
  html=html.replace(binary,uri=>cache.get(uri));
  return {html,mediaCount:new Set(cache.values()).size};
}
