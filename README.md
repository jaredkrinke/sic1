![SIC-1 Logo](../screenshots/sic1-logo.png?raw=true)

SIC-1 is a free single-instruction (subleq) programming game. Neglect your personal life in pursuit of promotions and vague assurances of job security! Optimize your programs to rise to the top of the leaderboards! SIC Systems thanks you for your hard work! Now please return to your desk.

## Play
* **[Steam](https://store.steampowered.com/app/2124440/SIC1/)** (Windows only)
* **[itch.io](https://jaredkrinke.itch.io/sic-1)** (play in browser)

## Links
* **[Trailer](https://youtu.be/NyUSpn2CFTc)**
* Follow on: **[Discord](https://discord.gg/nbtumdjuvR)**, **[Mastodon](https://mastodon.gamedev.place/@antipatterngames)**, **[itch.io](https://jaredkrinke.itch.io/)**, **[the web](https://www.antipatterngames.com/)**

# Description
SIC-1 is a programming game where the computer only understands a single instruction.

* **Learn** an esoteric assembly language.
* **Implement** programs to unlock more impressive job titles.
* **Optimize** your programs to climb the leaderboards.
* **Sacrifice** your personal life for the good of the company!

It's an assembly language zachlike for everyone! New programmers will appreciate how few unique instructions there are to learn (just one!), and experienced programmers will appreciate how poorly suited this one instruction is for writing straight-forward programs.

**If you're ready for a challenge, respond to this job posting from SIC Systems:**

> SIC Systems is hiring engineers to produce highly efficient programs for our flagship product: the Single Instruction Computer Mark 1 (SIC-1).
> 
> The SIC-1 represents a transformational change in computing, reducing complexity to the point that the processor only executes a single instruction: subtract and branch if less than or equal to zero ("subleq").
> 
> Enter the brave new world of single-instruction computing and invent new ways of implementing programs that would be trivial on a conventional computer. Don't adjust the technology to match how you think, adjust your thinking to match how the SIC-1 operates!

# Screenshots
![Gameplay screenshot](../screenshots/sic1-gameplay.png?raw=true)

![User rank screenshot](../screenshots/sic1-rank.png?raw=true)

# SIC-1 Assembly Language
Examples and in-depth documentation are available both in-game and here:

[SIC-1 Assembly Language](sic1-assembly.md)

## Example
```
; Read two numbers and output their sum. Repeat.
@loop:
subleq @tmp, @IN
subleq @tmp, @IN
subleq @OUT, @tmp
subleq @tmp, @tmp, @loop

@tmp: .data 0
```

# General information about subleq
Note: these resources are not specific to the SIC-1 and do not use SIC-1 Assembly Language.

 * [Subleq description on Wikipedia](https://en.wikipedia.org/wiki/One_instruction_set_computer#Subtract_and_branch_if_less_than_or_equal_to_zero)
 * [Subleq page the Esoteric Programming Languages Wiki](https://esolangs.org/wiki/Subleq)
 * [Subleq emulators on RosettaCode.org](https://rosettacode.org/wiki/Subleq)
