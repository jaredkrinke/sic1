var elements = {
    inputSource: "input",
    inputLoad: "load",
    inputStep: "step",
    inputRun: "run",
    stateSource: "source",
    stateMemory: "memory",
    stateRunning: "running",
    stateCycles: "cycles",
    stateBytes: "bytes",
    output: "output"
}

for (var name in elements) {
    if (name !== undefined) {
        elements[name] = document.getElementById(elements[name]);
    }
}

var interpreter;

elements.inputLoad.onclick = function () {
    var sourceLines = elements.inputSource.value.split("\n");
    interpreter = new Interpreter(
        (new Parser()).assemble(sourceLines),
        {
            onWriteMemory: function (address, value) {

            },

            onStateUpdated: function (running, address, sourceLineNumber, source, cycles, bytes) {
                elements.stateRunning.innerText = running ? "Running" : "Stopped";
                elements.stateCycles.innerText = cycles;
                elements.stateBytes.innerText = bytes;

                elements.stateSource.innerText = source;
            },

            onHalt: function (cycles, bytes) {

            }
        }
    );

    elements.inputStep.disabled = false;
    // elements.inputRun.disabled = false;
};

elements.inputStep.onclick = function () {
    if (interpreter) {
        interpreter.step();
    }
};

elements.inputRun.onclick = function () {
    // TODO
};