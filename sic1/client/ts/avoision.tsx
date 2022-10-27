import { Component, ComponentChild, createRef } from "preact";

// TODO: Handle resizing
export interface AvoisionProps {
    initialWidthInPixels: number;
    initialHeightInPixels: number;
    onPointsUpdated?: (points: number) => void;
    onScoreUpdated?: (score: number) => void;
    onGameOver?: (score: number) => void;
}

type Control = "left" | "right" | "up" | "down";

const keyCodeToControl = {
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowUp: "up",
    ArrowDown: "down",
} as const;

interface Square {
    x: number;
    y: number;
}

interface Enemy extends Square {
    horizontal: boolean;
    positive: boolean;
}

export class Avoision extends Component<AvoisionProps> {
    private static readonly squareSize = 0.03;
    private static readonly minimumDistance = 0.3;
    private static readonly speed = 0.5;
    private static readonly pointsInitial = 15;
    private static readonly pointPeriodMS = 1000;

    private canvasElement = createRef<HTMLCanvasElement>();
    private canvas: CanvasRenderingContext2D;
    private width: number;
    private height: number;

    private onVisibilityChanged = () => this.handleVisibilityChange();
    private paused = true;
    private now: number;

    // Input handling
    private controlStates: Partial<{ [key in Control]: boolean }> = {};

    // Internal game state
    private started: boolean;
    private pointsTimer: number;
    private points: number;
    private score: number;
    private player: Square | undefined;
    private goal: Square;
    private enemies: Enemy[] = [];

    constructor(props) {
        super(props);
    }

    private setRandomPosition(square: Square): void {
        const px = this.player?.x ?? 0.5;
        const py = this.player?.y ?? 0.5;
        do {
            square.x = Math.random() * (1 - Avoision.squareSize);
            square.y = Math.random() * (1 - Avoision.squareSize);
        } while (Math.sqrt(Math.pow((square.x - px), 2) + Math.pow((square.y - py), 2)) < Avoision.minimumDistance);
    }

    private checkCollision(square: Square): boolean {
        if (this.player) {
            const ax1 = this.player.x;
            const ax2 = ax1 + Avoision.squareSize;
            const ay1 = this.player.y;
            const ay2 = ay1 + Avoision.squareSize;
            const bx1 = square.x;
            const bx2 = bx1 + Avoision.squareSize;
            const by1 = square.y;
            const by2 = by1 + Avoision.squareSize;
    
            return (((ax1 >= bx1 && ax1 <= bx2) || (ax2 >= bx1 && ax2 <= bx2) || (bx1 >= ax1 && bx1 <= ax2))
            && ((ay1 >= by1 && ay1 <= by2) || (ay2 >= by1 && ay2 <= by2) || (by1 >= ay1 && by1 <= ay2)));
        }
        return false;
    }

    private coinFlip(): boolean {
        return (Math.random() >= 0.5);
    }

    private spawn(): void {
        const e = { x: 0, y: 0 };
        this.setRandomPosition(e);
        this.enemies.push({
            ...e,
            horizontal: this.coinFlip(),
            positive: this.coinFlip(),
        });
    }

    private updatePoints(points: number): void {
        this.points = points;
        this.props.onPointsUpdated?.(points);
    }

    private updateScore(score: number): void {
        this.score = score;
        this.props.onScoreUpdated?.(score);
    }

    private drawSquare(square: Square, color: string, filled: boolean): void {
        const { canvas } = this;
        const x = square.x * this.width;
        const y = square.y * this.height
        const width = Avoision.squareSize * this.width;
        const height = Avoision.squareSize * this.height;
        if (filled) {
            canvas.fillStyle = color;
            canvas.fillRect(x, y, width, height);
        } else {
            canvas.lineWidth = 2;
            canvas.strokeStyle = color;
            canvas.strokeRect(x, y, width, height);
        }
    }

    private resizeIfNeeded(): void {
        const element = this.canvasElement.current;
        const { width, height } = element.parentElement.getBoundingClientRect();
        const devicePixelRatio = window.devicePixelRatio ?? 1;
        const canvasWidth = Math.round(width * devicePixelRatio);
        const canvasHeight = Math.round(height * devicePixelRatio);
        if (this.width !== canvasWidth || this.height !== canvasHeight) {
            element.style.width = `${Math.round(width)}px`;
            element.style.height = `${Math.round(height)}px`;
            element.width = canvasWidth;
            element.height = canvasHeight;
            this.width = canvasWidth;
            this.height = canvasHeight;
            this.props.onScoreUpdated?.(canvasWidth);
            this.props.onPointsUpdated?.(Math.round(width));
        }
    }

    private draw(): void {
        this.resizeIfNeeded();

        const { canvas } = this;

        canvas.fillStyle = "black";
        canvas.fillRect(0, 0, this.width, this.height);

        for (const e of this.enemies) {
            this.drawSquare(e, "green", true);
        }

        this.drawSquare(this.goal, "lime", false);

        if (this.player) {
            this.drawSquare(this.player, "lime", true);
        }
    }

    private update(deltaMS: number): void {
        const speed = Avoision.speed * deltaMS / 1000;
        if (this.player) {
            const vx = (this.controlStates["left"] ? -speed : 0) + (this.controlStates["right"] ? speed : 0);
            const vy = (this.controlStates["up"] ? -speed : 0) + (this.controlStates["down"] ? speed : 0);
            this.player.x = Math.max(0, Math.min(1 - Avoision.squareSize, this.player.x + vx));
            this.player.y = Math.max(0, Math.min(1 - Avoision.squareSize, this.player.y + vy));

            if (this.started) {
                this.pointsTimer += deltaMS;
                while (this.pointsTimer > Avoision.pointPeriodMS) {
                    this.pointsTimer -= Avoision.pointPeriodMS;
                    const points = Math.max(0, this.points - 1);
                    if (points !== this.points) {
                        this.updatePoints(points);
                    }
                }
            } else {
                this.started = (vx !== 0 || vy !== 0);
            }
        }

        if (this.checkCollision(this.goal)) {
            this.setRandomPosition(this.goal);
            this.updateScore(this.score + this.points);
            this.updatePoints(Avoision.pointsInitial);
            this.spawn();
        }

        for (const e of this.enemies) {
            const key = e.horizontal ? "x" : "y";
            const max = 1 - Avoision.squareSize;
            let p = e[key];
            if (e.positive) {
                p += speed;
                if (p > max) {
                    p = max - (p - max);
                    e.positive = false;
                }
            } else {
                p -= speed;
                if (p < 0) {
                    p = -p;
                    e.positive = true;
                }
            }

            if (this.checkCollision(e)) {
                this.player = undefined;
                if (this.props.onGameOver) {
                    this.props.onGameOver(this.score);
                }
            }

            e[key] = p;
        }
    }

    private pause(): void {
        this.paused = true;
    }

    private unpause(): void {
        this.paused = false;
        this.loop(false);
    }

    private loop(update = true): void {
        if (!this.paused) {
            const next = performance.now();
            if (update) {
                this.update(next - this.now);
            }

            this.now = next;
            this.draw();
            requestAnimationFrame(() => this.loop());
        }
    }

    private onKeyEvent(event: KeyboardEvent, down: boolean): void {
        const control = keyCodeToControl[event.code];
        if (control) {
            this.controlStates[control] = down;
            event.preventDefault();
        }
    }

    private handleVisibilityChange(): void {
        if (document.visibilityState === "visible") {
            if (this.paused) {
                this.unpause();
            }
        } else {
            if (!this.paused) {
                this.pause();
            }
        }
    }

    public focus(): void {
        this.canvasElement.current?.focus?.();
    }

    public reset(): void {
        this.started = false;
        this.now = performance.now();
        this.updateScore(0);
        this.player = { x: 0.5, y: 0.5 };
        this.goal = { x: 0, y: 0 };
        this.setRandomPosition(this.goal);
        this.pointsTimer = 0;
        this.updatePoints(Avoision.pointsInitial);
        this.enemies.length = 0;
    }

    public componentDidMount(): void {
        document.addEventListener("visibilitychange", this.onVisibilityChanged);

        // Graphics
        this.canvas = this.canvasElement.current.getContext("2d");

        // Event loop
        this.reset();
        this.unpause();

        this.canvasElement.current.focus();
    }

    public componentWillUnmount(): void {
        document.removeEventListener("visibilitychange", this.onVisibilityChanged);
        this.pause();
        this.canvas = undefined;        
    }

    public render(): ComponentChild {
        return <div className="avoisionParent">
            <canvas
                ref={this.canvasElement}
                className="avoision"
                tabIndex={0}
                onKeyUp={event => this.onKeyEvent(event, false)}
                onKeyDown={event => this.onKeyEvent(event, true)}
            ></canvas>
        </div>;
    }
}
