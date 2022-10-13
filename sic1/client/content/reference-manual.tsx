export default <>
<h3>SINGLE INSTRUCTION COMPUTER MARK 1 (SIC-1)</h3>
<p>The Single Instruction Computer Mark 1 (SIC-1) is an 8-bit computer with 256 bytes of memory. Programs for the SIC-1 are written in SIC-1 Assembly Language, as described below.</p>
<h3>subleq INSTRUCTION</h3>
<p>Each <code>subleq</code> instruction is 3 bytes, specified as follows:</p>
<pre><code>{`subleq <A> <B> [<C>]`}</code></pre>
<p><code>A</code>, <code>B</code>, and <code>C</code> are memory addresses (0 - 255) or labels.</p>
<p><code>subleq</code> subtracts the value at address <code>B</code> from the value at address <code>A</code> and stores
    the result at address <code>A</code> (i.e. <code>mem[A] = mem[A] - mem[B]</code>).</p>
<p>If the result is &lt;= 0, execution branches to address <code>C</code>.</p>
<p>Note that if <code>C</code> is not specified, the address of the next instruction is automatically added by the
    assembler (in effect, this means that taking the branch is no different from advancing to the next instruction).</p>
<h3>BUILT-IN ADDRESSES</h3>
<p>For convenience, addresses can be specified using labels. The following predefined labels are always available:</p>
<ul>
    <li><code>@MAX</code> (252): Maximum user-modifiable address</li>
    <li><code>@IN</code> (253): Reads a value from input (writes are ignored)</li>
    <li><code>@OUT</code> (254): Writes a result to output (reads as zero)</li>
    <li><code>@HALT</code> (255): Terminates the program when accessed</li>
</ul>
<h3>subleq EXAMPLE</h3>
<p>Below is a very simple SIC-1 program that negates one input value and writes it out.</p>
<p>E.g. if the input value from <code>@IN</code> is 3, it subtracts 3 from <code>@OUT</code> (which reads as zero), and
    the result of 0 - 3 = -3 is written out.</p>
<pre><code>{`subleq @OUT, @IN`}</code></pre>
<h3>COMMENTS</h3>
<p>Any text following a semicolon is considered a comment. Comments are ignored by the assembler, but may be helpful to
    humans attempting to decipher existing programs. For example, here's the previous line of assembly with an
    explanatory comment:</p>
<pre><code>{`subleq @OUT, @IN ; Negates an input and writes it out`}</code></pre>
<h3>LABELS</h3>
<p>Custom labels are defined by putting <code>@name:</code> at the beginning of a line, e.g.:</p>
<pre><code>{`@loop: subleq 1, 2`}</code></pre>
<h3>.data DIRECTIVE</h3>
<p>In addition to <code>subleq</code>, there is an assembler directive <code>.data</code> that sets a byte of memory to
    a value at compile time (note: this is not an instruction!):</p>
<pre><code>{`.data <X>`}</code></pre>
<p><code>X</code> is a signed byte between -128 and 127 (inclusive).</p>
<h3>CONSTANTS AND VARIABLES</h3>
<p>Combining labels and the <code>.data</code> directive allows you to develop of system of constants and variables. For
    example, here a byte is set to zero, and the label <code>@zero</code> points to that value:</p>
<pre><code>{`@zero: .data 0`}</code></pre>
<h3>UNCONDITIONAL JUMPS</h3>
<p>Variables can be used for implementing an unconditional jump:</p>
<pre><code>{`subleq @zero, @zero, @next`}</code></pre>
<p>This will set <code>@zero</code> to zero minus zero (still zero) and, since the result is always &lt;= 0, execution
    always branches to the label <code>@next</code>.</p>
<h3>LOOP EXAMPLE</h3>
<p>Below is an updated negation program that repeatedly negates input values and writes them out in a loop.</p>
<pre><code>{`@loop:
subleq @OUT, @IN           ; Negate an input and write it out
subleq @zero, @zero, @loop ; Unconditional jump to @loop

@zero: .data 0             ; Always zero`}</code></pre>
<h3>LABEL OFFSETS</h3>
<p>Label expressions can include an optional offset. For example, <code>@loop+1</code> refers to the second byte of the instruction pointed to by <code>@loop</code>:</p>
<pre><code>{`@loop:
subleq @loop+1, @one`}</code></pre>
<h3>REFLECTION EXAMPLE</h3>
<p>Label offsets are useful in self-modifying code. Remember, each <code>subleq</code> instruction is stored as 3 consecutive
    addresses: <code>ABC</code> (for <code>mem[A] = mem[A] - mem[B]</code>, with a branch to <code>C</code> if the
    result is less than or equal to zero).</p>
<p>The sample program below reads its own compiled code and outputs it by incrementing the second address of the
    instruction at <code>@loop</code> (i.e. modifying address <code>@loop+1</code>).</p>
<pre><code>{`@loop:
subleq @tmp, 0           ; Second address (initially zero) will be incremented below
subleq @OUT, @tmp        ; Output the value
subleq @loop+1, @n_one   ; Here is where the increment is performed
subleq @tmp, @tmp, @loop ; Reset @tmp to zero and unconditionally jump to @loop

@tmp: .data 0            ; @tmp is initialized to zero
@n_one: .data -1`}</code></pre>
<p>The third instruction is an example of self-modifying code because it actually modifies the first instruction.
    Specifically, it increments the first instruction's second address (<code>@loop+1</code>). This causes the
    <em>next</em> loop iteration's first instruction to read the <em>next</em> byte of memory (0, 1, 2, 3, ...).</p>
<h3>STACK EXAMPLE</h3>
<p>This program implements a first-in, first-out stack by modifying the read and write addresses of the instructions
    that interact with the stack.</p>
<p>The program pushes 3 (defined by <code>@count</code>) input values onto the stack and then pops them off (outputting
    them in reverse order).</p>
<pre><code>{`; The first address of this instruction (which starts
; pointing to @stack) will be incremented with each
; write to the stack
@stack_push:
subleq @stack, @IN
subleq @count, @one, @prepare_to_pop

; Modify the instruction at @stack_push (increment
; target address)
subleq @stack_push, @n_one
subleq @tmp, @tmp, @stack_push

; Prepare to start popping values off of the stack by
; copying the current stack position to @stack_pop+1
@prepare_to_pop:
subleq @tmp, @stack_push
subleq @stack_pop+1, @tmp

; Read a value from the stack (note: the second address
; of this instruction is repeatedly decremented)
@stack_pop:
subleq @OUT, 0

; Decrement stack address in the instruction at @stack_pop
subleq @stack_pop+1, @one
subleq @tmp, @tmp, @stack_pop

; Constants
@one: .data 1
@n_one: .data -1

; Variables
@tmp: .data 0
@count: .data 3

; Base of stack (stack will grow upwards)
@stack: .data 0`}</code></pre>
<h3>CHARACTERS</h3>
<p>When configured properly, the SIC-1 supports natural human language input and output using a highly modern (c. 1967)
    mapping from numbers to characters known as ASCII. For example, 72 is mapped to "H" (capital "h").</p>
<p>To capture the characters "Hi" (capital "h", lower case "i") in two variables, one could consult an ASCII lookup
    table and write:</p>
<pre><code>{`@H: .data 72
@i: .data 105`}</code></pre>
<p>Consulting an ASCII table is tedious, so to make SIC Systems engineers' lives easier, SIC-1 Assembly Language now
    supports automated ASCII lookup using the following advanced syntax (which is equivalent to explicitly specifying
    characters' mapped numbers):</p>
<pre><code>{`@H: .data 'H' ; 72
@i: .data 'i' ; 105`}</code></pre>
<p>As a final convenience, it is possible to negate the value of a character by prefixing the character literal with a
    minus:</p>
<pre><code>{`@n_H: .data -'H' ; -72`}</code></pre>
<h3>CHARACTER OUTPUT EXAMPLE</h3>
<p>The following sample program outputs the characters "Hi":</p>
<pre><code>{`subleq @OUT, @n_H ; Note: (0 - (-72) = 72 = 'H')
subleq @OUT, @n_i

@n_H: .data -'H'
@n_i: .data -'i'`}</code></pre>
<h3>STRINGS</h3>
<p>Strings are sequences of characters that are terminated with a zero. In the following example, @string points to a 3
    byte sequence representing the string "Hi":</p>
<pre><code>{`@string:
.data 'H'
.data 'i'
.data 0`}</code></pre>
<p>Although not discussed previously, the .data directive can actually take a sequence of values to set multiple bytes,
    so the previous code would be simplified:</p>
<pre><code>{`@string: .data 'H', 'i', 0`}</code></pre>
<p>And thanks to the innovative design-by-committee approach employed by SIC Systems, the following novel syntax for
    strings can be used (again, equivalent to the other examples):</p>
<pre><code>{`@string: "Hi" ; Sets the next 3 bytes: 'H', 'i', 0`}</code></pre>
<p>Similar to character values, an entire string can be negated by prefixing it with a minus:</p>
<pre><code>{`@n_string: -"Hi" ; Sets the next 3 bytes: -72, -105, 0`}</code></pre>
<h3>NEW LINE CHARACTERS</h3>
<p>New line characters (value 10) can be expressed with the character <code>'\n'</code>. They can also be used in
    strings, for example: <code>"Line 1\nLine 2"</code>.</p>
<h3>STRING OUTPUT EXAMPLE</h3>
<p>The following code outputs "Hello, world!":</p>
<pre><code>{`@loop:
subleq @OUT, @n_message  ; Read address starts at @n_message
subleq @loop+1, @n_one   ; Advance read address
subleq @tmp, @tmp, @loop

@n_one: .data -1
@n_message: .data -"Hello, world!"
@tmp: .data 0`}</code></pre>
</>;

export const developmentEnvironmentManual = <>
<h3>SIC-1 DEVELOPMENT ENVIRONMENT</h3>
<p>The SIC-1 Development Environment provides a state-of-the-art programming and simulation environment for SIC Systems's Single Instruction Computer Mark 1 (SIC-1).</p>
<h3>MENUS</h3>
<p>Menus can be accessed using either the "Esc" key or the "Menu" button in the lower-left of the development environment. The Main Menu provides access to the following:</p>
<ul>
    <li><strong>Program Inventory</strong>: Used for switching between assigned programming tasks, as well as viewing employee and task statistics (described in a dedicated section below).</li>
    <li><strong>Electronic Mail</strong>: An integrated client application for viewing electronic mail from automated agents and other SIC-1 employees (described in a dedicated section below).</li>
    <li><strong>Options</strong>: A sub-menu for modifying presentation settings (full-screen mode, volume, etc.), and other miscellaneous menus.</li>
</ul>
<h3>INTEGRATED DEVELOPMENT ENVIRONMENT</h3>
<p>The SIC-1 Development Environment desktop is an integrated development environment (IDE) for the SIC-1. There are three main sections (left, right, center):</p>
<ul>
    <li><strong>Left</strong>: Current task description, table of input and output (both expected and actual), simulation state/statistics, and buttons for controlling the simulation, and a button for opening the Main Menu (described above).</li>
    <li><strong>Center</strong>: Main code editor for reading and writing SIC-1 Assembly Language programs (see separate SIC-1 Reference Manual electronic mail for details).</li>
    <li><strong>Right</strong>: Detailed simulation state, including a complete view of SIC-1 memory, as well as an unprecedented, revolutionary feature: a table of variables and their current values, for convenient lookup.</li>
</ul>
<p>Note that during execution the current instruction will be highlighted in the code editor and all inputs/outputs, and memory/variables are visible on the left and right panes.</p>
<h3>KEYBOARD SHORTCUTS</h3>
<p>The SIC-1 Development Environment supports the following convenient keyboard shortcuts:</p>
<ul>
    <li><strong>Esc</strong>: Open Main Menu or close current menu or pause execution.</li>
    <li><strong>Ctrl+.</strong>: Execute a single instruction and pause (can also be used during execution to pause).</li>
    <li><strong>Ctrl+Enter</strong>: Run instructions until completion/error/pause.</li>
    <li><strong>Ctrl+Shift+Enter</strong>: Halt execution.</li>
    <li><strong>F11, Alt+Enter</strong>: Toggle full-screen mode.</li>
</ul>
<h3>PROGRAM INVENTORY</h3>
<p>The Program Inventory displays a list of assigned tasks on the left. There is also a special "employee statistics" section at the top for viewing how your progress compares to other SIC Systems employees.</p>
<p>Select any task on the left to view the description (or your solution's statistics, as compared to other employees' solutions, for completed tasks). There is button at the bottom to load the program into the development environment.</p>
<h3>ELECTRONIC MAIL</h3>
<p>SIC Systems is pioneering a new digital form of intra-office communication known as "electronic mail". This eliminates paper waste for memos, and also ensures that all communications are securely routed to only the intended recipients.</p>
<p>A complete list of received electronic mail is shown in the left pane of the electronic mail viewer (sorted from oldest at the top to newest at the bottom). Note that automated mails are de-emphasized, but they can be opened to view statistics for your completed programming tasks.</p>
<p>If you have any unread mail, it will appear in a separate section at the top of the left page, for convenience.</p>
<p>Also, remember that you can always access the SIC-1 Reference Manual and this document about the SIC-1 Development Environment from your employee on-boarding mails at the top (oldest) part of the left pane of the electronic mail viewer.</p>
<h3>ADDENDUM</h3>
<p>Although the SIC-1 Development Environment has been thoroughly tested, it is possible that you may encounter unexpected behavior in certain instances. The authors of the SIC-1 Development Environment have assured us that the most likely causes for such issues are either cosmic rays or large solar flares interfering with sensitive electronics in an unpredictable manner. The simplest way to recover from such interference is to unplug the computer, wait for 30 seconds to allow it to cool and eject any rogue electrons, and then plug it back in.</p>
</>;
