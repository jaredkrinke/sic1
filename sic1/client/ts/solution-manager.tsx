import { Component, ComponentChild, createRef } from "preact";
import { Button } from "./button";
import { PuzzleSolution, Sic1DataManager } from "./data-manager";
import { MessageBoxContent, MessageBoxBehavior } from "./message-box";
import { Shared } from "./shared";

interface InputSpanProperties {
    initialValue: string;
    onApply: (value: string) => void;
    onCancel: () => void;
}

class InputSpan extends Component<InputSpanProperties> {
    private span = createRef<HTMLSpanElement>();

    private cancel(): void {
        this.props.onCancel();
    }

    public componentDidMount(): void {
        const span = this.span.current;
        if (span) {
            span.focus();
            window.getSelection().selectAllChildren(span);
        }
    }

    public render() {
        return <span
            className="editable"
            ref={this.span}
            contentEditable={true}
            onKeyDown={(event) => {
                switch (event.key) {
                    case "Enter":
                        const value = this.span.current?.innerText;
                        if (value) {
                            this.props.onApply(value);
                        } else {
                            this.cancel();
                        }
                        event.preventDefault();
                        event.stopPropagation();
                        break;
                    
                    case "Escape":
                        this.cancel();
                        event.preventDefault();
                        event.stopPropagation();
                        break;
                }
            }}
            onBlur={() => {
                this.cancel();
            }}
            >
            {this.props.initialValue}
        </span>;
    }
}

export interface SolutionManagerProperties {
    puzzleTitle: string;
    solutionName?: string;
    onSelectionChanged: (solutionName?: string) => void;
    onOpen: (solutionName: string) => void;
    onShowMessageBox: (content: MessageBoxContent) => void;
    onCloseMessageBox: () => void;
}

interface SolutionManagerState {
    solutions: PuzzleSolution[];
    renaming: boolean;
}

function createUniqueSolutionName(name: string, state: SolutionManagerState): string {
    return Shared.createUniqueName(name, state.solutions.map(s => s.name));
}

export class SolutionManager extends Component<SolutionManagerProperties, SolutionManagerState> {
    private static readonly solutionNameMaxLength = 40;

    constructor(props) {
        super(props);

        const puzzleData = Sic1DataManager.getPuzzleData(this.props.puzzleTitle);
        this.state = {
            solutions: puzzleData.solutions ?? [],
            renaming: false,
        };
    }

    private persistIfNeeded(solutions: PuzzleSolution[]): void {
        const puzzleTitle = this.props.puzzleTitle;
        const puzzleData = Sic1DataManager.getPuzzleData(puzzleTitle);
        const stateString = JSON.stringify(solutions);
        if (JSON.stringify(puzzleData.solutions) !== stateString) {
            // Clone the object
            puzzleData.solutions = JSON.parse(stateString);
            Sic1DataManager.savePuzzleData(puzzleTitle);
        }
    }

    private onClick(solutionName: string): void {
        this.props.onSelectionChanged(solutionName);
    }

    private newSolution(): void {
        this.setState(state => {
            const name = createUniqueSolutionName(Shared.defaultSolutionName, state);
            const newState = {
                solutions: [
                    ...state.solutions,
                    { name },
                ],
                renaming: false,
            };

            this.persistIfNeeded(newState.solutions);
            this.props.onSelectionChanged(name);

            return newState;
        });
    }

    private copySolution(): void {
        this.setState(state => {
            const index = state.solutions.findIndex(s => s.name === this.props.solutionName);
            if (index >= 0) {
                const solution = state.solutions[index];
                const name = createUniqueSolutionName(solution.name, state);
                const newState = {
                    solutions: [
                        ...state.solutions.slice(0, index + 1),
                        {
                            ...solution,
                            name,
                        },
                        ...state.solutions.slice(index + 1),
                    ],
                    renaming: false,
                };

                this.persistIfNeeded(newState.solutions);
                this.props.onSelectionChanged(name);

                return newState;
            }
            return state;
        });
    }

    private sanitizeSolutionName(name: string): string {
        return name
            .split("\n")[0] // First line
            .trim() // Trimmed
            .substring(0, SolutionManager.solutionNameMaxLength) // Max size
        ;
    }

    private renameSolution(newNameRaw: string): void {
        this.setState(state => {
            const newName = this.sanitizeSolutionName(newNameRaw);
            const index = state.solutions.findIndex(s => s.name === this.props.solutionName);
            if (index >= 0) {
                const solution = state.solutions[index];
                if (newName && (newName !== solution.name)) {
                    const name = createUniqueSolutionName(newName, state)
                    const newState = {
                        solutions: [...state.solutions.slice(0, index), { ...solution, name }, ...state.solutions.slice(index + 1)],
                        renaming: false,
                    };

                    this.persistIfNeeded(newState.solutions);
                    this.props.onSelectionChanged(name);

                    return newState;
                }
            }

            return { renaming: false };
        });
    }

    private deleteSolution(): void {
        this.setState(state => {
            const index = state.solutions.findIndex(s => s.name === this.props.solutionName);
            if (index >= 0) {
                const solutions = state.solutions.filter(s => s.name !== this.props.solutionName);
                this.persistIfNeeded(solutions);
                this.props.onSelectionChanged(solutions[Math.min(index, solutions.length - 1)]?.name);

                return {
                    solutions,
                    renaming: false,
                };
            }

            return state;
        });
    }

    private showDeleteConfirmation(): void {
        this.props.onShowMessageBox({
            title: "Confirm Deletion",
            transparent: true,
            behavior: MessageBoxBehavior.keyboardNavigationForButtons,
            body: <>
                <p>Delete "{this.props.solutionName}"?</p>
                <Button onClick={() => {
                    this.deleteSolution();
                    this.props.onCloseMessageBox();
                }}>Delete</Button>
                <Button focusOnMount={true} onClick={() => this.props.onCloseMessageBox()}>Cancel</Button>
            </>,
        })
    }

    public render(): ComponentChild {
        return <>
            <div
                className="itemList"
                onKeyDown={(event) => {
                    const offset = Shared.keyToVerticalOffset[event.key];
                    if (offset) {
                        let index = this.state.solutions.findIndex(s => s.name === this.props.solutionName);
                        if (index >= 0) {
                            index += offset;
                            if (index >= 0 && index < this.state.solutions.length) {
                                this.props.onSelectionChanged(this.state.solutions[index].name);
                            }
                        }

                        event.preventDefault();
                    }
                }}
                >
                {this.state.solutions.map((solution) => <p
                    className={((this.props.solutionName) && (solution.name === this.props.solutionName)) ? "selected" : ""}
                    onDblClick={() => this.props.onOpen(solution.name)}
                    onClick={() => this.onClick(solution.name)}
                    onKeyDown={(event) => (event.key === "Enter" ? this.onClick(solution.name) : undefined)}
                    tabIndex={0}
                >
                    {(this.state.renaming && (solution.name === this.props.solutionName))
                        ? <InputSpan
                            initialValue={solution.name}
                            onApply={(value) => this.renameSolution(value)}
                            onCancel={() => this.setState({ renaming: false })}
                            />
                        : solution.name
                    }{(solution.solutionCycles && solution.solutionBytes) ? ` (cycles: ${solution.solutionCycles}, bytes: ${solution.solutionBytes})` : null}
                </p>)}
                {this.state.solutions.length <= 0
                    ? <p className="sub">(No files found)</p>
                    : null}
            </div>
            <div className="horizontalButtons">
                <Button onClick={() => this.newSolution()}>New</Button>
                <Button disabled={!this.props.solutionName} onClick={() => this.copySolution()}>Copy</Button>
                <Button disabled={!this.props.solutionName} onClick={() => this.setState({ renaming: true })}>Rename</Button>
                <Button disabled={!this.props.solutionName} onClick={() => this.showDeleteConfirmation()}>Delete</Button>
            </div>
        </>;
    }
}
