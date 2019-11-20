var elements = {
    messageBox: "messageBox",
    messageTitle: "messageTitle",
    messageBody: "messageBody",
    messageClose: "messageClose",
    messageApplyLink: "messageApplyLink",
    messageInputName: "messageInputName",
    messageWelcomeName: "messageWelcomeName",
    messageFirstLink: "messageFirstLink",
    messageNextLink: "messageNextLink",
    messageError: "messageError",
    contentSuccessCharts: "contentSuccessCharts",
    contentWelcome: "contentWelcome",
    contentWelcome2: "contentWelcome2",
    contentSuccess: "contentSuccess",
    contentCompilationError: "contentCompilationError",
    contentSelect: "contentSelect",
    dimmer: "dimmer",
    puzzleList: "puzzleList",
    inputSource: "input",
    inputLoad: "load",
    inputStep: "step",
    inputRun: "run",
    inputStop: "stop",
    inputMenu: "menu",
    stateSource: "source",
    stateMemory: "memory",
    stateRunning: "running",
    stateCycles: "cycles",
    stateBytes: "bytes",
    stateVariables: "variables",
    stateVariablesBody: "variablesBody",
    title: "title",
    description: "description",
    io: "io",
    ioBody: "ioBody"
}

function loadElements(root) {
    for (var name in root) {
        if (name !== undefined) {
            if (typeof(root[name]) === "string") {
                root[name] = document.getElementById(root[name]);
            } else {
                loadElements(root[name]);
            }
        }
    }
}

loadElements(elements);

// Create charts
var chartTemplate = $(".chart");
var charts = {};
elements.contentSuccessCharts.appendChild((charts.cycles = chartTemplate.clone().removeClass("hidden")).get(0));
elements.contentSuccessCharts.appendChild((charts.bytes = chartTemplate.clone().removeClass("hidden")).get(0));

function clearChildren(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

function hideChildren(element) {
    for (var i = 0; i < element.childNodes.length; i++) {
        var classList = element.childNodes[i].classList;
        if (classList) {
            classList.add("hidden");
        }
    }
}

function hexifyByte(v) {
    var str = v.toString(16);
    if (str.length == 1) {
        str = "0" + str;
    }
    return str;
}

// Reporting
function createEnum(values) {
    var o = {
        _names: []
    };

    for (var i = 0; i < values.length; i++) {
        var index = i + 1;
        o[values[i]] = index;
        o._names[index] = values[i];
    }

    return o;
}

var ga = ga || function () {};
function reportEvent(category, action, label, value) {
    var event = {
        hitType: 'event',
        eventCategory: category,
        eventAction: action
    };

    if (label !== undefined) {
        event.eventLabel = label;
    }

    if (value !== undefined) {
        event.eventValue = value;
    }

    ga('send', event);
}

var PuzzleEvent = createEnum([
    "view",
    "stats_cycles",
    "stats_bytes",
    "success"
]);

function reportPuzzleEvent(puzzleTitle, puzzleEvent, value) {
    reportEvent("puzzle", PuzzleEvent._names[puzzleEvent], puzzleTitle, value);
}

function reportPuzzleViewed(puzzleTitle) {
    reportPuzzleEvent(puzzleTitle, PuzzleEvent.view);
}

function reportPuzzleCompleted(puzzleTitle, solvedCount, cycles, bytes) {
    reportPuzzleEvent(puzzleTitle, PuzzleEvent.success, solvedCount);
    reportPuzzleEvent(puzzleTitle, PuzzleEvent.stats_cycles, cycles);
    reportPuzzleEvent(puzzleTitle, PuzzleEvent.stats_bytes, bytes);
}

var userIdLength = 15;
function generateUserId() {
    var characters = "abcdefghijklmnopqrstuvwxyz";
    var id = "";
    for (var i = 0; i < userIdLength; i++) {
        id += characters[Math.floor(Math.random() * characters.length)];
    }
    return id;
}

// Peristent state
function createDefaultPersistentState() {
    return {
        userId: undefined,
        name: undefined,
        introCompleted: false,
        solvedCount: 0,
        currentPuzzle: undefined
    };
}

function createDefaultPuzzlePersistentState() {
    return {
        unlocked: false,
        viewed: false,
        solved: false,
        solutionCycles: undefined,
        solutionBytes: undefined,
    
        code: null
    };
}

var persistentStateCache = {};
function loadPersistentObjectWithDefault(key, defaultObjectCreator) {
    var persistentState = persistentStateCache[key];
    if (!persistentState) {
        try {
            var str = localStorage.getItem(key);
            if (str) {
                persistentState = JSON.parse(str);
            }
        } catch (e) {}
    
        persistentState = persistentState || defaultObjectCreator();
        persistentStateCache[key] = persistentState;
    }

    return persistentState;
}

function savePersistentObject(key) {
    try {
        localStorage.setItem(key, JSON.stringify(persistentStateCache[key]));
    } catch (e) {} // Work around Edge bug...
}

var persistentStateKey = "sic1_";
function loadPersistentState() {
    var state = loadPersistentObjectWithDefault(persistentStateKey, createDefaultPersistentState);

    // Ensure user id and name are populated
    state.userId = (state.userId && state.userId.length === userIdLength) ? state.userId : generateUserId();
    state.name = (state.name && state.name.length > 0) ? state.name.slice(0, 50) : "Bill";

    return state;
}

function savePersistentState() {
    savePersistentObject(persistentStateKey);
}

function getPuzzlePersistentStateKey(title) {
    return "sic1_Puzzle_" + title;
}

function loadPuzzlePersistentState(title) {
    return loadPersistentObjectWithDefault(getPuzzlePersistentStateKey(title), createDefaultPuzzlePersistentState);
}

function savePuzzlePersistentState(title) {
    savePersistentObject(getPuzzlePersistentStateKey(title));
}

// Message box
var messageBoxOpen = false;
var modalMessageBoxOpen = false;
function showMessage(title, element, modal) {
    clearChildren(elements.messageTitle);
    elements.messageTitle.appendChild(document.createTextNode(title));
    hideChildren(elements.messageBody);
    element.classList.remove("hidden");
    elements.messageBox.classList.remove("hidden");
    elements.dimmer.classList.remove("hidden");

    messageBoxOpen = true;
    modalMessageBoxOpen = modal;
    if (modalMessageBoxOpen) {
        elements.messageClose.classList.add("hidden");
    } else {
        elements.messageClose.classList.remove("hidden");
    }
}

function closeMessageBox() {
    elements.messageBox.classList.add("hidden");
    elements.dimmer.classList.add("hidden");
    messageBoxOpen = false;
    modalMessageBoxOpen = false;
}

elements.messageClose.onclick = function () {
    if (!modalMessageBoxOpen) {
        closeMessageBox();
    }
};

elements.messageApplyLink.onclick = function (e) {
    e.preventDefault();

    var name = elements.messageInputName.value;
    if (name.length > 0) {
        var persistentState = loadPersistentState();
        persistentState.name = name;
        savePersistentState();

        elements.messageInputName.classList.remove("attention");

        showWelcome2();
    } else {
        elements.messageInputName.classList.add("attention");
    }
};

elements.messageFirstLink.onclick = function (e) {
    e.preventDefault();

    var persistentState = loadPersistentState();
    persistentState.introCompleted = true;
    savePersistentState();

    loadPuzzle(puzzles[0].list[0]);
    closeMessageBox();
};

elements.messageNextLink.onclick = function (e) {
    e.preventDefault();
    showPuzzleList();
};

elements.dimmer.onclick = function () {
    if (!modalMessageBoxOpen) {
        closeMessageBox();
    }
};

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

ElementList.prototype.highlight = function (groupName, index, className, durable) {
    var element = this.groups[groupName][index];
    element.classList.add(className);
    
    this.highlightedElements.push({
        groupName: groupName,
        index: index,
        durable: durable,
        className: className
    });
};

ElementList.prototype.clear = function (includeDurable) {
    var newList = [];
    for (var i = 0; i < this.highlightedElements.length; i++) {
        var item = this.highlightedElements[i];
        if (includeDurable || !item.durable) {
            this.groups[item.groupName][item.index].classList.remove(item.className);
        } else {
            newList.push(item);
        }
    }

    this.highlightedElements = newList;
};

ElementList.prototype.deleteGroup = function (groupName) {
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
var puzzles = [];
puzzles.push({
    groupTitle: "Tutorial",
    list: [
        {
            title: "Subleq Instruction and Output",
            minimumSolvedToUnlock: 0,
            description: "Use subleq and input/output to negate an input and write it out.",
            code:
      "; The SIC-1 is an 8-bit computer with 256 bytes of memory.\n"
    + "; Programs are written in SIC-1 Assembly Language.\n"
    + "; Each instruction is 3 bytes, specified as follows:\n"
    + "; \n"
    + ";   subleq <A> <B> [<C>]\n"
    + "; \n"
    + "; A, B, and C are memory addresses (0 - 255) or labels.\n"
    + "; \n"
    + "; \"subleq\" subtracts the value at address B from the\n"
    + "; value at address A and stores the result at address A\n"
    + "; (i.e. mem[A] = mem[A] - mem[B]).\n"
    + "; \n"
    + "; If the result is <= 0, execution branches to address C.\n"
    + "; \n"
    + "; Note that if C is not specified, the address of the next\n"
    + "; instruction is used (in other words, the branch does\n"
    + "; nothing).\n"
    + "; \n"
    + "; For convenience, addresses can be specified using labels.\n"
    + "; The following predefined lables are always available:\n"
    + "; \n"
    + ";   @MAX (252): Maximum user-modifiable address\n"
    + ";   @IN (253): Reads a value from input (writes are ignored)\n"
    + ";   @OUT (254): Writes a result to output (reads as zero)\n"
    + ";   @HALT (255): Terminates the program when executed\n"
    + "; \n"
    + "; Below is a very simple SIC-1 program that negates one input\n"
    + "; value and writes it out.\n"
    + "; \n"
    + "; E.g. if the input value from @IN is 3, it subtracts 3 from\n"
    + "; @OUT (which reads as zero), and the result of 0 - 3 = -3 is\n"
    + "; written out.\n"
    + "\n"
    + "subleq @OUT, @IN\n"
    + "\n"
    + "; First, click \"Load\" to compile the program and load it\n"
    + "; into memory, then use the \"Step\" and \"Run\" buttons to\n"
    + "; execute the program until all expected outputs have been\n"
    + "; successfully written out (see the.\n"
    + "; \"In\"/\"Expected\"/\"Out\" table to the left).\n"
    ,
            io: [
                [3, -3]
            ]
        },
        {
            title: "Data Directive and Looping",
            minimumSolvedToUnlock: 1,
            description: "Use .data and labels to loop.",
            code:
      "; Custom lables are defined by putting \"@name: \" at the\n"
    + "; beginning of a line, e.g.:\n"
    + "; \n"
    + ";   @loop: subleq 1, 2\n"
    + "; \n"
    + "; In addition to \"subleq\", there is an assembler\n"
    + "; directive \".data\" that sets a byte of memory to a value\n"
    + "; at compile time (note: this is not an instruction!):\n"
    + "; \n"
    + ";   .data <X>\n"
    + "; \n"
    + "; X is a signed byte (-128 to 127).\n"
    + "; \n"
    + "; Combining labels and the \".data\" directive allows you to:\n"
    + "; develop of system of constants and variables:\n"
    + "; \n"
    + ";   @zero: .data 0\n"
    + "; \n"
    + "; Note that, while a program is executing, you can view the\n"
    + "; current value of each varaible in the variable table on\n"
    + "; the right (under the memory table).\n"
    + "; \n"
    + "; Variables can be used for implementing an unconditional\n"
    + "; jump:\n"
    + "; \n"
    + ";   subleq @zero, @zero, @loop\n"
    + "; \n"
    + "; This will set @zero to @zero - @zero (still zero) and,\n"
    + "; since the result is always <= 0, execution branches to\n"
    + "; @loop.\n"
    + "; \n"
    + "; Below is an updated negation program that repeatedly\n"
    + "; negates input values and writes them out.\n"
    + "\n"
    + "@loop:\n"
    + "subleq @OUT, @IN\n"
    + "subleq @zero, @zero, @loop\n"
    + "\n"
    + "@zero: .data 0\n"
    ,
            io: [
                [3, -3],
                [4, -4],
                [5, -5]
            ]
        },
        {
            title: "First Assessment",
            minimumSolvedToUnlock: 2,
            description: "Write input values to output.",
            code:
      "; Now that you understand the \"subleq\" instruction, the\n"
    + "; \".data\" directive, and labels, you should be able to read\n"
    + "; values from input and write the exact same values out\n"
    + "; (hint: negate the value twice).\n"
    + "; \n"
    + "; For reference, here is the previous program that negates\n"
    + "; values on their way to output:\n"
    + "\n"
    + "@loop:\n"
    + "subleq @OUT, @IN\n"
    + "subleq @zero, @zero, @loop\n"
    + "\n"
    + "@zero: .data 0\n"
    + "\n"
    ,
            io: [
                [1, 1],
                [2, 2],
                [3, 3]
            ]
        }
    ]
});

puzzles.push({
    groupTitle: "Arithmetic",
    list: [
        {
            title: "Addition",
            minimumSolvedToUnlock: 3,
            description: "Read two numbers and output their sum. Repeat.",
            io: [
                [[1, 1], 2],
                [[1, 2], 3],
                [[1, -1], 0],
                [[11, 25], 36],
                [[82, 17], 99]
            ]
        },
        {
            title: "Subtraction",
            minimumSolvedToUnlock: 3,
            description: "Read two numbers (A, then B) and output A minus B. Repeat.",
            io: [
                [[1, 1], 0],
                [[1, 2], -1],
                [[1, -1], 2],
                [[11, 25], -14],
                [[82, 17], 65]
            ]
        },
        {
            title: "Sign Function",
            minimumSolvedToUnlock: 3,
            description: "Read a number. If less than zero, output -1; if equal to zero, output 0; otherwise output 1. Repeat.",
            io: [
                [-1, -1],
                [0, 0],
                [1, 1],
                [7, 1],
                [-29, -1],
                [99, 1],
                [-99, -1]
            ]
        },
        {
            title: "Multiplication",
            minimumSolvedToUnlock: 3,
            description: "Read two nonnegative numbers and output their product. Repeat.",
            io: [
                [[1, 0], 0],
                [[0, 1], 0],
                [[1, 1], 1],
                [[2, 3], 6],
                [[7, 13], 91]
            ]
        },
        {
            title: "Division",
            minimumSolvedToUnlock: 3,
            description: "Read two positive numbers (A, then B), divide A by B, and output the quotient followed by the remainder. Repeat.",
            io: [
                [[1, 1], [1, 0]],
                [[9, 3], [3, 0]],
                [[17, 2], [8, 1]],
                [[67, 9], [7, 4]]
            ]
        }
    ]
});

puzzles.push({
    groupTitle: "Sequences",
    list: [
        {
            title: "Sequence Sum",
            minimumSolvedToUnlock: 8,
            description: "Read a sequence of positive numbers and output their sum. Repeat. Sequences are terminated by a zero.",
            io: [
                [[1, 1, 1, 0], 3],
                [[1, 2, 3, 0], 6],
                [[3, 5, 7, 11, 0], 26],
                [[53, 13, 22, 9, 0], 97]
            ]
        },
        {
            title: "Sequence Cardinality",
            minimumSolvedToUnlock: 8,
            description: "Read a sequence of positive numbers and output the count of numbers. Repeat. Sequences are terminated by a zero.",
            io: [
                [[0], 0],
                [[1, 0], 1],
                [[3, 4, 0], 2],
                [[9, 2, 7, 13, 26, 0], 5],
            ]
        },
        {
            title: "Number to Sequence",
            minimumSolvedToUnlock: 8,
            description: "Read a number and then output that many 1s, followed by a 0. Repeat.",
            io: [
                [0, 0],
                [1, [1, 0]],
                [2, [1, 1, 0]],
                [5, [1, 1, 1, 1, 1, 0]],
                [3, [1, 1, 1, 0]],
                [7, [1, 1, 1, 1, 1, 1, 1, 0]]
            ]
        }
    ]
});

puzzles.push({
    groupTitle: "Advanced Techniques",
    list: [
        {
            title: "Self-Modifying Code",
            minimumSolvedToUnlock: 11,
            description: "Output the program's compiled code byte-by-byte.",
            code:
      "; Label expressions can include an optional offset, for\n"
    + "; example:\n"
    + ";\n"
    + ";   subleq @loop+1, @one\n"
    + ";\n"
    + "; This is useful in self-modifying code. Each \"subleq\"\n"
    + "; instruction is stored as 3 consecutive addresses: ABC\n"
    + "; (for mem[A] = mem[A] - mem[B], with potential branch\n"
    + "; to C).\n"
    + ";\n"
    + "; The sample program below reads its own compiled code\n"
    + "; and outputs it by incrementing the second address of\n"
    + "; the instruction at @loop (i.e. modifying address\n"
    + "; @loop+1).\n"
    + "\n"
    + "@loop:\n"
    + "subleq @tmp, 0           ; Second address (initially zero) will be incremented\n"
    + "subleq @OUT, @tmp        ; Output the value\n"
    + "subleq @loop+1, @n_one   ; Here is where the increment is performed\n"
    + "subleq @tmp, @tmp, @loop\n"
    + "\n"
    + "@tmp: .data 0\n"
    + "@n_one: .data -1\n"
    ,
            io: [
                [0, [12, 1, 3, -2, 12, 6, 1, 13, 9, 12, 12, 0]]
            ]
        },
        {
            title: "Stack Memory",
            minimumSolvedToUnlock: 12,
            description: "Read 3 values from input and then output the values in reverse order.",
            code:
    "; This program implements a first-in, first-out stack by\n"
    + "; modifying the read and write addresses of the\n"
    + "; instructions that interact with the stack.\n"
    + ";\n"
    + "; The program pushes 3 (defined by @count) input\n"
    + "; values onto the stack and then pops them off\n"
    + "; (outputting them in reverse order).\n"
    + "\n"
    + "; The first address of this instruction (which starts\n"
    + "; pointing to @stack) will be incremented with each\n"
    + "; write to the stack\n"
    + "@stack_push:\n"
    + "subleq @stack, @IN\n"
    + "subleq @count, @one, @prepare_to_pop\n"
    + "\n"
    + "; Modify the instruction at @stack_push (increment\n"
    + "; target address)\n"
    + "subleq @stack_push, @n_one\n"
    + "subleq @tmp, @tmp, @stack_push\n"
    + "\n"
    + "; Prepare to start popping values off of the stack by\n"
    + "; copying the current stack position to @stack_pop+1\n"
    + "@prepare_to_pop:\n"
    + "subleq @tmp, @stack_push\n"
    + "subleq @stack_pop+1, @tmp\n"
    + "\n"
    + "; Read a value from the stack (note: the second address\n"
    + "; of this instruction is repeatedly decremented)\n"
    + "@stack_pop:\n"
    + "subleq @OUT, 0\n"
    + "\n"
    + "; Decrement stack address in the instruction at @stack_pop\n"
    + "subleq @stack_pop+1, @one\n"
    + "subleq @tmp, @tmp, @stack_pop\n"
    + "\n"
    + "; Constants\n"
    + "@one: .data 1\n"
    + "@n_one: .data -1\n"
    + "\n"
    + "; Variables\n"
    + "@tmp: .data 0\n"
    + "@count: .data 3\n"
    + "\n"
    + "; Base of stack (stack will grow upwards)\n"
    + "@stack: .data 0\n"
    ,
            io: [
                [[3, 5, 7], [7, 5, 3]]
            ]
        }
    ]
});

puzzles.push({
    groupTitle: "Sequence Manipulation",
    list: [
        {
            title: "Reverse Sequence",
            minimumSolvedToUnlock: 13,
            description: "Read a sequence of positive numbers (terminated by a zero) and output the sequence in reverse order (with zero terminator). Repeat.",
            io: [
                [[1, 2, 3, 0], [3, 2, 1, 0]],
                [[3, 2, 1, 0], [1, 2, 3, 0]],
                [[3, 5, 7, 11, 13, 15, 17, 0], [17, 15, 13, 11, 7, 5, 3, 0]]
            ]
        }
        // {
        //     title: "Indicator Function",
        //     minimumSolvedToUnlock: 13,
        //     description: "Read set \"A\" of positive numbers (the set is terminated by a zero). Then read a sequence of positive numbers (also zero-terminated) and for each number output 1 if the number is in set \"A\" or 0 otherwise. Repeat.",
        //     io: [
        //         [[0, 1, 2, 0], [0, 0]],
        //         [[2, 4, 6, 8, 0, 6, 7, 8, 0], [1, 0, 1]],
        //         [[3, 5, 7, 11, 0, 5, 6, 7, 8, 10, 11, 12, 0], [1, 0, 1, 0, 0, 1, 0]]]
        // }
    ]
});

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

var currentPuzzle;
var inputBytes = [];
var expectedOutputBytes = [];
var ioInputMap = [];
var ioExpectedMap = [];
var ioActualMap = [];
function loadPuzzle(puzzle) {
    // Save previous puzzle progress, if applicable
    if (currentPuzzle && currentPuzzle.title) {
        savePuzzleProgress();
    }

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
    highlighter.deleteGroup("data1");
    highlighter.deleteGroup("data2");
    for (var i = 0; i < rowCount; i++) {
        var tr = document.createElement("tr");
        tr.appendChild(ioInputMap[i] = createTd((i < inputBytes.length) ? inputBytes[i] : undefined));
        tr.appendChild(ioExpectedMap[i] = createTd((i < expectedOutputBytes.length) ? expectedOutputBytes[i] : undefined));
        tr.appendChild(ioActualMap[i] = createTd());
        highlighter.add("data1", i, ioExpectedMap[i]);
        highlighter.add("data2", i, ioActualMap[i]);
        elements.ioBody.appendChild(tr);
    }

    elements.title.firstChild.nodeValue = puzzle.title;
    elements.description.firstChild.nodeValue = puzzle.description;

    // Load previous progress or fallback to default (or description)
    var puzzleState = loadPuzzlePersistentState(puzzle.title);
    var code = puzzleState.code;
    if (code === undefined || code === null) {
        if (puzzle.code) {
            code = puzzle.code;
        } else {
            code = "; " + puzzle.description + "\n";
        }
    }

    elements.inputSource.value = code;

    currentPuzzle = puzzle;
    var persistentState = loadPersistentState();
    if (persistentState.currentPuzzle !== puzzle.title) {
        persistentState.currentPuzzle = puzzle.title;
        savePersistentState();
    }

    setState(StateFlags.none);
    // TODO: Clear memory and cycle/byte counts

    // Mark as viewed
    if (!puzzleState.viewed) {
        puzzleState.viewed = true;
        savePuzzlePersistentState(puzzle.title);

        reportPuzzleViewed(puzzle.title);
    }
}

// Service interaction
var serviceRoot = "https://sic1.schemescape.com";
// var serviceRoot = "http://localhost:8373"; // Local test server

function serviceGetPuzzleRoot(puzzleTitle) {
    return serviceRoot + "/tests/" + encodeURIComponent(puzzleTitle);
}

function serviceMergeData(data, value) {
    // Find appropriate bucket and add the new value to it (i.e. increment the count)
    for (var i = 0; i < data.length; i++) {
        if (data[i].bucket <= value && ((i >= data.length - 1) || data[i + 1].bucket > value)) {
            data[i].count++;
        }
    }
}

function serviceGetPuzzleStats(puzzleTitle, cycles, bytes, onSuccess, onError) {
    $.ajax(serviceGetPuzzleRoot(puzzleTitle) + "/stats", {
        method: "get",
        data: { cycles: cycles, bytes: bytes },
        dataType: "json"
    })
        .done(function (data) {
            serviceMergeData(data.cycles, cycles);
            serviceMergeData(data.bytes, bytes);
            onSuccess(data);
        })
        .fail(onError);
}

function serviceUploadPuzzleSolution(puzzleTitle, cycles, bytes, programBytes) {
    var persistentState = loadPersistentState();
    var userId = persistentState.userId;
    var userName = persistentState.name;
    var program = "";
    for (var i = 0; i < programBytes.length; i++) {
        var byte = programBytes[i].toString(16);
        if (byte.length < 2) {
            byte = "0" + byte;
        }
        program += byte;
    }

    // TODO: Consider logging an event on error
    $.ajax(serviceGetPuzzleRoot(puzzleTitle) + "/results", {
        method: "post",
        dataType: "json",
        data: {
            userId: userId,
            userName: userName,
            solutionCycles: cycles,
            solutionBytes: bytes,
            program: program
        }
    });
}

// Chart management
function chartSetTitle(chart, title) {
    chart.find(".chartTitle").text(title);
}

function chartSetOverlay(chart, text) {
    chart.find(".chartLine, .chartHighlight, .chartLeft, .chartRight").hide();
    chart.find(".chartOverlay")
        .text(text)
        .show();
}

function chartSetData(chart, data, highlightedValue) {
    // Find bucket to highlight, max count, and min/max values
    var maxCount = 1;
    var minValue = null;
    var maxValue = null;
    var highlightIndex = data.length - 1;
    for (var i = 0; i < data.length; i++) {
        var bucket = data[i];
        maxCount = Math.max(maxCount, bucket.count);
        maxValue = bucket.bucket;
        if (minValue === null) {
            minValue = bucket.bucket;
        }

        if (bucket.bucket <= highlightedValue) {
            highlightIndex = i;
        }
    }

    var chartHeight = 20;
    var scale = chartHeight / maxCount;
    var points = "";
    for (var i = 0; i < data.length; i++) {
        var count = data[i].count;
        points += " " + i + "," + (chartHeight - (count * scale));
        points += " " + (i + 1) + "," + (chartHeight - (count * scale));
    }

    chart.find(".chartOverlay").hide();

    chart.find(".chartLine")
        .attr("points", points)
        .show();

    chart.find(".chartHighlight")
        .attr("x", highlightIndex)
        .attr("y", chartHeight - (data[highlightIndex].count * scale))
        .attr("height", data[highlightIndex].count * scale)
        .show();

    chart.find(".chartLeft")
        .text(minValue)
        .show();
    
    chart.find(".chartRight")
        .text(maxValue)
        .show();
}

// State management
var StateFlags = {
    none: 0x0,
    running: 0x1,
    error: 0x2,
    done: 0x4
};

var state = StateFlags.none;
function isRunning() {
    return !!(state & StateFlags.running);
}

function setState(newState) {
    state = newState;
    var running = isRunning();

    var success = false;
    var label = "Stopped";
    var error = !!(state & StateFlags.error);
    if ((state & StateFlags.done) && !error) {
        success = true;
        label = "Completed"
    } else if (running) {
        label = "Running"
    }

    elements.stateRunning.innerText = label;

    // Swap editor and source view
    if (running) {
        elements.inputSource.classList.add("hidden");
        elements.stateSource.classList.remove("hidden");
    } else {
        elements.inputSource.classList.remove("hidden");
        elements.stateSource.classList.add("hidden");
    }

    // Remove highlights and output if not running
    if (!running) {
        highlighter.clear(true);
        for (var i = 0; i < ioActualMap.length; i++) {
            ioActualMap[i].firstChild.nodeValue = "";
        }
    }

    // Controls
    elements.inputLoad.disabled = running;
    elements.inputStop.disabled = !running;
    elements.inputStep.disabled = !running || success;
    elements.inputRun.disabled = !running || success || error;

    if (success) {
        var solutionCycles = parseInt(elements.stateCycles.firstChild.nodeValue);
        var solutionBytes = parseInt(elements.stateBytes.firstChild.nodeValue);
        chartSetTitle(charts.cycles, "Cycles Executed: " + solutionCycles);
        chartSetTitle(charts.bytes, "Bytes Read: " + solutionBytes);
        chartSetOverlay(charts.cycles, "Loading...");
        chartSetOverlay(charts.bytes, "Loading...");

        var savedTitle = currentPuzzle.title;
        var savedBytes = programBytes.slice();
        serviceGetPuzzleStats(savedTitle, solutionCycles, solutionBytes, function (data) {
            chartSetData(charts.cycles, data.cycles, solutionCycles);
            chartSetData(charts.bytes, data.bytes, solutionBytes);

            serviceUploadPuzzleSolution(savedTitle, solutionCycles, solutionBytes, savedBytes);
        }, function () {
            // TODO: Consider reporting an error event here (assuming "offline" cases can be filtered out)
            chartSetOverlay(charts.cycles, "Load failed");
            chartSetOverlay(charts.bytes, "Load failed");
        });

        showMessage("Success", elements.contentSuccess, true);

        // Mark as solved
        var puzzleState = loadPuzzlePersistentState(currentPuzzle.title);
        if (!puzzleState.solved) {
            var persistentState = loadPersistentState();
            persistentState.solvedCount++;
            puzzleState.solved = true;
            puzzleState.solutionCycles = solutionCycles;
            puzzleState.solutionBytes = solutionBytes;

            savePersistentState();
            savePuzzlePersistentState(currentPuzzle.title);

            reportPuzzleCompleted(currentPuzzle.title, persistentState.solvedCount, solutionCycles, solutionBytes);
        }
    }

    // Manage automatic stepping (stop on stop, done, error)
    autoStep = autoStep && (running && !success && !error);
}

function setStateFlag(flag, on) {
    if (on === false) {
        setState(state & ~flag);
    } else {
        setState(state | flag);
    }
}

// Puzzle list
function showPuzzleList() {
    clearChildren(elements.puzzleList);
    for (var i = 0; i < puzzles.length; i++) {
        var group = puzzles[i];
        var unlockedElements = [];
        for (var j = 0; j < group.list.length; j++) {
            // Read persistent state
            var puzzle = group.list[j];
            var puzzleState = loadPuzzlePersistentState(puzzle.title);

            // Check for unlock
            if (!puzzleState.unlocked) {
                var persistentState = loadPersistentState();
                if (persistentState.solvedCount >= puzzle.minimumSolvedToUnlock) {
                    puzzleState.unlocked = true;
                    savePuzzlePersistentState(puzzle.title);
                }
            }

            if (puzzleState.unlocked) {
                var a = document.createElement("a");
                a.href = "#";
                a.appendChild(document.createTextNode(puzzle.title));

                (function (puzzle) {
                    a.onclick = function (e) {
                        e.preventDefault();
                        loadPuzzle(puzzle);
                        closeMessageBox();
                    };
                })(puzzle);
    
                var li = document.createElement("li");
                li.appendChild(a);

                // Show solution stats, if applicable
                if (puzzleState.solved && puzzleState.solutionCycles && puzzleState.solutionBytes) {
                    li.appendChild(document.createTextNode(" (SOLVED; cycles: " + puzzleState.solutionCycles + ", bytes: " + puzzleState.solutionBytes + ")"));
                } else if (!puzzleState.viewed) {
                    li.appendChild(document.createTextNode(" (NEW)"));
                }

                unlockedElements.push(li);
            }
        }

        if (unlockedElements.length > 0) {
            var li = document.createElement("li");
            li.appendChild(document.createTextNode(group.groupTitle));
            var ol = document.createElement("ol");
            for (var j = 0; j < unlockedElements.length; j++) {
                ol.appendChild(unlockedElements[j]);
            }
            li.appendChild(ol);
            elements.puzzleList.appendChild(li);
        }
    }

    showMessage("Program Inventory", elements.contentSelect);
}

// Interpreter
var programBytes;
var interpreter;
elements.inputLoad.onclick = function () {
    try {
        var sourceLines = elements.inputSource.value.split("\n");
        clearChildren(elements.stateSource);
        clearChildren(elements.stateVariablesBody);

        highlighter.deleteGroup("source");
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
        var done = false;
        var variableToValueElement = {};
        var assembledProgram = (new Parser()).assemble(sourceLines);
        programBytes = assembledProgram.bytes.slice();
        interpreter = new Interpreter(
            assembledProgram,
            {
                readInput: function () {
                    var value = (inputIndex < inputBytes.length) ? inputBytes[inputIndex] : 0;
                    inputIndex++;
                    return value;
                },

                writeOutput: function (value) {
                    if (outputIndex < expectedOutputBytes.length) {
                        ioActualMap[outputIndex].firstChild.nodeValue = value;

                        if (value !== expectedOutputBytes[outputIndex]) {
                            setStateFlag(StateFlags.error);
                            highlighter.highlight("data1", outputIndex, "attention", true);
                            highlighter.highlight("data2", outputIndex, "attention", true);
                        }

                        if (++outputIndex == expectedOutputBytes.length) {
                            done = true;
                        }
                    }
                },

                onWriteMemory: function (address, value) {
                    memoryMap[address].textNode.nodeValue = hexifyByte(value);
                },

                onStateUpdated: function (running, address, target, sourceLineNumber, source, cycles, bytes, variables) {
                    setStateFlag(StateFlags.running, running);

                    elements.stateCycles.firstChild.nodeValue = cycles;
                    elements.stateBytes.firstChild.nodeValue = bytes;

                    // TODO: Use constants from lib
                    if (address < 256 - 3) {
                        highlighter.highlight("source", sourceLineNumber, "emphasize");
                        for (var i = address; i < address + 3; i++) {
                            highlighter.highlight("memory", i, "emphasize");
                        }
                    }

                    if (done) {
                        setStateFlag(StateFlags.done, true);
                    }

                    for (var i = 0; i < variables.length; i++) {
                        var element = variableToValueElement[variables[i].label];
                        if (!element) {
                            var tr = document.createElement("tr");
                            var tdName = document.createElement("td");
                            tdName.appendChild(document.createTextNode(variables[i].label));
                            tr.appendChild(tdName);

                            var tdValue = document.createElement("td");
                            tdValue.appendChild(element = document.createTextNode(""));
                            tr.appendChild(tdValue);
                            elements.stateVariablesBody.appendChild(tr);
                            variableToValueElement[variables[i].label] = element;
                        }

                        element.nodeValue = variables[i].value;
                    }

                    if (variables.length > 0) {
                        elements.stateVariables.classList.remove("hidden");
                    } else {
                        elements.stateVariables.classList.add("hidden");
                    }
                }
            }
        );
    } catch (e) {
        if (e instanceof CompilationError) {
            elements.messageError.firstChild.nodeValue = e.message;
            showMessage("Compilation error", elements.contentCompilationError);
        } else {
            throw e;
        }
    }
};

var autoStep = false;
function runStop() {
    autoStep = false;
    setState(StateFlags.none);
}

elements.inputStop.onclick = function () {
    runStop();
};

function runStep() {
    if (interpreter) {
        highlighter.clear(false);
        interpreter.step();
    }
}

elements.inputStep.onclick = function () {
    autoStep = false;
    runStep();
};

function runInterval() {
    if (autoStep) {
        runStep();
    } else {
        clearInterval();
    }
}

var autoStepInterval = 40;
elements.inputRun.onclick = function () {
    autoStep = true;
    setInterval(runInterval, autoStepInterval);
};

function showWelcome() {
    var persistentState = loadPersistentState();
    elements.messageInputName.value = persistentState.name;

    showMessage("Welcome", elements.contentWelcome, true);
}

function showWelcome2() {
    var persistentState = loadPersistentState();
    elements.messageWelcomeName.innerText = persistentState.name;

    showMessage("You're hired!", elements.contentWelcome2, true);
}

elements.inputMenu.onclick = function () {
    autoStep = false;
    showPuzzleList();
};

window.onkeyup = function (e) {
    if (e.keyCode === 27) { // Escape key
        autoStep = false;
        if (messageBoxOpen && !modalMessageBoxOpen) {
            closeMessageBox();
        } else if (isRunning()) {
            runStop();
        } else {
            showPuzzleList();
        }
    }
};

function savePuzzleProgress() {
    // Save current code
    var code = elements.inputSource.value;
    if (code === currentPuzzle.code) {
        code = null;
    }

    var puzzleState = loadPuzzlePersistentState(currentPuzzle.title);
    if (puzzleState.code !== code) {
        puzzleState.code = code;
        savePuzzlePersistentState(currentPuzzle.title);
    }
}

elements.inputSource.addEventListener("focusout", function () {
    savePuzzleProgress();
});

// Initial state
var persistentState = loadPersistentState();

// Only show welcome if incomplete
if (!persistentState.introCompleted) {
    showWelcome(true);
}

// Load the last open puzzle
var puzzleIndexI = 0;
var puzzleIndexJ = 0;
if (persistentState.currentPuzzle) {
    for (var i = 0; i < puzzles.length; i++) {
        var group = puzzles[i].list;
        for (var j = 0; j < group.length; j++) {
            if (group[j].title === persistentState.currentPuzzle) {
                puzzleIndexI = i;
                puzzleIndexJ = j;
                break;
            }
        }
    }
}

loadPuzzle(puzzles[puzzleIndexI].list[puzzleIndexJ]);
