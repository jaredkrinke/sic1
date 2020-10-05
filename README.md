# Single-instruction (subleq) programming game

SIC-1 is a single-instruction (subleq) programming game with "zachlike" global leaderboards (note: game runs in the browser):

**[https://jaredkrinke.itch.io/sic-1](https://jaredkrinke.itch.io/sic-1)**

## Background
You have been hired by SIC Systems to produce highly efficient programs for their flagship product: the Single Instruction Computer Mark 1 (SIC-1).

The SIC-1 represents a transformational change in computing, reducing complexity to the point that the processor only executes a single instruction: subtract and branch if less than or equal to zero ("subleq").

Enter the brave new world of single-instruction computing and discover new ways of implementing programs that would be trivial on a conventional computer. Don't adjust the technology to match how you think, adjust your thinking to match how the SIC-1 operates!

## SIC-1 Assembly Language
Examples and in-depth documentation are available both in-game and here:

[SIC-1 Assembly Language](sic1-assembly.md)

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

## External resources

### Information about subleq
Note: these resources are not specific to the SIC-1 and do not use SIC-1 Assembly Language.

 * [Subleq description on Wikipedia](https://en.wikipedia.org/wiki/One_instruction_set_computer#Subtract_and_branch_if_less_than_or_equal_to_zero)
 * [Subleq page the Esoteric Programming Languages Wiki](https://esolangs.org/wiki/Subleq)
 * [Subleq emulators on RosettaCode.org](https://rosettacode.org/wiki/Subleq)

 ### Information about esoteric programming languages

  * [Esoteric Programming Languages Wiki](https://esolangs.org/wiki/Main_Page)
  * [List of esoteric programming languages](https://github.com/angrykoala/awesome-esolangs)
