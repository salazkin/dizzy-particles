class Point {
    constructor() {
        this.x = 0;
        this.y = 0;
    }
}
class Particles {
    constructor(totalParticles, loop, config, cb) {
        this.totalParticles = totalParticles;
        this.loop = loop;
        this.config = config;
        this.cb = cb;
        this.particles = [];
        this.time = 0;
        this.delay = 0;
        this.posStart = { x: 0, y: 0 };
        this.posEnd = { x: 0, y: 0 };
        this.curveLen = 20;
        this.curveSeg = 1 / (this.curveLen - 1);
        this.correctedTintArr = null;
        this.createParticles(totalParticles);
    }
    createParticles(totalParticles) {
        for (let i = 0; i < totalParticles; i++) {
            const particleResult = this.createParticle();
            particleResult.alpha = 0;
            const particleData = {
                result: particleResult,
                updated: false,
                delay: this.getDelay(),
                duration: this.getDuration(),
            };
            this.particles.push(particleData);
        }
    }
    createParticle() {
        return { x: 0, y: 0, alpha: 1, scaleX: 1, scaleY: 1, rotation: 0, tint: "0xffffff" };
    }
    update(dt) {
        const time = this.time;
        let count = 0;
        this.particles.forEach(particleData => {
            if (particleData.duration === 0) {
                count++;
                return;
            }
            const t = (time - particleData.delay) / particleData.duration;
            if (t >= 0 && t <= 1) {
                particleData.result.alpha = 1;
                if (!particleData.updated) {
                    particleData.updated = true;
                    this.updateParticleData(particleData);
                }
                this.updateResult(particleData, t);
            }
            else {
                particleData.updated = false;
                particleData.result.alpha = 0;
            }
            if (time >= particleData.delay + particleData.duration) {
                if (this.loop) {
                    particleData.duration = this.getDuration();
                    particleData.delay = this.getDelay();
                }
                else {
                    count++;
                    particleData.duration = 0;
                    particleData.result.alpha = 0;
                }
            }
        });
        this.delay = 0;
        this.time += dt;
        if (count >= this.particles.length) {
            this.onComplete();
        }
    }
    reset() {
        this.time = 0;
        this.delay = 0;
        this.particles.forEach(particleData => {
            particleData.updated = false;
            particleData.delay = this.getDelay(),
                particleData.duration = this.getDuration();
            if (particleData.result) {
                particleData.result.alpha = 0;
                particleData.result.x = 0;
                particleData.result.y = 0;
            }
        });
    }
    onComplete() {
        if (this.cb) {
            this.cb();
        }
    }
    set posStartX(value) {
        this.posStart.x = value;
    }
    set posStartY(value) {
        this.posStart.y = value;
    }
    set posEndX(value) {
        this.posEnd.x = value;
    }
    set posEndY(value) {
        this.posEnd.y = value;
    }
    setPosStart(x, y) {
        this.posStart.x = x;
        this.posStart.y = y;
    }
    setPosEnd(x, y) {
        this.posEnd.x = x;
        this.posEnd.y = y;
    }
    setData(config) {
        this.correctedTintArr = null;
        this.config = config;
    }
    getDuration() {
        return this.getValue("duration");
    }
    getDelay() {
        this.delay += this.getValue("delay");
        return this.time + this.delay;
    }
    updateParticleData(particleData) {
        const startX = this.posStart.x + this.getValue("posStartOffsetX");
        const startY = this.posStart.y + this.getValue("posStartOffsetY");
        const endX = this.posEnd.x + this.getValue("posEndOffsetX");
        const endY = this.posEnd.y + this.getValue("posEndOffsetY");
        particleData.posStart = { x: startX, y: startY };
        particleData.posEnd = { x: endX, y: endY };
        particleData.cp1 = null;
        particleData.cp2 = null;
        const cp1Mag = this.getValue("posControlPoint1Mag");
        const cp2Mag = this.getValue("posControlPoint2Mag");
        if (cp1Mag !== 0 || cp2Mag !== 0) {
            let dx = endX - startX;
            let dy = endY - startY;
            let ang = Math.atan2(dx, dy);
            let angle1 = ang + degreeToRadians(this.getValue("posControlPoint1Angle"));
            let angle2 = -(Math.PI - ang) + degreeToRadians(this.getValue("posControlPoint2Angle"));
            let dist = Math.sqrt(dx * dx + dy * dy);
            particleData.cp1 = { x: startX + Math.sin(angle1) * dist * cp1Mag, y: startY + Math.cos(angle1) * dist * cp1Mag };
            particleData.cp2 = { x: endX + Math.sin(angle2) * dist * cp2Mag, y: endY + Math.cos(angle2) * dist * cp2Mag };
            if (particleData.curve) {
                particleData.curve.length = 0;
            }
            else {
                particleData.curve = [];
            }
        }
        particleData.alphaFrom = this.getValue("alphaFrom");
        particleData.alphaTo = this.getValue("alphaTo");
        particleData.alphaYoYo = this.getValue("alphaYoYo");
        if (this.config.tint) {
            if (this.config.tintInterpolate && Array.isArray(this.config.tint) && this.config.tint.length > 1) {
                if (!this.correctedTintArr) {
                    this.correctedTintArr = getInterpolatedColors(this.config.tint, 5);
                }
                particleData.tint = this.correctedTintArr;
            }
            else {
                particleData.tint = this.getValue("tint");
            }
        }
        particleData.scaleFrom = this.getValue("scaleFrom");
        particleData.scaleTo = this.getValue("scaleTo");
        particleData.scaleYoYo = this.getValue("scaleYoYo");
        particleData.rotationSpeed = degreeToRadians(this.getValue("rotationSpeed"));
    }
    getValue(key) {
        if (Array.isArray(this.config[key])) {
            const arr = this.config[key];
            const index = arr.length > 1 ? Math.floor(Math.random() * arr.length) : 0;
            if (Array.isArray(arr[index])) {
                const min = arr[index][0];
                const max = arr[index][1];
                return Math.random() * (max - min) + min;
            }
            else {
                return arr[index];
            }
        }
        else {
            return this.config[key] || 0;
        }
    }
    updateResult(particleData, t) {
        const yoyoTime = t * (1 - t) * 2;
        const result = particleData.result;
        result.alpha = particleData.alphaFrom + (particleData.alphaTo - particleData.alphaFrom) * (particleData.alphaYoYo ? yoyoTime : t);
        result.scaleX = result.scaleY = interpolate(particleData.scaleYoYo ? yoyoTime : t, particleData.scaleFrom, particleData.scaleTo);
        if (particleData.curve) {
            const from = Math.floor(t / this.curveSeg);
            const to = from + 1;
            if (particleData.curve[from] === undefined) {
                particleData.curve[from] = from === 0 ? particleData.posStart : new Point();
            }
            if (particleData.curve[to] === undefined) {
                particleData.curve[to] = to === this.curveLen - 1 ? particleData.posEnd : new Point();
            }
            if (from !== 0) {
                setPositionOnCurve(particleData.curve[from], from * this.curveSeg, particleData.posStart, particleData.posEnd, particleData.cp1, particleData.cp2);
            }
            if (to !== this.curveLen - 1) {
                setPositionOnCurve(particleData.curve[to], to * this.curveSeg, particleData.posStart, particleData.posEnd, particleData.cp1, particleData.cp2);
            }
            setPositionOnLine(result, (t % this.curveSeg) / this.curveSeg, particleData.curve[from], particleData.curve[to]);
        }
        else {
            setPositionOnLine(result, t, particleData.posStart, particleData.posEnd);
        }
        if (particleData.rotationSpeed !== 0) {
            result.rotation += particleData.rotationSpeed;
        }
        else {
            result.rotation = 0;
        }
        if (particleData.tint) {
            if (Array.isArray(particleData.tint)) {
                const seg = 1 / (particleData.tint.length - 1);
                result.tint = particleData.tint[Math.floor(t / seg)];
            }
            else {
                result.tint = particleData.tint;
            }
        }
    }
    kill() {
        this.particles.length = 0;
        this.cb = null;
    }
}
const getInterpolatedColors = (hexArr, steps) => {
    const arr = hexArr.map(hex => hexToHsl(hex));
    const out = [];
    const step = 1 / steps;
    for (let i = 0; i < steps + 1; i++) {
        const t = Math.min(step * i, 1);
        const seg = 1 / (arr.length - 1);
        const index = Math.min(Math.floor(t / seg), arr.length - 2);
        const c1 = arr[index];
        const c2 = arr[index + 1];
        out.push(hslToHex(c1.map((c, i) => interpolate(t, c, c2[i], i === 0))));
    }
    return out;
};
const interpolate = (t, v1, v2, minDist) => {
    if (!minDist) {
        return v1 + (v2 - v1) * t;
    }
    const a = Math.min(v1, v2);
    const b = Math.max(v1, v2);
    const dist1 = b - a;
    const dist2 = 1 - b + a;
    if (dist1 < dist2) {
        return a + dist1 * t;
    }
    else {
        return (b + dist2 * t) % 1;
    }
};
const hexToHsl = (hex) => {
    const r = parseInt(hex.substring(hex.length - 6, hex.length - 4), 16) / 255;
    const g = parseInt(hex.substring(hex.length - 4, hex.length - 2), 16) / 255;
    const b = parseInt(hex.substring(hex.length - 2, hex.length), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let l = (max + min) / 2;
    let s = 0;
    let h = 0;
    if (max !== min) {
        const d = max - min;
        s = l < 0.5 ? d / (max + min) : d / (2 - max - min);
        if (r == max) {
            h = (g - b) / d + (g < b ? 6 : 0);
        }
        else if (g == max) {
            h = 2 + (b - r) / d;
        }
        else {
            h = 4 + (r - g) / d;
        }
    }
    h /= 6;
    return [h, s, l];
};
const hslToHex = (arr) => {
    let h = arr[0];
    let s = arr[1];
    let l = arr[2];
    let r, g, b;
    if (s == 0) {
        r = g = b = l;
    }
    else {
        let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        let p = 2 * l - q;
        r = Math.round(hueToRgb(h + 1 / 3, p, q) * 255);
        g = Math.round(hueToRgb(h, p, q) * 255);
        b = Math.round(hueToRgb(h - 1 / 3, p, q) * 255);
    }
    return "0x" + hexValue(r) + hexValue(g) + hexValue(b);
};
const hueToRgb = (t, p, q) => {
    if (t < 0) {
        t += 1;
    }
    if (t > 1) {
        t -= 1;
    }
    if (t < 1 / 6) {
        return p + (q - p) * 6 * t;
    }
    if (t < 1 / 2) {
        return q;
    }
    if (t < 2 / 3) {
        return p + (q - p) * (2 / 3 - t) * 6;
    }
    return p;
};
const hexValue = (v) => {
    return ("0" + v.toString(16)).slice(-2);
};
const degreeToRadians = (degrees) => {
    return degrees * Math.PI / 180;
};
const setPositionOnLine = (target, t, p0, p1) => {
    target.x = p0.x + (p1.x - p0.x) * t;
    target.y = p0.y + (p1.y - p0.y) * t;
};
const setPositionOnCurve = (target, t, p1, p2, cp1, cp2) => {
    const t2 = t * t;
    const t3 = t * t * t;
    target.x = Math.pow(1 - t, 3) * p1.x + 3 * Math.pow(1 - t, 2) * t * cp1.x + 3 * (1 - t) * t2 * cp2.x + t3 * p2.x;
    target.y = Math.pow(1 - t, 3) * p1.y + 3 * Math.pow(1 - t, 2) * t * cp1.y + 3 * (1 - t) * t2 * cp2.y + t3 * p2.y;
};

export { Particles };
//# sourceMappingURL=dizzy-particles.js.map
