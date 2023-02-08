### Single Instruction Computer Mark 1 (SIC-1)
The Single Instruction Computer Mark 1 (SIC-1) is an 8-bit computer with 256 bytes of memory. Programs for the SIC-1 are written in SIC-1 Assembly Language, as described below.

### subleq instruction
Each `subleq` instruction is 3 bytes, specified as follows:

```
subleq <A> <B> [<C>]
```

`A`, `B`, and `C` are memory addresses (0 - 255) or labels.

`subleq` subtracts the value at address `B` from the value at address `A` and stores the result at address `A` (i.e. `mem[A]` is set to `mem[A] - mem[B]`).

If the result is <= 0, execution branches to address `C`.

Note that if `C` is not specified, the address of the next instruction is automatically added by the assembler (in effect, this means that taking the branch is no different from advancing to the next instruction).

### Built-in addresses
For convenience, addresses can be specified using labels. The following predefined labels are always available:

 * `@MAX` (252): Maximum user-modifiable address
 * `@IN` (253): Reads a value from input (writes are ignored)
 * `@OUT` (254): Writes a result to output (reads as zero)
 * `@HALT` (255): Terminates the program when accessed (reads and write are ignored)

### subleq example
Below is a very simple SIC-1 program that negates one input value and writes it out.

E.g. if the input value from `@IN` is 3, it subtracts 3 from `@OUT` (which reads as zero), and the result of 0 - 3 = -3 is written out.

```
subleq @OUT, @IN
```

### Comments
Any text following a semicolon is considered a comment. Comments are ignored by the assembler, but may be helpful to humans attempting to decipher existing programs. For example, here's the previous line of assembly with an explanatory comment:

```
subleq @OUT, @IN ; Negates an input and writes it out
```

### Labels
Custom labels are defined by putting `@name: ` at the beginning of a line, e.g.:

```
@loop: subleq 1, 2
```

Label names can only contain letters (a-z, A-Z), numbers (0-9), and underscores (_).

### .data directive
In addition to `subleq`, there is an assembler directive `.data` that sets one or more bytes of memory to specific values at compile time (note: this is not an instruction!):

```
.data <X>
```

In the simplest case, `X` is a signed byte between -128 and 127 (inclusive).

Multiple values can also be provided (separated by whitespace and, optionally, commas):

```
.data 1, -2, 3
```

Note: labels (with optional offsets), characters, and strings--along with negations of these--can also be supplied. Examples of these appear in subsequent sections.

### Constants and variables
Combining labels and the `.data` directive allows you to develop a system of constants and variables. For example, here a byte is set to zero, and the label `@zero` points to that value:

```
@zero: .data 0
```

### Unconditional jumps
Variables can be used for implementing an unconditional jump:

```
subleq @zero, @zero, @next
```

This will set `@zero` to zero minus zero (still zero) and, since the result is always <= 0, execution always branches to the label `@next`.

### Loop example
Below is an updated negation program that repeatedly negates input values and writes them out in a loop.

```
@loop:
subleq @OUT, @IN           ; Negate an input and write it out
subleq @zero, @zero, @loop ; Unconditional jump to @loop

@zero: .data 0             ; Always zero
```

### Label offsets
Label expressions can include an optional offset. For example, `@loop+1` refers to the *second* byte of the instruction pointed to by `@loop`:

```
@loop:
subleq @loop+1, @one
```

Note: in certain cases (usually involving self-modifying code), it is useful to store the address associated with a label (possibly with an offset) in a byte of memory. Here is an example of how to set a byte of memory to the address of `@loop+1` (i.e. the *second* byte of the instruction at `@loop`):

```
; Address of the second byte of @loop
@loop_plus_one: .data @loop+1
```

It is possible to negate labels as well by prefixing them with a minus sign. Keep in mind that this only negates the label's address itself, so if a label with an offset needs to be negated, both the label *and the offset* should be negated. Here's the negation of the previous example:

```
; Negation of @loop+1
@n_loop_plus_one: .data -@loop-1
```

### Reflection example
Label offsets are useful in self-modifying code. Remember, each `subleq` instruction is stored as 3 consecutive addresses: `ABC` (for `mem[A] ← mem[A] - mem[B]`, with a branch to `C` if the result is less than or equal to zero).

The sample program below reads its own compiled code and outputs it by incrementing the second address of the instruction at `@loop` (i.e. modifying address `@loop+1`).

```
@loop:
subleq @tmp, 0           ; Second address (initially zero) will be incremented below
subleq @OUT, @tmp        ; Output the value
subleq @loop+1, @n_one   ; Here is where the increment is performed
subleq @tmp, @tmp, @loop ; Reset @tmp to zero and unconditionally jump to @loop

@tmp: .data 0            ; @tmp is initialized to zero
@n_one: .data -1
```

The third instruction is an example of self-modifying code because it actually modifies the first instruction. Specifically, it increments the first instruction's second address (`@loop+1`). This causes the *next* loop iteration's first instruction to read the *next* byte of memory (0, 1, 2, 3, ...).

Note: When running a program in the SIC-1 Development Environment, the original (unmodified) source code is always shown. If the program modifies itself, the changes are reflected in the memory table in the top right, but *not* in the source code viewer.

### Stack example
This program implements a last-in, first-out stack by modifying the read and write addresses of the instructions that interact with the stack.

The program pushes 3 (defined by `@count`) input values onto the stack and then pops them off (outputting them in reverse order).

```
; The first address of this instruction (which starts
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
@stack: .data 0
```

### Characters
When configured properly, the SIC-1 supports natural human language input and output using a highly modern (c. 1967) mapping from numbers to characters known as ASCII. For example, 72 is mapped to "H" (capital "h").

To capture the characters "Hi" (capital "h", lower case "i") in two variables, one could consult an ASCII lookup table and write:

```
@H: .data 72
@i: .data 105
```

Consulting an ASCII table is tedious, so to make SIC Systems engineers' lives easier, SIC-1 Assembly Language now supports automated ASCII lookup using the following advanced syntax (which is equivalent to explicitly specifying characters' mapped numbers):

```
@H: .data 'H' ; 72
@i: .data 'i' ; 105
```

As a final convenience, it is possible to negate the value of a character by prefixing the character literal with a minus:

```
@n_H: .data -'H' ; -72
```

### Character output example
The following sample program outputs the characters "Hi":

```
subleq @OUT, @n_H ; Note: (0 - (-72) = 72 = 'H')
subleq @OUT, @n_i

@n_H: .data -'H'
@n_i: .data -'i'
```

### Strings
Strings are sequences of characters that are terminated with a zero. In the following example, @string points to a 3 byte sequence representing the string "Hi":

```
@string:
.data 'H'
.data 'i'
.data 0
```

The .data directive can also take a sequence of values to set multiple bytes, so the previous code would be simplified:

```
@string: .data 'H', 'i', 0
```

And thanks to the innovative design-by-committee approach employed by SIC Systems, the following novel syntax for strings can be used (again, equivalent to the other examples):

```
@string: .data "Hi" ; Sets the next 3 bytes: 'H', 'i', 0
```

Similar to character values, an entire string can be negated by prefixing it with a minus:

```
@n_string: .data -"Hi" ; Sets the next 3 bytes: -72, -105, 0
```

### New line characters
New line characters (value 10) can be expressed with the character `'\n'`. They can also be used in strings, for example: `"Line 1\nLine 2"`.

### String output example
The following code outputs "Hello, world!":

```
@loop:
subleq @OUT, @n_message  ; Read address starts at @n_message
subleq @loop+1, @n_one   ; Advance read address
subleq @tmp, @tmp, @loop

@n_one: .data -1
@n_message: .data -"Hello, world!"
@tmp: .data 0
```

### ASCII Reference
For completeness, a table of ASCII characters is shown below. Note that SIC-1 only supports ASCII codes 32 through 126, so the first few rows of the table are omitted (and a few cells contain "□" to indicate unsupported codes). Each row represents a tens digit (30 - 120), and each column represents a ones digit (0 - 9).

Examples:

* Row 3, column 2 is a space character (code 32)
* Row 12, column 2 a lowercase "z" (code 122)

<table id="asciitable">
<tr><th></th><th>0</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7</th><th>8</th><th>9</th></tr>
<tr><th>30</th><td>□</td><td>□</td><td title="Code: 32, character:  "> </td><td title="Code: 33, character: !">!</td><td title="Code: 34, character: &quot;">&quot;</td><td title="Code: 35, character: #">#</td><td title="Code: 36, character: $">$</td><td title="Code: 37, character: %">%</td><td title="Code: 38, character: &amp;">&amp;</td><td title="Code: 39, character: &#39;">&#39;</td></tr>
<tr><th>40</th><td title="Code: 40, character: (">(</td><td title="Code: 41, character: )">)</td><td title="Code: 42, character: *">*</td><td title="Code: 43, character: +">+</td><td title="Code: 44, character: ,">,</td><td title="Code: 45, character: -">-</td><td title="Code: 46, character: .">.</td><td title="Code: 47, character: /">/</td><td title="Code: 48, character: 0">0</td><td title="Code: 49, character: 1">1</td></tr>      
<tr><th>50</th><td title="Code: 50, character: 2">2</td><td title="Code: 51, character: 3">3</td><td title="Code: 52, character: 4">4</td><td title="Code: 53, character: 5">5</td><td title="Code: 54, character: 6">6</td><td title="Code: 55, character: 7">7</td><td title="Code: 56, character: 8">8</td><td title="Code: 57, character: 9">9</td><td title="Code: 58, character: :">:</td><td title="Code: 59, character: ;">;</td></tr>      
<tr><th>60</th><td title="Code: 60, character: &lt;">&lt;</td><td title="Code: 61, character: =">=</td><td title="Code: 62, character: &gt;">&gt;</td><td title="Code: 63, character: ?">?</td><td title="Code: 64, character: @">@</td><td title="Code: 65, character: A">A</td><td title="Code: 66, character: B">B</td><td title="Code: 67, character: C">C</td><td title="Code: 68, character: D">D</td><td title="Code: 69, character: E">E</td></tr>
<tr><th>70</th><td title="Code: 70, character: F">F</td><td title="Code: 71, character: G">G</td><td title="Code: 72, character: H">H</td><td title="Code: 73, character: I">I</td><td title="Code: 74, character: J">J</td><td title="Code: 75, character: K">K</td><td title="Code: 76, character: L">L</td><td title="Code: 77, character: M">M</td><td title="Code: 78, character: N">N</td><td title="Code: 79, character: O">O</td></tr>
<tr><th>80</th><td title="Code: 80, character: P">P</td><td title="Code: 81, character: Q">Q</td><td title="Code: 82, character: R">R</td><td title="Code: 83, character: S">S</td><td title="Code: 84, character: T">T</td><td title="Code: 85, character: U">U</td><td title="Code: 86, character: V">V</td><td title="Code: 87, character: W">W</td><td title="Code: 88, character: X">X</td><td title="Code: 89, character: Y">Y</td></tr>
<tr><th>90</th><td title="Code: 90, character: Z">Z</td><td title="Code: 91, character: [">[</td><td title="Code: 92, character: \">\</td><td title="Code: 93, character: ]">]</td><td title="Code: 94, character: ^">^</td><td title="Code: 95, character: _">_</td><td title="Code: 96, character: `">`</td><td title="Code: 97, character: a">a</td><td title="Code: 98, character: b">b</td><td title="Code: 99, character: c">c</td></tr>
<tr><th>100</th><td title="Code: 100, character: d">d</td><td title="Code: 101, character: e">e</td><td title="Code: 102, character: f">f</td><td title="Code: 103, character: g">g</td><td title="Code: 104, character: h">h</td><td title="Code: 105, character: i">i</td><td title="Code: 106, character: j">j</td><td title="Code: 107, character: k">k</td><td title="Code: 108, character: l">l</td><td title="Code: 109, character: m">m</td></tr>
<tr><th>110</th><td title="Code: 110, character: n">n</td><td title="Code: 111, character: o">o</td><td title="Code: 112, character: p">p</td><td title="Code: 113, character: q">q</td><td title="Code: 114, character: r">r</td><td title="Code: 115, character: s">s</td><td title="Code: 116, character: t">t</td><td title="Code: 117, character: u">u</td><td title="Code: 118, character: v">v</td><td title="Code: 119, character: w">w</td></tr>
<tr><th>120</th><td title="Code: 120, character: x">x</td><td title="Code: 121, character: y">y</td><td title="Code: 122, character: z">z</td><td title="Code: 123, character: &#123;">&#123;</td><td title="Code: 124, character: |">|</td><td title="Code: 125, character: &#125;">&#125;</td><td title="Code: 126, character: ~">~</td><td>□</td><td>□</td><td>□</td></tr>
</table>

### Errata
In order to reduce the time-to-market for the SIC-1, some compromises were made in the design of the processor and these design decisions may result in surprising behavior. This section is an attempt to document such cases:

1. For the purposes of calculating the number of memory bytes read, every `subleq` instruction reads all 3 bytes, regardless of whether or not the final address is used (i.e. regardless of whether or not the branch is taken)
1. `subleq @IN, <B>, <C>` will consume an input in order to compute the result ("input minus `mem[B]`"), which is used to decide whether to branch to `C` or not (even though no value will be written because writes to `@IN` are ignored)
1. `subleq @IN, @IN` will only consume a single input and the result will always be zero
1. Branching to any address above `@MAX` (252) will halt execution
1. `subleq <A>, <B>, @IN` may branch to `@IN` (253), which will halt (see previous bullet)
1. Executing the instruction at `@MAX-1` (251) will *not* read an input and the third address will always be zero
1. Executing the instruction at `@MAX-2` (251) will *neither* read an input nor write an output; the second and third addresses will always be zero
