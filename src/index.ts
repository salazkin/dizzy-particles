class Point {
    x: number = 0;
    y: number = 0;
};

type ParticlesConfig = {
    duration?: Array<number | number[]> | number;
    delay?: Array<number | number[]> | number;
    posStartOffsetX?: Array<number | number[]> | number;
    posStartOffsetY?: Array<number | number[]> | number;
    posEndOffsetX?: Array<number | number[]> | number;
    posEndOffsetY?: Array<number | number[]> | number;
    posControlPoint1Mag?: Array<number | number[]> | number;
    posControlPoint1Angle?: Array<number | number[]> | number;
    posControlPoint2Mag?: Array<number | number[]> | number;
    posControlPoint2Angle?: Array<number | number[]> | number;
    scaleFrom?: Array<number | number[]> | number;
    scaleTo?: Array<number | number[]> | number;
    scaleYoYo?: boolean;
    rotationSpeed?: Array<number | number[]> | number;
    rotationFaceDir?: boolean;
    alphaFrom?: Array<number | number[]> | number;
    alphaTo?: Array<number | number[]> | number;
    alphaYoYo?: boolean;
    tint?: string[] | string;
    tintInterpolate?: boolean;
    additive?: boolean;
};

interface IParticleResult {
    x: number;
    y: number;
    alpha: number;
    scaleX: number;
    scaleY: number;
    rotation: number;
    tint: string;
}

type ParticleData = {
    posStart: Point;
    posEnd: Point;
    cp1: Point | null;
    cp2: Point | null;
    curve: Point[];
    alphaFrom: number;
    alphaTo: number;
    alphaYoYo: boolean;
    scaleFrom: number;
    scaleTo: number;
    scaleYoYo: boolean;
    rotationSpeed: number;
    tint: string | string[];
    updated: boolean;
    delay: number;
    duration: number;
    result: IParticleResult;
};

class Particles {
    public particles: ParticleData[] = [];
    protected time: number = 0;
    protected delay: number = 0;

    protected posStart: Point = { x: 0, y: 0 };
    protected posEnd: Point = { x: 0, y: 0 };
    protected curveLen: number = 20;
    protected curveSeg: number = 1 / (this.curveLen - 1);

    protected correctedTintArr: string[] | null = null;

    constructor(protected totalParticles: number, protected loop: boolean, protected config: ParticlesConfig, protected cb: () => void) {
        this.createParticles(totalParticles);
    }

    protected createParticles(totalParticles: number) {
        for (let i = 0; i < totalParticles; i++) {
            const particleResult = this.createParticle();
            particleResult.alpha = 0;

            const particleData: Partial<ParticleData> = {
                result: particleResult,
                updated: false,
                delay: this.getDelay(),
                duration: this.getDuration(),
            };
            this.particles.push(particleData as ParticleData);
        }
    }

    protected createParticle(): IParticleResult {
        return { x: 0, y: 0, alpha: 1, scaleX: 1, scaleY: 1, rotation: 0, tint: "0xffffff" };
    }

    public update(dt: number): void {
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
            } else {
                particleData.updated = false;
                particleData.result.alpha = 0;
            }

            if (time >= particleData.delay + particleData.duration) {
                if (this.loop) {
                    particleData.duration = this.getDuration();
                    particleData.delay = this.getDelay();
                } else {
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

    public reset(): void {
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

    protected onComplete(): void {
        if (this.cb) {
            this.cb();
        }
    }

    set posStartX(value: number) {
        this.posStart.x = value;
    }

    set posStartY(value: number) {
        this.posStart.y = value;
    }

    set posEndX(value: number) {
        this.posEnd.x = value;
    }

    set posEndY(value: number) {
        this.posEnd.y = value;
    }

    public setPosStart(x: number, y: number): void {
        this.posStart.x = x;
        this.posStart.y = y;
    }

    public setPosEnd(x: number, y: number): void {
        this.posEnd.x = x;
        this.posEnd.y = y;
    }

    public setData(config: ParticlesConfig): void {
        this.correctedTintArr = null;
        this.config = config;
    }

    protected getDuration(): number {
        return this.getValue<number>("duration");
    }

    protected getDelay(): number {
        this.delay += this.getValue<number>("delay");
        return this.time + this.delay;
    }

    protected updateParticleData(particleData: ParticleData): void {
        const startX = this.posStart.x + this.getValue<number>("posStartOffsetX");
        const startY = this.posStart.y + this.getValue<number>("posStartOffsetY");
        const endX = this.posEnd.x + this.getValue<number>("posEndOffsetX");
        const endY = this.posEnd.y + this.getValue<number>("posEndOffsetY");

        particleData.posStart = { x: startX, y: startY };
        particleData.posEnd = { x: endX, y: endY };
        particleData.cp1 = null;
        particleData.cp2 = null;

        const cp1Mag: number = this.getValue<number>("posControlPoint1Mag");
        const cp2Mag: number = this.getValue<number>("posControlPoint2Mag");

        if (cp1Mag !== 0 || cp2Mag !== 0) {
            let dx = endX - startX;
            let dy = endY - startY;
            let ang = Math.atan2(dx, dy);
            let angle1 = ang + degreeToRadians(this.getValue<number>("posControlPoint1Angle"));
            let angle2 = -(Math.PI - ang) + degreeToRadians(this.getValue<number>("posControlPoint2Angle"));

            let dist = Math.sqrt(dx * dx + dy * dy);

            particleData.cp1 = { x: startX + Math.sin(angle1) * dist * cp1Mag, y: startY + Math.cos(angle1) * dist * cp1Mag };
            particleData.cp2 = { x: endX + Math.sin(angle2) * dist * cp2Mag, y: endY + Math.cos(angle2) * dist * cp2Mag };
            if (particleData.curve) {
                particleData.curve.length = 0;
            } else {
                particleData.curve = [];
            }
        }

        particleData.alphaFrom = this.getValue<number>("alphaFrom");
        particleData.alphaTo = this.getValue<number>("alphaTo");
        particleData.alphaYoYo = this.getValue<boolean>("alphaYoYo");

        if (this.config.tint) {
            if (this.config.tintInterpolate && Array.isArray(this.config.tint) && this.config.tint.length > 1) {
                if (!this.correctedTintArr) {
                    this.correctedTintArr = getInterpolatedColors(this.config.tint, 5);
                }
                particleData.tint = this.correctedTintArr;
            } else {
                particleData.tint = this.getValue<string>("tint");
            }
        }

        particleData.scaleFrom = this.getValue<number>("scaleFrom");
        particleData.scaleTo = this.getValue<number>("scaleTo");
        particleData.scaleYoYo = this.getValue<boolean>("scaleYoYo");
        particleData.rotationSpeed = degreeToRadians(this.getValue<number>("rotationSpeed"));
    }

    protected getValue<T>(key: string): T {
        if (Array.isArray(this.config[key])) {
            const arr = this.config[key];
            const index = arr.length > 1 ? Math.floor(Math.random() * arr.length) : 0;
            if (Array.isArray(arr[index])) {
                const min = arr[index][0];
                const max = arr[index][1];
                return Math.random() * (max - min) + min;
            } else {
                return arr[index];
            }
        } else {
            return this.config[key] || 0;
        }
    }

    protected updateResult(particleData: ParticleData, t: number) {
        const yoyoTime = t * (1 - t) * 2;

        const result: IParticleResult = particleData.result;
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
        } else {
            setPositionOnLine(result, t, particleData.posStart, particleData.posEnd);
        }

        if (particleData.rotationSpeed !== 0) {
            result.rotation += particleData.rotationSpeed;
        } else {
            result.rotation = 0;
        }

        if (particleData.tint) {
            if (Array.isArray(particleData.tint)) {
                const seg = 1 / (particleData.tint.length - 1);
                result.tint = particleData.tint[Math.floor(t / seg)];
            } else {
                result.tint = particleData.tint;
            }
        }
    }

    public kill() {
        this.particles.length = 0;
        this.cb = null;
    }
}

const getRotationOnCurve = (t: number, p1: Point, p2: Point, cp1: Point, cp2: Point): number => {
    const t2 = t * t;
    const dx = 3 * Math.pow(1 - t, 2) * (cp1.x - p1.x) + 6 * (1 - t) * t * (cp2.x - cp1.x) + 3 * t2 * (p1.y - cp2.x);
    const dy = 3 * Math.pow(1 - t, 2) * (cp1.y - p1.y) + 6 * (1 - t) * t * (cp2.y - cp1.y) + 3 * t2 * (p2.y - cp2.y);
    return Math.atan2(dx, dy);
};

const hexToRgb = (color: string): number[] => {
    const arr: number[] = [];
    for (let i = 2; i >= 0; i--) {
        const c = color.substring(color.length - i * 2 - 2, color.length - i * 2);
        arr.push(parseInt(c, 16));
    }
    return arr;
};

const rgbToHex = (arr: number[], prefix: string): string => {
    return prefix + arr.map(v => hexValue(v)).join("");
};

const getInterpolatedColors = (hexArr: string[], steps: number): string[] => {
    const arr = hexArr.map(hex => hexToHsl(hex));
    const out: string[] = [];
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

const interpolate = (t: number, v1: number, v2: number, minDist?: boolean): number => {
    if (!minDist) {
        return v1 + (v2 - v1) * t;
    }
    const a = Math.min(v1, v2);
    const b = Math.max(v1, v2);
    const dist1 = b - a;
    const dist2 = 1 - b + a;
    if (dist1 < dist2) {
        return a + dist1 * t;
    } else {
        return (b + dist2 * t) % 1;
    }
};

const hexToHsl = (hex: string): number[] => {
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
        } else if (g == max) {
            h = 2 + (b - r) / d;
        } else {
            h = 4 + (r - g) / d;
        }
    }
    h /= 6;
    return [h, s, l]; //[0,1] range
};

const hslToHex = (arr: number[]): string => {
    let h = arr[0];
    let s = arr[1];
    let l = arr[2];
    let r, g, b;
    if (s == 0) {
        r = g = b = l;
    } else {
        let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        let p = 2 * l - q;

        r = Math.round(hueToRgb(h + 1 / 3, p, q) * 255);
        g = Math.round(hueToRgb(h, p, q) * 255);
        b = Math.round(hueToRgb(h - 1 / 3, p, q) * 255);
    }
    return "0x" + hexValue(r) + hexValue(g) + hexValue(b);
};

const hueToRgb = (t: number, p: number, q: number): number => {
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

const hexValue = (v: number): string => {
    return ("0" + v.toString(16)).slice(-2);
};

const degreeToRadians = (degrees: number): number => {
    return degrees * Math.PI / 180;
};

const radiansToDegree = (radians: number): number => {
    return radians * 180 / Math.PI;
};

const setPositionOnLine = (target: Point, t: number, p0: Point, p1: Point): void => {
    target.x = p0.x + (p1.x - p0.x) * t;
    target.y = p0.y + (p1.y - p0.y) * t;
};

const setPositionOnCurve = (target: Point, t: number, p1: Point, p2: Point, cp1: Point, cp2: Point): void => {
    const t2 = t * t;
    const t3 = t * t * t;
    target.x = Math.pow(1 - t, 3) * p1.x + 3 * Math.pow(1 - t, 2) * t * cp1.x + 3 * (1 - t) * t2 * cp2.x + t3 * p2.x;
    target.y = Math.pow(1 - t, 3) * p1.y + 3 * Math.pow(1 - t, 2) * t * cp1.y + 3 * (1 - t) * t2 * cp2.y + t3 * p2.y;
};

export { Particles, IParticleResult, ParticlesConfig };
