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

interface Ghost extends Square {
    progress: number;
    style: SquareStyle;
}

interface Color {
    // All on range 0 - 1
    red: number;
    green: number;
    blue: number;
    opacity?: number;
}

interface SquareStyle {
    color: Color;
    filled: boolean;
}

export class Avoision extends Component<AvoisionProps> {
    private static readonly squareSize = 0.03;
    private static readonly minimumDistance = 0.3;
    private static readonly speed = 0.5;
    private static readonly pointsInitial = 15;
    private static readonly pointPeriodMS = 1000;
    private static readonly ghostPeriodMS = 400;

    private static readonly enemyStyle = { color: { red: 0, green: 0.5, blue: 0 }, filled: true };
    private static readonly goalStyle = { color: { red: 0, green: 1, blue: 0 }, filled: false };
    private static readonly playerStyle = { color: { red: 0, green: 1, blue: 0 }, filled: true };

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
    private ghosts: Ghost[] = [];

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

    private drawSquare(square: Square, style: SquareStyle, size = Avoision.squareSize): void {
        const { canvas } = this;
        const x = Math.round(square.x * this.width);
        const y = Math.round(square.y * this.height);
        const width = Math.round(size * this.width);
        const height = Math.round(size * this.height);
        const drawStyle = `rgba(${Math.round(style.color.red * 255)}, ${Math.round(style.color.green * 255)}, ${Math.round(style.color.blue * 255)}, ${style.color.opacity ?? 1})`;
        if (style.filled) {
            canvas.fillStyle = drawStyle;
            canvas.fillRect(x, y, width, height);
        } else {
            canvas.lineWidth = 2;
            canvas.strokeStyle = drawStyle;
            canvas.strokeRect(x, y, width, height);
        }
    }

    private drawGhost(ghost: Ghost): void {
        const scale = 1 + (2 * ghost.progress);
        this.drawSquare(
            {
                x: ghost.x - ((scale - 1) / 2) * Avoision.squareSize,
                y: ghost.y - ((scale - 1) / 2) * Avoision.squareSize,
            },
            {
                color: {
                    ...ghost.style.color,
                    opacity: 1 - ghost.progress,
                },
                filled: ghost.style.filled,
            },
            Avoision.squareSize * scale,
        );
    }

    private addGhost(square: Square, style: SquareStyle): void {
        this.ghosts.push({ ...square, style, progress: 0});
    }

    private resizeIfNeeded(): void {
        const element = this.canvasElement.current;
        const { width, height } = element.getBoundingClientRect();
        const devicePixelRatio = window.devicePixelRatio ?? 1;
        const canvasWidth = Math.ceil(width * devicePixelRatio);
        const canvasHeight = Math.ceil(height * devicePixelRatio);
        if (this.width !== canvasWidth || this.height !== canvasHeight) {
            element.style.width = `${Math.ceil(width)}px`;
            element.style.height = `${Math.ceil(height)}px`;
            element.width = canvasWidth;
            element.height = canvasHeight;
            this.width = canvasWidth;
            this.height = canvasHeight;
        }
    }

    private draw(): void {
        this.resizeIfNeeded();

        const { canvas } = this;

        canvas.fillStyle = "black";
        canvas.fillRect(0, 0, this.width, this.height);

        for (const g of this.ghosts) {
            this.drawGhost(g);
        }

        for (const e of this.enemies) {
            this.drawSquare(e, Avoision.enemyStyle);
        }

        this.drawSquare(this.goal, Avoision.goalStyle);

        if (this.player) {
            this.drawSquare(this.player, Avoision.playerStyle);
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
            this.addGhost(this.goal, Avoision.goalStyle);
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
                this.addGhost(this.player, Avoision.playerStyle);
                this.player = undefined;
                if (this.props.onGameOver) {
                    this.props.onGameOver(this.score);
                }
            }

            e[key] = p;
        }

        for (let i = 0; i < this.ghosts.length; i++) {
            const g = this.ghosts[i];
            g.progress += (deltaMS / Avoision.ghostPeriodMS);
            if (g.progress >= 1) {
                this.ghosts.splice(i--, 1);
            }
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
        this.ghosts.length = 0;
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
        return <canvas
            ref={this.canvasElement}
            className="avoision"
            tabIndex={0}
            onKeyUp={event => this.onKeyEvent(event, false)}
            onKeyDown={event => this.onKeyEvent(event, true)}
        ></canvas>;
    }
}
