// Generated by dts-bundle-generator v4.3.0

declare class Point {
	x: number;
	y: number;
}
export declare type ParticlesConfig = {
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
export interface IParticleResult {
	x: number;
	y: number;
	alpha: number;
	scaleX: number;
	scaleY: number;
	rotation: number;
	tint: number;
}
export declare type ParticleData = {
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
export declare class Particles {
	protected totalParticles: number;
	protected loop: boolean;
	protected config: ParticlesConfig;
	protected cb: () => void;
	particles: ParticleData[];
	protected time: number;
	protected delay: number;
	protected posStart: Point;
	protected posEnd: Point;
	protected curveLen: number;
	protected curveSeg: number;
	protected correctedTintArr: number[] | null;
	constructor(totalParticles: number, loop: boolean, config: ParticlesConfig, cb: () => void);
	protected createParticles(totalParticles: number): void;
	protected createParticle(): IParticleResult;
	update(dt: number): void;
	reset(): void;
	protected onComplete(): void;
	set posStartX(value: number);
	set posStartY(value: number);
	set posEndX(value: number);
	set posEndY(value: number);
	setPosStart(x: number, y: number): void;
	setPosEnd(x: number, y: number): void;
	setData(config: ParticlesConfig): void;
	protected getDuration(): number;
	protected getDelay(): number;
	protected updateParticleData(particleData: ParticleData): void;
	protected getValue<T>(key: string): T;
	protected updateResult(particleData: ParticleData, t: number): void;
	kill(): void;
}

export {};
