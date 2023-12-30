import React from "react";
import { Button } from "./button";
import { Shared } from "./shared";

export interface BrowserItemButton {
    title: string;
    onClick: () => void;
}

export interface BrowserItem {
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    onDoubleClick?: () => void;
    buttons?: BrowserItemButton[];
    unimportant?: boolean;
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

export class Browser extends React.Component<BrowserProperties> {
    private initialSelection = React.createRef<HTMLDivElement>();

    constructor(props) {
        super(props);
    }

    public onClick(gi: number, ii: number): void {
        this.props.onSelectionChanged({ groupIndex: gi, itemIndex: ii });
    }

    public componentDidMount() {
        Shared.scrollElementIntoView(this.initialSelection.current, "center", true);
        document.querySelector<HTMLButtonElement>(".browserContent")?.focus?.();
    }

    public render(): React.ReactNode {
        const { groups } = this.props;
        const { groupIndex, itemIndex } = this.props.selection;
        const item = this.props.groups[groupIndex].items[itemIndex];

        return <div className={`browser ${this.props.className}`}>
            <div
                className="browserList"
                tabIndex={0}
                onKeyDown={(event) => {
                    const offset = Shared.keyToVerticalOffset[event.key];
                    if (offset) {
                        let { groupIndex, itemIndex } = this.props.selection;

                        itemIndex += offset;
                        if (itemIndex < 0) {
                            itemIndex = Infinity;
                            groupIndex--;
                        } else if (itemIndex >= this.props.groups[groupIndex].items.length) {
                            itemIndex = 0;
                            groupIndex++;
                        }

                        if (groupIndex >= 0 && groupIndex < this.props.groups.length) {
                            itemIndex = Math.min(this.props.groups[groupIndex].items.length - 1, itemIndex);
                            this.props.onSelectionChanged({ groupIndex, itemIndex });
                            event.preventDefault();
                        }
                    } else if (event.key === "Enter") {
                        let { groupIndex, itemIndex } = this.props.selection;
                        this.props.groups[groupIndex]?.items?.[itemIndex]?.onDoubleClick?.();
                        event.preventDefault();
                    }
                }}
                >{groups.map((g, gi) => <>
                <p>{g.title}</p>
                <div>
                    {g.items.map((i, ii) =>
                    <p
                        ref={(groupIndex === gi && itemIndex === ii) ? this.initialSelection : null}
                        className={((groupIndex === gi && itemIndex === ii) ? "selected" : "") + (i.unimportant ? " sub" : "")}
                        onDblClick={i.onDoubleClick}
                        onClick={() => this.onClick(gi, ii)}
                        tabIndex={-1}
                    >
                        {i.title}
                        {i.subtitle ? <><br/><span className="sub">{i.subtitle}</span></> : null}
                    </p>)}
                </div>
            </>)}</div>
            <div className="browserView">
                <div className="browserContent" tabIndex={0}>{this.props.children}</div>
                {
                    item.buttons
                        ? item.buttons.map(({ title, ...rest }) => <Button {...rest}>{title}</Button>)
                        : null
                }
            </div>
        </div>;
    }
}
