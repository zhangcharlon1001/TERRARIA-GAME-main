function frac(x){return x-Math.floor(x)}
function hash2(x,y,s){
  return frac(Math.sin(x*127.1+y*311.7+s*74.7)*43758.5453);
}
function smoothstep(t){return t*t*(3-2*t)}
function vnoise(x,y,s){
  const xi=Math.floor(x),yi=Math.floor(y);
  const xf=x-xi,yf=y-yi;
  const a=hash2(xi,yi,s),b=hash2(xi+1,yi,s),c=hash2(xi,yi+1,s),d=hash2(xi+1,yi+1,s);
  const u=smoothstep(xf),v=smoothstep(yf);
  return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;
}
function fbm(x,y,s,oct){
  let v=0,amp=0.5,f=1;
  const n=oct||4;
  for(let i=0;i<n;i++){v+=amp*vnoise(x*f,y*f,s+i*17);f*=2;amp*=0.5}
  return v;
}