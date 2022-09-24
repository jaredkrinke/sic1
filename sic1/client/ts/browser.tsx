import { Component, ComponentChild, createRef } from "preact";
import { Shared } from "./shared";

export interface BrowserItemButton {
    title: string;
    onClick: () => void;
}

export interface BrowserItem {
    title: string;
    subtitle?: ComponentChild;
    onDoubleClick?: () => void;
    buttons?: BrowserItemButton[];
}

export interface BrowserGroup {
    title: string;
    items: BrowserItem[];
}

export interface BrowserIndices {
    groupIndex: number;
    itemIndex: number;
}

export interface BrowserProperties {
    groups: BrowserGroup[];
    selection: BrowserIndices;
    className: string;
    onSelectionChanged: (selection: BrowserIndices) => void;
}

export class Browser extends Component<BrowserProperties> {
    private initialSelection = createRef<HTMLDivElement>();

    constructor(props) {
        super(props);
    }

    public onClick(gi: number, ii: number): void {
        this.props.onSelectionChanged({ groupIndex: gi, itemIndex: ii });
    }

    public componentDidMount() {
        Shared.scrollElementIntoView(this.initialSelection.current, "center");
    }

    public render(): ComponentChild {
        const { groups } = this.props;
        const { groupIndex, itemIndex } = this.props.selection;
        const item = this.props.groups[groupIndex].items[itemIndex];

        return <div className={`browser ${this.props.className}`}>
            <div className="browserList">{groups.map((g, gi) => <>
                <p>{g.title}</p>
                <div>
                    {g.items.map((i, ii) =>
                    <p
                        ref={(groupIndex === gi && itemIndex === ii) ? this.initialSelection : null}
                        className={(groupIndex === gi && itemIndex === ii) ? "selected" : ""}
                        onDblClick={i.onDoubleClick}
                        onClick={() => this.onClick(gi, ii)}
                        onKeyUp={(event) => (event.key === "Enter" ? this.onClick(gi, ii) : undefined)}
                        tabIndex={0}
                    >
                        {i.title}
                        {i.subtitle ? <><br/><span class="sub">{i.subtitle}</span></> : null}
                    </p>)}
                </div>
            </>)}</div>
            <div className="browserView">
                <div>{this.props.children}</div>
                {
                    item.buttons
                        ? item.buttons.map(b => <button onClick={() => b.onClick()}>{b.title}</button>)
                        : null
                }
            </div>
        </div>;
    }
}
