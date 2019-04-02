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
    bytesActual: "bytesActual"
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

// Interpreter
var interpreter;
var started = false;

elements.inputLoad.onclick = function () {
    started = false;

    var sourceLines = elements.inputSource.value.split("\n");
    var inputBytes = [3]; // TODO

    clearChildren(elements.bytesActual);
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

    var inputIndex = 0;
    interpreter = new Interpreter(
        (new Parser()).assemble(sourceLines),
        {
            readInput: function () {
                var value = (inputIndex < inputBytes.length) ? inputBytes[inputIndex] : 0;
                inputIndex++;
                return value;
            },

            writeOutput: function (value) {
                var div = document.createElement("div");
                div.appendChild(document.createTextNode(value));
                elements.bytesActual.appendChild(div);
            },

            onWriteMemory: function (address, value) {
                memoryMap[address].textNode.nodeValue = hexifyByte(value);

                if (started) {
                    highlighter.highlight("memory", address, "modified");
                }
            },

            onStateUpdated: function (running, address, target, sourceLineNumber, source, cycles, bytes) {
                elements.stateRunning.innerText = running ? "Running" : "Stopped";
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

    // Swap editor and source view
    elements.inputSource.classList.add("hidden");
    elements.stateSource.classList.remove("hidden");

    elements.inputLoad.disabled = true;
    elements.inputStop.disabled = false;
    elements.inputStep.disabled = false;
    // elements.inputRun.disabled = false;
};

elements.inputStop.onclick = function () {
    elements.inputSource.classList.remove("hidden");
    elements.stateSource.classList.add("hidden");

    elements.inputLoad.disabled = false;
    elements.inputStop.disabled = true;
    elements.inputStep.disabled = true;
};

elements.inputStep.onclick = function () {
    if (interpreter) {
        started = true;
        highlighter.clear();
        interpreter.step();
    }
};
