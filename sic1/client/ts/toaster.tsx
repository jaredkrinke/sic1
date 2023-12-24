import React from "react";

export interface ToastInfo {
    image: HTMLImageElement;
    title: string;
    text?: string;
}

export interface ToastProps extends ToastInfo {
    onCompleted: () => void;
}

export class Toast extends React.Component<ToastProps> {
    private ref = React.createRef<HTMLDivElement>();
    private complete = () => this.props.onCompleted();

    public componentDidMount(): void {
        this.ref.current.addEventListener("animationend", this.complete);
    }

    public componentWillUnmount(): void {
        this.ref.current.removeEventListener("animationend", this.complete);
    }

    public render(): React.ReactNode {
        const { src, width, height } = this.props.image;
        const imageProps = { src, width, height };
        return <>
            <div ref={this.ref} className="toast">
                <img {...imageProps} />
                <section>
                    <header>{this.props.title}</header>
                    {this.props.text ? <p>{this.props.text}</p> : null}
                </section>
            </div>
        </>;
    }
}

export class Toaster extends React.Component<{}, { toast?: ToastInfo; queue: ToastInfo[] }> {
    constructor(props) {
        super(props);
        this.state = { queue: [] };
    }

    private advance(): void {
        this.setState(state => ({
            toast: state.queue[0],
            queue: [...state.queue.slice(1)],
        }));
    }

    public enqueue(toast: ToastInfo): void {
        this.setState(state => {
            if (state.toast) {
                return { queue: [...state.queue, toast ] };
            } else {
                return { toast };
            }
        });
    }

    public render(): React.ReactNode {
        const toast = this.state.toast;
        return toast
            ? <Toast
                key={`${toast.title};${toast.text};${toast.image.src}`}
                {...toast}
                onCompleted={() => this.advance()}
                />
            : null;
    }
}
