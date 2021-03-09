import { degreeToRadians, interpolate, cubicBezierCurveInterpolate, lineInterpolate, hexToHsl, hslToHex, angleInterpolate } from 'dizzy-utils';

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
                duration: this.getDuration()
            };
            this.particles.push(particleData);
        }
    }
    createParticle() {
        return { x: 0, y: 0, alpha: 1, scaleX: 1, scaleY: 1, rotation: 0, tint: 0xffffff };
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
            const dx = endX - startX;
            const dy = endY - startY;
            const ang = Math.atan2(dx, dy);
            const angle1 = ang + degreeToRadians(this.getValue("posControlPoint1Angle"));
            const angle2 = -(Math.PI - ang) + degreeToRadians(this.getValue("posControlPoint2Angle"));
            const dist = Math.sqrt(dx * dx + dy * dy);
            particleData.cp1 = { x: startX + Math.sin(angle1) * dist * cp1Mag, y: startY + Math.cos(angle1) * dist * cp1Mag };
            particleData.cp2 = { x: endX + Math.sin(angle2) * dist * cp2Mag, y: endY + Math.cos(angle2) * dist * cp2Mag };
            if (particleData.curve) {
                particleData.curve.length = 0;
            }
            else {
                particleData.curve = [];
            }
        }
        else {
            particleData.curve = undefined;
        }
        particleData.alphaFrom = this.getValue("alphaFrom");
        particleData.alphaTo = this.getValue("alphaTo");
        particleData.alphaYoYo = this.getValue("alphaYoYo");
        if (this.config.tint) {
            if (this.config.tintInterpolate && Array.isArray(this.config.tint) && this.config.tint.length > 1) {
                if (!this.correctedTintArr) {
                    this.correctedTintArr = getInterpolatedColors(this.config.tint, 10);
                }
                particleData.tint = this.correctedTintArr;
            }
            else {
                particleData.tint = parseInt(this.getValue("tint"));
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
                cubicBezierCurveInterpolate(from * this.curveSeg, particleData.posStart, particleData.cp1, particleData.cp2, particleData.posEnd, particleData.curve[from]);
            }
            if (to !== this.curveLen - 1) {
                cubicBezierCurveInterpolate(to * this.curveSeg, particleData.posStart, particleData.cp1, particleData.cp2, particleData.posEnd, particleData.curve[to]);
            }
            lineInterpolate((t % this.curveSeg) / this.curveSeg, particleData.curve[from], particleData.curve[to], result);
        }
        else {
            lineInterpolate(t, particleData.posStart, particleData.posEnd, result);
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
    const arr = hexArr.map(hex => hexToHsl(parseInt(hex)));
    const out = [];
    const step = 1 / steps;
    const seg = 1 / (arr.length - 1);
    for (let i = 0; i < steps + 1; i++) {
        const t = Math.min(step * i, 1);
        const index = Math.min(Math.floor(t / seg), arr.length - 2);
        const c1 = arr[index];
        const c2 = arr[index + 1];
        out.push(hslToHex(...c1.map((c, i) => angleInterpolate(t, c, c2[i], 1))));
    }
    return out;
};

export { Particles };
//# sourceMappingURL=dizzy-particles.js.map
