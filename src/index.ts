import { degreeToRadians, cubicBezierCurveInterpolate, lineInterpolate, hexToHsl, hslToHex, interpolate, shortPathInterpolate } from "dizzy-utils";

class Point {
    x: number = 0;
    y: number = 0;
};

type Vec3 = [number, number, number];

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
    tint: number;
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
    tint: number | number[];
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

    protected correctedTintArr: number[] | null = null;

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
                duration: this.getDuration()
            };
            this.particles.push(particleData as ParticleData);
        }
    }

    protected createParticle(): IParticleResult {
        return { x: 0, y: 0, alpha: 1, scaleX: 1, scaleY: 1, rotation: 0, tint: 0xffffff };
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
            const dx = endX - startX;
            const dy = endY - startY;
            const ang = Math.atan2(dx, dy);
            const angle1 = ang + degreeToRadians(this.getValue<number>("posControlPoint1Angle"));
            const angle2 = -(Math.PI - ang) + degreeToRadians(this.getValue<number>("posControlPoint2Angle"));

            const dist = Math.sqrt(dx * dx + dy * dy);

            particleData.cp1 = { x: startX + Math.sin(angle1) * dist * cp1Mag, y: startY + Math.cos(angle1) * dist * cp1Mag };
            particleData.cp2 = { x: endX + Math.sin(angle2) * dist * cp2Mag, y: endY + Math.cos(angle2) * dist * cp2Mag };
            if (particleData.curve) {
                particleData.curve.length = 0;
            } else {
                particleData.curve = [];
            }
        } else {
            particleData.curve = undefined;
        }

        particleData.alphaFrom = this.getValue<number>("alphaFrom");
        particleData.alphaTo = this.getValue<number>("alphaTo");
        particleData.alphaYoYo = this.getValue<boolean>("alphaYoYo");

        if (this.config.tint) {
            if (this.config.tintInterpolate && Array.isArray(this.config.tint) && this.config.tint.length > 1) {
                if (!this.correctedTintArr) {
                    this.correctedTintArr = getInterpolatedColors(this.config.tint, 10);
                }
                particleData.tint = this.correctedTintArr;
            } else {
                particleData.tint = parseInt(this.getValue<string>("tint"));
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
                cubicBezierCurveInterpolate(from * this.curveSeg, particleData.posStart, particleData.cp1, particleData.cp2, particleData.posEnd, particleData.curve[from]);
            }

            if (to !== this.curveLen - 1) {
                cubicBezierCurveInterpolate(to * this.curveSeg, particleData.posStart, particleData.cp1, particleData.cp2, particleData.posEnd, particleData.curve[to]);
            }

            lineInterpolate((t % this.curveSeg) / this.curveSeg, particleData.curve[from], particleData.curve[to], result);
        } else {
            lineInterpolate(t, particleData.posStart, particleData.posEnd, result);
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

const getInterpolatedColors = (hexArr: string[], steps: number): number[] => {
    const arr = hexArr.map(hex => hexToHsl(parseInt(hex)));
    const out: number[] = [];
    const step = 1 / steps;
    const seg = 1 / (arr.length - 1);

    for (let i = 0; i < steps + 1; i++) {
        const t = Math.min(step * i, 1);
        const index = Math.min(Math.floor(t / seg), arr.length - 2);
        const c1 = arr[index];
        const c2 = arr[index + 1];
        out.push(hslToHex(...c1.map((c, i) => shortPathInterpolate(t, c, c2[i])) as Vec3));
    }
    return out;
};

export { Particles, IParticleResult, ParticlesConfig };
