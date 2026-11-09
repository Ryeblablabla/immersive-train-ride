export const ROUTE_LENGTH = 7800;
export const STOPS = [{ name: '榆川', at: 0 }, { name: '白鹭湾', at: ROUTE_LENGTH }];
export const LANDMARKS = [
  { at: 0, name: '榆川站', note: '风从站台的另一端吹来。' },
  { at: 430, name: '离开小城', note: '把今天还没做完的事，先留在身后。' },
  { at: 1250, name: '河谷草甸', note: '草叶倒向风经过的方向。' },
  { at: 2050, name: '旧江大桥', note: '桥下的水，也正去往它的远方。' },
  { at: 3050, name: '杉林山谷', note: '走进山里，河声变得很近。' },
  { at: 4200, name: '穿过青山', note: '短暂的黑暗，把车厢变成一座小岛。' },
  { at: 4750, name: '山的另一面', note: '出来的时候，天色已经不一样了。' },
  { at: 6100, name: '白鹭湖', note: '可以再看一会儿。还没有到站。' },
  { at: 7300, name: '即将抵达', note: '离别总比想象中来得轻。' },
];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export function routeX(s) { return Math.sin(s / 1100) * 62 + Math.sin(s / 470) * 13; }
export function routeYaw(s) { return -Math.atan(Math.cos(s / 1100) * 62 / 1100 + Math.cos(s / 470) * 13 / 470); }
export function routeEnvironment(s) {
  const tunnel = smoothstep(4190, 4220, s) * (1 - smoothstep(4620, 4650, s));
  const bridge = smoothstep(2040, 2050, s) * (1 - smoothstep(2320, 2340, s));
  const lake = smoothstep(5200, 5900, s);
  return { tunnel, bridge, lake, night: smoothstep(500, ROUTE_LENGTH, s) };
}
export class Journey {
  constructor() { this.reset(); }
  reset() { this.distance = 0; this.speed = 0; this.acceleration = 0; this.phase = 'platform'; this.elapsed = 0; this.dwell = 0; this.lastJoint = -1; }
  board() { if (this.phase === 'platform') { this.phase = 'boarding'; this.dwell = 10; return true; } return false; }
  depart() { if (this.phase === 'boarding') { this.dwell = 0; this.phase = 'running'; return true; } return false; }
  alight() { if (this.phase === 'arrived') { this.phase = 'complete'; return true; } return false; }
  update(dt) {
    dt = clamp(dt, 0, 0.12); this.elapsed += dt;
    if (this.phase === 'boarding') { this.dwell -= dt; if (this.dwell <= 0) this.depart(); }
    if (this.phase !== 'running' && this.phase !== 'braking') { this.acceleration = 0; return; }
    const remaining = ROUTE_LENGTH - this.distance;
    const target = Math.min(18.4, Math.sqrt(Math.max(0, 2 * 0.37 * (remaining - 0.1))));
    if (remaining < 500) this.phase = 'braking';
    const oldSpeed = this.speed;
    this.speed += clamp(target - this.speed, -0.42 * dt, 0.48 * dt);
    this.acceleration = (this.speed - oldSpeed) / Math.max(dt, 0.0001);
    this.distance = Math.min(ROUTE_LENGTH, this.distance + (oldSpeed + this.speed) * 0.5 * dt);
    if (remaining < 0.3 && this.speed < 0.5) { this.distance = ROUTE_LENGTH; this.speed = 0; this.acceleration = 0; this.phase = 'arrived'; }
  }
  get progress() { return this.distance / ROUTE_LENGTH; }
  get environment() { return routeEnvironment(this.distance); }
  get landmark() { return [...LANDMARKS].reverse().find(l => this.distance >= l.at) || LANDMARKS[0]; }
  get doorsOpen() { return ['platform', 'boarding', 'arrived', 'complete'].includes(this.phase); }
}
export function suspension(distance, speed, acceleration, time, amount = 1) {
  const intensity = Math.min(speed / 12, 1);
  const rail = Math.sin(distance * 2 * Math.PI / 25);
  const pulse = Math.pow(Math.max(0, Math.cos(distance * 2 * Math.PI / 25)), 22);
  return {
    y: amount * intensity * (Math.sin(distance * 0.82) * 0.006 + Math.sin(distance * 1.73) * 0.002 + pulse * 0.008),
    roll: amount * intensity * (Math.sin(distance * 0.18) * 0.0032 + Math.sin(distance * 0.41) * 0.0012),
    pitch: amount * (intensity * rail * 0.0016 - acceleration * 0.009),
    body: amount * intensity * Math.sin(time * 4.2) * 0.004,
    joint: pulse * intensity,
  };
}
