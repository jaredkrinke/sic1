var elements = {
    inputSource: "input",
    inputLoad: "load",
    inputStep: "step",
    inputStop: "stop",
    stateSource: "source",
    stateMemory: "memory",
    stateRunning: "running",
    stateCycles: "cycles",
    stateBytes: "bytes",
    description: "description",
    io: "io",
    ioBody: "ioBody"
}

for (var name in elements) {
    if (name !== undefined) {
        elements[name] = document.getElementById(elements[name]);
    }
}

function clearChildren(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

function hexifyByte(v) {
    var str = v.toString(16);
    if (str.length == 1) {
        str = "0" + str;
    }
    return str;
}

// Highlighting helper
function ElementList() {
    this.groups = {};
    this.highlightedElements = [];
}

ElementList.prototype.add = function (groupName, index, element) {
    var group = this.groups[groupName];
    if (!group) {
        group = [];
        this.groups[groupName] = group;
    }

    group[index] = element;
};

ElementList.prototype.highlight = function (groupName, index, className) {
    var element = this.groups[groupName][index];
    element.classList.add(className);
    
    this.highlightedElements.push({
        groupName: groupName,
        index: index,
        className: className
    });
};

ElementList.prototype.clear = function () {
    for (var i = 0; i < this.highlightedElements.length; i++) {
        var item = this.highlightedElements[i];
        this.groups[item.groupName][item.index].classList.remove(item.className);
    }

    this.highlightedElements.length = 0;
};

ElementList.prototype.clearGroup = function (groupName) {
    var group = this.groups[groupName];
    if (group) {
        group.length = 0;
    }
};

var highlighter = new ElementList();

// Memory display
var memoryMap = [];
var columnSize = 16;
for (var i = 0; i < 256; i += columnSize) {
    var tr = document.createElement("tr");
    for (var j = 0; j < columnSize; j++) {
        var td = document.createElement("td");
        var textNode = document.createTextNode("00");
        td.appendChild(textNode);
        memoryMap[i + j] = {
            td: td,
            textNode: textNode
        };

        highlighter.add("memory", i + j, td);

        tr.appendChild(td);
    }

    elements.stateMemory.appendChild(tr);
}

// Puzzle
var puzzle = {
    description: "Read a number from @IN and write that number to @OUT",
    io: [
        [0, 0],
        [1, 1],
        [100, 100],
        [-1, -1]
    ]
};

function appendNumberOrArray(head, tail) {
    if (typeof(tail) === "number") {
        head.push(tail);
    } else {
        for (var i = 0; i < tail.length; i++) {
            head.push(tail[i]);
        }
    }
}

function createTd(text) {
    var td = document.createElement("td");
    td.appendChild(document.createTextNode((text !== undefined) ? text : ""));
    return td;
}

var inputBytes = [];
var expectedOutputBytes = [];
var ioInputMap = [];
var ioExpectedMap = [];
var ioActualMap = [];
function loadPuzzle(puzzle) {
    inputBytes.length = 0;
    expectedOutputBytes.length = 0;

    // TODO: Shuffle order
    for (var i = 0; i < puzzle.io.length; i++) {
        var row = puzzle.io[i];
        appendNumberOrArray(inputBytes, row[0]);
        appendNumberOrArray(expectedOutputBytes, row[1]);
    }

    var rowCount = Math.max(inputBytes.length, expectedOutputBytes.length);
    clearChildren(elements.ioBody);
    for (var i = 0; i < rowCount; i++) {
        var tr = document.createElement("tr");
        tr.appendChild(ioInputMap[i] = createTd((i < inputBytes.length) ? inputBytes[i] : undefined));
        tr.appendChild(ioExpectedMap[i] = createTd((i < expectedOutputBytes.length) ? expectedOutputBytes[i] : undefined));
        tr.appendChild(ioActualMap[i] = createTd());
        elements.ioBody.appendChild(tr);
    }

    elements.description.firstChild.nodeValue = puzzle.description;
}

// TODO: More than one puzzle
loadPuzzle(puzzle);

// State management
var StateFlags = {
    none: 0x0,
    running: 0x1,
    error: 0x2,
    done: 0x4
};

var state = StateFlags.none;
function setState(newState) {
    state = newState;

    var running = !!(state & StateFlags.running);
    elements.stateRunning.innerText = running ? "Running" : "Stopped";

    // Swap editor and source view
    if (running) {
        elements.inputSource.classList.add("hidden");
        elements.stateSource.classList.remove("hidden");
    } else {
        elements.inputSource.classList.remove("hidden");
        elements.stateSource.classList.add("hidden");
    }

    // Controls
    elements.inputLoad.disabled = running;
    elements.inputStop.disabled = !running;
    elements.inputStep.disabled = !running;
    // elements.inputRun.disabled = !running;
}

function setStateFlag(flag, on) {
    if (on === false) {
        setState(state & ~flag);
    } else {
        setState(state | flag);
    }
}

// Interpreter
var interpreter;
elements.inputLoad.onclick = function () {
    var sourceLines = elements.inputSource.value.split("\n");

    for (var i = 0; i < ioActualMap.length; i++) {
        ioActualMap[i].firstChild.nodeValue = "";
    }

    clearChildren(elements.stateSource);
    highlighter.clear();

    highlighter.clearGroup("source");
    for (var i = 0; i < sourceLines.length; i++) {
        var line = sourceLines[i];
        if (/\S/.test(line)) {
            var div = document.createElement("div");
            div.appendChild(document.createTextNode(line));
    
            highlighter.add("source", i, div);
            elements.stateSource.appendChild(div);
        } else {
            elements.stateSource.appendChild(document.createElement("br"));
        }
    }

    setState(StateFlags.none);

    var inputIndex = 0;
    var outputIndex = 0;
    interpreter = new Interpreter(
        (new Parser()).assemble(sourceLines),
        {
            readInput: function () {
                var value = (inputIndex < inputBytes.length) ? inputBytes[inputIndex] : 0;
                inputIndex++;
                return value;
            },

            writeOutput: function (value) {
                if (outputIndex < ioActualMap.length) {
                    ioActualMap[outputIndex++].firstChild.nodeValue = value;
                }
            },

            onWriteMemory: function (address, value) {
                memoryMap[address].textNode.nodeValue = hexifyByte(value);

                if (state & StateFlags.running) {
                    highlighter.highlight("memory", address, "modified");
                }
            },

            onStateUpdated: function (running, address, target, sourceLineNumber, source, cycles, bytes) {
                setStateFlag(StateFlags.running, running);

                elements.stateCycles.innerText = cycles;
                elements.stateBytes.innerText = bytes;

                // TODO: Use constants from lib
                highlighter.highlight("memory", target, "target");
                if (address < 256 - 3) {
                    highlighter.highlight("source", sourceLineNumber, "ip");
                    for (var i = address; i < address + 3; i++) {
                        highlighter.highlight("memory", i, "ip");
                    }
                }
            }
        }
    );
};

elements.inputStop.onclick = function () {
    setStateFlag(StateFlags.running, false);
};

elements.inputStep.onclick = function () {
    if (interpreter) {
        highlighter.clear();
        interpreter.step();
    }
};
