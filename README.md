# Single-instruction (subleq) programming game

Program an 8-bit, single-instruction computer:

https://jaredkrinke.itch.io/sic-1

## Background
You have been hired by SIC Systems to produce highly efficient programs for their flagship product: the Single Instruction Computer Mark 1 (SIC-1).

The SIC-1 represents a transformational change in computing, reducing complexity to the point that the processor only executes a single instruction: subtract and branch if less than or equal to zero ("subleq").

Enter the brave new world of single-instruction computing and discover new ways of implementing programs that would be trivial on a conventional computer. Don't adjust the technology to match how you think, adjust your thinking to match how the SIC-1 operates!

## SIC-1 Assembly Language
Examples and in-depth documentation are available here: [SIC-1 Assembly Language](sic1-assembly.md)

### Example
```
; Read two numbers and output their sum. Repeat.
@loop:
subleq @tmp, @IN
subleq @tmp, @IN
subleq @OUT, @tmp
subleq @tmp, @tmp, @loop

@tmp: .data 0
```

## Screenshots
![Gameplay screenshot](../screenshots/sic1-gameplay.png?raw=true)
![User rank screenshot](../screenshots/sic1-rank.png?raw=true)
