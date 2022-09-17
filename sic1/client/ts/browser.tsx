import { Component, ComponentChild, createRef } from "preact";
import { Sic1DataManager, UserData } from "./data-manager";
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

export interface BrowserGroup<Item extends BrowserItem> {
    title: string;
    items: Item[];
}

export interface BrowserIndices {
    groupIndex: number;
    itemIndex: number;
}

export interface BrowserProperties<Item extends BrowserItem> {
    groups: BrowserGroup<Item>[];
    initial: BrowserIndices;
    className: string;
    renderItem: (item: Item, data: UserData) => ComponentChild;
}

interface BrowserState {
    selected: BrowserIndices;
}

export class Browser<Item extends BrowserItem> extends Component<BrowserProperties<Item>, BrowserState> {
    private initialSelection = createRef<HTMLDivElement>();
    private data = Sic1DataManager.getData();

    constructor(props) {
        super(props);
        this.state = { selected: this.props.initial };
    }

    public componentDidMount() {
        Shared.scrollElementIntoView(this.initialSelection.current, "center");
    }

    public render(): ComponentChild {
        const { groups } = this.props;
        const { groupIndex, itemIndex } = this.state.selected;
        const item = this.props.groups[groupIndex].items[itemIndex];

        return <div className={`browser ${this.props.className}`}>
            <div className="browserList">{groups.map((g, gi) => <>
                <p>{g.title}</p>
                <div>
                    {g.items.map((i, ii) => <div ref={(groupIndex === gi && itemIndex === ii) ? this.initialSelection : null} className={(groupIndex === gi && itemIndex === ii) ? "selected" : ""} onDblClick={i.onDoubleClick} onClick={() => this.setState({ selected: { groupIndex: gi, itemIndex: ii }})}>
                        <p>{i.title}</p>
                        {i.subtitle ? <p class="sub">{i.subtitle}</p> : null}
                    </div>)}
                </div>
            </>)}</div>
            <div className="browserView">
                <div>{this.props.renderItem(item, this.data)}</div>
                {
                    item.buttons
                        ? item.buttons.map(b => <button onClick={() => b.onClick()}>{b.title}</button>)
                        : null
                }
            </div>
        </div>;
    }
}
