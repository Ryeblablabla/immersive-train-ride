import * as THREE from 'three';
export function createSky(scene,panorama){
 const uniforms={panorama:{value:panorama},night:{value:0},time:{value:0},rain:{value:0}};
 const material=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms,
  vertexShader:`varying vec3 vDirection;void main(){vDirection=position;vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position=p.xyww;}`,
  fragmentShader:`
   precision highp float;
   varying vec3 vDirection;uniform sampler2D panorama;uniform float night;uniform float time;uniform float rain;
   float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   void main(){
    vec3 d=normalize(vDirection);
    vec2 uv=vec2(atan(d.z,d.x)*.159154943+.5,asin(clamp(d.y,-1.,1.))*.318309886+.5);
    uv.x=fract(uv.x+.207);vec3 photo=texture2D(panorama,uv).rgb*.44;
    vec3 dusk=mix(vec3(.30,.35,.42),vec3(.035,.075,.15),pow(max(d.y,0.),.4));
    vec3 color=mix(photo,dusk,night*.86);
    color=mix(color,vec3(dot(color,vec3(.2126,.7152,.0722)))*vec3(.77,.86,.92),rain*.64);
    if(d.y<0.)color=mix(color,vec3(.16,.22,.23),min(1.,-d.y*4.));
    float stars=pow(hash(floor(d.xz/(max(d.y,0.)+.1)*1600.)),270.)*smoothstep(.4,.8,night)*smoothstep(.16,.8,d.y);
    color+=stars*.25;gl_FragColor=vec4(color,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`});
 const mesh=new THREE.Mesh(new THREE.SphereGeometry(10000,48,24),material);mesh.renderOrder=-100;mesh.frustumCulled=false;scene.add(mesh);
 return {mesh,uniforms,update(t,progress,rain,yaw,camera){uniforms.time.value=t;uniforms.night.value=progress;uniforms.rain.value=rain?1:0;mesh.rotation.y=-yaw;mesh.position.copy(camera.position);}};
}
