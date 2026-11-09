import fs from 'node:fs/promises';import sharp from 'sharp';
const dir='public/assets/vegetation';await fs.mkdir(dir,{recursive:true});
for(const [id,name]of [['tree_small_02','tree-full'],['island_tree_02','tree-b-full'],['fir_tree_01','fir-full']]){
 const file=`${dir}/${name}.png`;try{await fs.access(file);}catch{const r=await fetch(`https://cdn.polyhaven.com/asset_img/primary/${id}.png?width=1280&height=1280&format=png`);if(!r.ok)throw Error(r.status);await fs.writeFile(file,Buffer.from(await r.arrayBuffer()));}}
const fir=await sharp(dir+'/fir-full.png').metadata();console.log('Fir render',fir.width,fir.height);
const images=[
 await sharp(dir+'/tree-full.png').trim().resize(1000,1000,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer(),
 await sharp(dir+'/tree-b-full.png').trim().resize(1000,1000,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer(),
 await sharp(dir+'/fir-full.png').extract({left:0,top:0,width:Math.round(fir.width*.39),height:fir.height}).trim().resize(1000,1000,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer(),
 await sharp(dir+'/fir-full.png').extract({left:0,top:0,width:Math.round(fir.width*.39),height:fir.height}).trim().flop().modulate({brightness:1.13,saturation:.9}).resize(1000,1000,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer()
];
await sharp({create:{width:2048,height:2048,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(images.map((input,i)=>({input,left:i%2*1024+12,top:(1-Math.floor(i/2))*1024+12}))).png().toFile(dir+'/forest-atlas.png');
console.log('CC0 Poly Haven artist renders -> four-species distant forest atlas');
