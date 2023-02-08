---
from: onboarding
subject: SIC-1 Dev. Environment
actions: [manualInNewWindow]
---
### SIC-1 DEVELOPMENT ENVIRONMENT
The SIC-1 Development Environment provides a state-of-the-art programming and simulation environment for SIC Systems's Single Instruction Computer Mark 1 (SIC-1).

### MENUS
Menus can be accessed using either the "Esc" key or the "Menu" button in the lower-left of the development environment. The Main Menu provides access to the following:

* **Program Inventory**: Used for switching between assigned programming tasks, as well as viewing employee and task statistics (described in a dedicated section below).
* **Electronic Mail**: An integrated client application for viewing electronic mail from automated agents and other SIC-1 employees (described in a dedicated section below).
* **Options**: A sub-menu for modifying presentation settings (full-screen mode, volume, etc.), and other miscellaneous menus.

### INTEGRATED DEVELOPMENT ENVIRONMENT
The SIC-1 Development Environment desktop is an integrated development environment (IDE) for the SIC-1. There are three main sections (left, right, center):

* **Left**: Current task description, table of input and output (both expected and actual), simulation state/statistics, buttons for controlling the simulation, and a button for opening the Main Menu (described above).
* **Center**: Main code editor for reading and writing SIC-1 Assembly Language programs (see the separate SIC-1 Reference Manual electronic mail for details).
* **Right**: Detailed simulation state including a complete view of SIC-1 memory, code manipulation tools, as well as an unprecedented, revolutionary feature: a table of variables and their current values, for convenient lookup.

The memory table is shown in hexadecimal for compactness; hover over a cell to see the corresponding decimal value.

During execution, the current instruction will be highlighted in both the code editor (center) and the memory table (upper right), current inputs and outputs are highlighted in the tables on the left, and variables are displayed in a table on the right (hover for hexadecimal and unsigned representations, if needed).

To aid debugging, it is possible to set breakpoints on `subleq` instructions. When hit, these breakpoints will pause execution for manual analysis. There are two ways to set breakpoints:

* In code, add `!` to the beginning of a line (e.g. `!subleq @OUT, @IN`).
* During execution, click the small circle to the left of any `subleq` instruction to toggle the breakpoint.

Note that each program may be tested using multiple distinct test sets, and the test sets generally include randomly generated input data.

### KEYBOARD SHORTCUTS
The SIC-1 Development Environment supports the following convenient keyboard shortcuts:

* **Esc**: Open/close menu or, if running, pause/halt execution.
* **Ctrl+.**: Execute a single instruction and pause. If the program has not been compiled yet, this will compile the program and pause before executing the first instruction.
* **Ctrl+Enter**: Run instructions until completion/error/pause. If already running, this will increase the speed of execution.
* **Ctrl+Shift+Enter**: Pause execution (if running), otherwise halt execution.
* **F11, Alt+Enter**: Toggle full-screen mode.

Code editing shortcuts:

* **Ctrl+K Ctrl+F**: Comment out all of the selected lines
* **Ctrl+K Ctrl+U**: Uncomment all of the selected lines
* **Ctrl+M**: Toggle **Tab Insert** mode (by default the Tab key cycles focus, with Tab Insert mode, tabs can be entered into the code editor)
* **Tab**: If in **Tab Insert** mode, insert tabs into the selected lines
* **Shift+Tab**: If in **Tab Insert** mode, un-indent the selected lines

### PROGRAM INVENTORY
The Program Inventory displays a list of assigned tasks on the left. There is also a special "employee statistics" section at the top for viewing how your progress compares to other SIC Systems employees.

Select any task on the left to view the description (or your solution's statistics, as compared to other employees' solutions, for completed tasks). There is button at the bottom to load the program into the development environment.

Under the "File Selection" heading, it's possible to manage multiple implementations of a task (notably: "New" creates a new solution with default contents, "Copy" duplicates an existing implementation). This can be useful when there is one solution optimizing for fewest cycles, and a different solution optimizing for accessing the least amount of memory.

If available, other non-task entries will appear in the Program Inventory, under the "Diversions" heading (such as Sandbox Mode or any company-sanctioned electronic video games--only for use during legally-mandated breaks).

### ELECTRONIC MAIL
SIC Systems is pioneering a new digital form of intra-office communication known as "electronic mail". This eliminates paper waste for memos, and also ensures that all communications are securely routed to only the intended recipients.

A complete list of received electronic mail is shown in the left pane of the electronic mail viewer (sorted from oldest at the top to newest at the bottom). Note that automated mails are de-emphasized, but they can be opened to view statistics for your completed programming tasks.

If you have any unread mail, it will appear in a separate section at the top of the left page, for convenience.

Also, remember that you can always access the SIC-1 Reference Manual and this document about the SIC-1 Development Environment from your employee on-boarding mails at the top (oldest) part of the left pane of the electronic mail viewer.

### ADDENDUM
Although the SIC-1 Development Environment has been thoroughly tested, it is possible that you may encounter unexpected behavior in certain instances. The authors of the SIC-1 Development Environment have assured us that the most likely causes for such issues are either cosmic rays or large solar flares interfering with sensitive electronics in an unpredictable manner. The simplest way to recover from such interference is to unplug the computer, wait for 30 seconds to allow it to cool and eject any rogue electrons, and then plug it back in.
