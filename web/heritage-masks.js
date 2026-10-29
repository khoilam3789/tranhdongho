
(function(root){
 'use strict';
 function geometry(kit,object){
  const xs=[object.points,...(object.extras||[])].flat().map(p=>p[0]),ys=[object.points,...(object.extras||[])].flat().map(p=>p[1]),x=Math.max(0,Math.min(...xs)-2),y=Math.max(0,Math.min(...ys)-2);
  const w=Math.min(kit.width,Math.max(...xs)+2)-x,h=Math.min(kit.height,Math.max(...ys)+2)-y,fitX=Math.min(1,kit.width/kit.height/1.5),fitY=Math.min(1,1.5/(kit.width/kit.height));
  return {x,y,w,h,width:w/kit.width*fitX*100,targetX:50+((x+w/2)/kit.width-.5)*fitX*100,targetY:50+((y+h/2)/kit.height-.5)*fitY*100};
 }
 function populate(assets,kits){
  const polygon=(object,color)=>[object.points,...(object.extras||[])].map(points=>'<polygon points="'+points.map(p=>p.join(',')).join(' ')+'" fill="'+color+'"/>').join('');
  for(const [id,kit]of Object.entries(kits)){
   const source=assets[kit.source],image='<image width="'+kit.width+'" height="'+kit.height+'" href="'+source+'"/>';
   const svg=(b,mask)=>'<svg xmlns="http://www.w3.org/2000/svg" width="'+b.w+'" height="'+b.h+'" viewBox="'+b.x+' '+b.y+' '+b.w+' '+b.h+'"><defs><mask id="shape" maskUnits="userSpaceOnUse" x="0" y="0" width="'+kit.width+'" height="'+kit.height+'">'+mask+'</mask></defs><g mask="url(#shape)">'+image+'</g></svg>';
   const encode=text=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(text);
   kit.objects.forEach((object,index)=>{const mask=polygon(object,'white')+kit.objects.slice(index+1).map(other=>polygon(other,'black')).join('');assets['generated/'+id+'-object-'+index+'.svg']=encode(svg(geometry(kit,object),mask));});
   assets['generated/'+id+'-background.svg']=encode(svg({x:0,y:0,w:kit.width,h:kit.height},'<rect width="'+kit.width+'" height="'+kit.height+'" fill="white"/>'+kit.objects.map(object=>polygon(object,'black')).join('')));
   if(kit.backgroundSource){
    const b=kit.backgroundImage;
    if(!assets[kit.backgroundSource])throw new Error('Missing supplied background');
    assets['generated/'+id+'-background.svg']=encode('<svg xmlns="http://www.w3.org/2000/svg" width="'+kit.width+'" height="'+kit.height+'" viewBox="0 0 '+kit.width+' '+kit.height+'"><image x="'+b.x+'" y="'+b.y+'" width="'+b.width+'" height="'+b.height+'" preserveAspectRatio="none" href="'+assets[kit.backgroundSource]+'"/></svg>');
   }

  }
 }
 root.DongHoObjectMasks={geometry,populate};
})(typeof window!=='undefined'?window:globalThis);
