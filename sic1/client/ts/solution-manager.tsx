import React from "react";
import { Button } from "./button";
import { PuzzleSolution, Sic1DataManager } from "./data-manager";
import { MessageBoxContent, MessageBoxBehavior } from "./message-box";
import { Shared } from "./shared";

interface InputSpanProperties {
    initialValue: string;
    onApply: (value: string) => void;
    onCancel: () => void;
}

class InputSpan extends React.Component<InputSpanProperties> {
    private span = React.createRef<HTMLSpanElement>();

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

export class SolutionManager extends React.Component<SolutionManagerProperties, SolutionManagerState> {
    private static readonly solutionNameMaxLength = 40;

    private selectedItem = React.createRef<HTMLDivElement>();

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

    private isSolutionNameValid(name: string): boolean {
        return name && (name.indexOf("\n") === -1) && (name.length <= SolutionManager.solutionNameMaxLength);
    }

    private renameSolution(nameRaw: string): void {
        this.setState(state => {
            // Check for name change
            const name = nameRaw.trim();
            if (name !== this.props.solutionName) {
                // Check validity
                if (this.isSolutionNameValid(name)) {
                    // Check uniqueness
                    if (state.solutions.findIndex(s => s.name === name) === -1) {
                        const index = state.solutions.findIndex(s => s.name === this.props.solutionName);
                        if (index >= 0) {
                            const solution = state.solutions[index];
                            const newState = {
                                solutions: [...state.solutions.slice(0, index), { ...solution, name }, ...state.solutions.slice(index + 1)],
                                renaming: false,
                            };
        
                            this.persistIfNeeded(newState.solutions);
                            this.props.onSelectionChanged(name);
        
                            return newState;
                        }
                    } else {
                        this.props.onShowMessageBox({
                            title: "Name Already Exists",
                            transparent: true,
                            body: <p>A solution named "{name}" already exists.</p>,
                        });
                    }
                } else {
                    this.props.onShowMessageBox({
                        title: "Invalid Name",
                        transparent: true,
                        body: <p>Solution names must be at most {SolutionManager.solutionNameMaxLength} characters long, and only a single line.</p>,
                    });
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

    private moveSolution(offset: number): void {
        this.setState(state => {
            const index = state.solutions.findIndex(s => s.name === this.props.solutionName);
            const newIndex = index + offset;
            if ((index >= 0) && (newIndex >= 0) && (newIndex < this.state.solutions.length)) {
                const solutions = state.solutions.slice();
                const solution = solutions.splice(index, 1)[0];
                solutions.splice(newIndex, 0, solution);

                this.persistIfNeeded(solutions);

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

    public render(): React.ReactNode {
        return <>
            <div
                className="itemList"
                tabIndex={0}
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
                    } else if (event.key === "Enter") {
                        this.props.onOpen(this.props.solutionName);
                    }
                }}
                >
                {this.state.solutions.map((solution, index) => <p
                    ref={((this.props.solutionName) && (solution.name === this.props.solutionName)) ? this.selectedItem : undefined}
                    className={((this.props.solutionName) && (solution.name === this.props.solutionName)) ? "selected" : ""}
                    onDblClick={() => this.props.onOpen(solution.name)}
                    onClick={() => this.onClick(solution.name)}
                    tabIndex={-1}
                >
                    {(this.state.renaming && (solution.name === this.props.solutionName))
                        ? <InputSpan
                            initialValue={solution.name}
                            onApply={(value) => {
                                this.renameSolution(value);
                                this.selectedItem.current?.focus?.();
                            }}
                            onCancel={() => this.setState({ renaming: false })}
                            />
                        : solution.name
                    }{(solution.solutionCycles && solution.solutionBytes) ? ` (cycles: ${solution.solutionCycles}, bytes: ${solution.solutionBytes})` : null}
                    {(solution.name === this.props.solutionName)
                        ? <>
                            <div className="itemMoveContainer">
                                <Button className="itemMove" disabled={index <= 0} onClick={() => this.moveSolution(-1)}>↑</Button>
                                <Button className="itemMove" disabled={index >= this.state.solutions.length - 1} onClick={() => this.moveSolution(1)}>↓</Button>
                            </div>
                        </>
                        : null
                    }
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
