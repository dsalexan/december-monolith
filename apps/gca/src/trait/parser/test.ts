import { TraitParser } from "."

let originalEntry = `test1`
originalEntry = `name(test1)`
// originalEntry = `name(test1), nameext(test2|testb), cat(test3)`
// originalEntry = `name("test1")`
// originalEntry = `name((test1)`
// originalEntry = `name(test1))`
// originalEntry = `name("test1)")`
// originalEntry = `name("test1)`
// originalEntry = `name(test1), nameext("[test2]"), cat({"test3"})`
// originalEntry = `name("test1, extension1")`
originalEntry = `(}"")`
originalEntry = `{(1)(}`
originalEntry = `{(1)})`
originalEntry = `({)`
originalEntry = `"{str`
originalEntry = `"{mamamia{"(}"")}`
originalEntry = `AAAA,` // TODO: FIX PRINTING FOR THIS CASE
originalEntry = `(,AAAA)`
originalEntry = `)error("{, mamamia{"(}"")})`
originalEntry = `a, b, c|d, e, f|g, h, i`
originalEntry = `),name<#0.0>,error("{, mamamia{"(}"")}),nameext<#0.1>,cat<#0.2>,cost<#0.3>,displaycost<#0.4>,appearance<#0.5>,description<#0.6>,page<#0.7>,race<#0.8>,noresync<#0.9>,owns<#0.10>,gives<#0.11>,adds(AD:Racial Bite Attack respond <#q0.0>,AD:Racial Skill Point Bonus <#0.12> = 2 respond <#q0.1>,AD:Racial Skill Point Bonus <#0.13> = 2 respond <#q0.2>,AD:360° Vision,AD:Acidic Bite <#0.14> = 1 respond 1,AD:Combat Reflexes with "Cannot Block or Parry, +0, group<#0.15>, page<#0.16>, gives(=nobase to ST:DX::blockat$ listAs <#q0.3>, =nobase to ST:DX::parryat$ listAs <#q0.4>, =nobase to SK:Brawling::parryat$ listAs <#q0.5>, =nobase to ST:Punch::Parry$, =<#q0.6> to ST:Punch::Parry$, =nobase to SK:Brawling::Parry$ listAs <#q0.7>, =<#q0.8> to SK:Brawling::Parry$, =nobase to AD:Striker::Parry$ listAs <#q0.9>, =<#q0.10> to AD:Striker::Parry$, =nobase to AD:Racial Punch Attack::Parry$ listAs <#q0.11>, =<#q0.12> to AD:Racial Punch Attack::Parry$), description(Most animals have No Fine Manipulators <#0.17> and, therefore, cannot parry. Those with manipulators <#0.18> can parry. No natural animal can block.)",AD:Damage Resistance = 4,AD:Extra Legs <#0.19> with "Long, +100%/+200%, group<#0.20>, page<#0.21>, gives<#0.22>" respond 8,AD:Infravision,AD:Super Jump <#0.23> = 1,AD:Teeth <#0.24>,DI:Horizontal,DI:No Kick,DI:No Punch,DI:No Fine Manipulators,SK:Jumping==0pts#DoNotOwn,SK:Stealth==0pts#DoNotOwn,TE:Wild Animal),creates({AD:Racial ST Bonus, 10/20, cat<#0.25>, mods<#0.26>, gives<#0.27>, initmods({<#q0.13>, -10%, group<#0.28>, page<#0.29>, formula(-@if<#0.30>), forceformula<#0.31>} | {<#q0.14>, -40%, group<#0.32>, formula(-@if<#0.33>), forceformula<#0.34>})} = 16,{AD:Racial DX Bonus, 20/40, cat<#0.35>, mods<#0.36>, gives<#0.37>, initmods({<#q0.15>, -40%, group<#0.38>, formula(-@if<#0.39>), forceformula<#0.40>})} = 5),features(Can walk over SM 0 or smaller adventurers without needing to evade. Acid glands contain enough acid for 3d acid grenades <#0.41>. Specimens with higher ST and HP aren't unheard of; Move, leaping distance, and acid are unchanged. Class: Dire Animal.),locks<#0.42>,hides<#0.43>`
// originalEntry = `name(Acid Spider),nameext(Dungeon Fantasy),cat(Racial Templates, Racial Templates - Dungeon Fantasy, Racial Templates - Dungeon Fantasy - Dire Animal),cost(10),displaycost(190),appearance(This giant spider has a relatively tiny body – “only” 7' across – attached to long, hairy legs that lift it 7' off the ground.),description(Class: Dire Animal. This giant spider has a relatively tiny body – “only” 7' across – attached to long, hairy legs that lift it 7' off the ground. It can walk unhindered over all but the tallest of men. A hunting spider, it lurks in dark cracks, waiting for warm prey to happen by. It then jumps on its quarry, bites with fangs capable of penetrating plate armor, and injects fast-acting corrosive venom that partially digests its prey.),page(DF2:21),race(Acid Spider),noresync(yes),owns(yes),gives(-5 to ST:IQ,+3 to ST:HT,+7 to ST:Perception,+7 to ST:Will,+2 to ST:Basic Move,+2 to ST:Size Modifier),adds(AD:Racial Bite Attack respond "Acidic Bite",AD:Racial Skill Point Bonus ([Skill]) = 2 respond "Jumping",AD:Racial Skill Point Bonus ([Skill]) = 2 respond "Stealth",AD:360° Vision,AD:Acidic Bite (Corrosion Attack) = 1 respond 1,AD:Combat Reflexes with "Cannot Block or Parry, +0, group(Animal Characteristics), page(B461), gives(=nobase to ST:DX::blockat$ listAs "Cannot Block", =nobase to ST:DX::parryat$ listAs "Cannot Parry", =nobase to SK:Brawling::parryat$ listAs "Cannot Parry", =nobase to ST:Punch::Parry$, ="No" to ST:Punch::Parry$, =nobase to SK:Brawling::Parry$ listAs "Cannot Parry", ="No" to SK:Brawling::Parry$, =nobase to AD:Striker::Parry$ listAs "Cannot Parry", ="No" to AD:Striker::Parry$, =nobase to AD:Racial Punch Attack::Parry$ listAs "Cannot Parry", ="No" to AD:Racial Punch Attack::Parry$), description(Most animals have No Fine Manipulators (included in Ichthyoid, Quadruped, and Vermiform) and, therefore, cannot parry. Those with manipulators (e.g., apes) can parry. No natural animal can block.)",AD:Damage Resistance = 4,AD:Extra Legs (7+ Legs) with "Long, +100%/+200%, group(Extra Legs), page(B55), gives(+1 to ST:Leg SM)" respond 8,AD:Infravision,AD:Super Jump (10-yard jump) = 1,AD:Teeth (Fangs),DI:Horizontal,DI:No Kick,DI:No Punch,DI:No Fine Manipulators,SK:Jumping==0pts#DoNotOwn,SK:Stealth==0pts#DoNotOwn,TE:Wild Animal),creates({AD:Racial ST Bonus, 10/20, cat(Attributes), mods(Extra ST, Size, No Fine Manipulators), gives(+1 to ST:ST), initmods({"Size", -10%, group(Size ST), page(B15), formula(-@if(ST:Size Modifier::score > 0 THEN ST:Size Modifier::score * 10 else 0)), forceformula(yes)} | {"No Fine Manipulators", -40%, group(No Fine Manipulators Stat), formula(-@if(ST:No Fine Manipulators >0 then 40 else 0)), forceformula(yes)})} = 16,{AD:Racial DX Bonus, 20/40, cat(Attributes), mods(Extra DX, No Fine Manipulators), gives(+1 to ST:DX), initmods({"No Fine Manipulators", -40%, group(No Fine Manipulators Stat), formula(-@if(ST:No Fine Manipulators > 0 then 40 else 0)), forceformula(yes)})} = 5),features(Can walk over SM 0 or smaller adventurers without needing to evade. Acid glands contain enough acid for 3d acid grenades ($10 each). Specimens with higher ST and HP aren't unheard of; Move, leaping distance, and acid are unchanged. Class: Dire Animal.),locks(yes),hides(yes)`
// originalEntry = `name(Travel Mass Speed),cat(Exotic, Physical, Natural Attacks, Exotic Physical),cost(10/20),mods(Affliction, Affliction Enhancements, Affliction Limitations, _Attack Enhancements, _Attack Limitations, Alternative Attack),page(B35, P39),damage(HT±$solver(me::level - 1)),damtype(aff),acc(3),rangehalfdam(10),rangemax(100),rof(1),shots(),rcl(1),skillused(ST:HT),mode(Primary),x(),noresync(yes),"displaycost(50),initmods(Area_Effect (4 hex), +100%, group(_Attack Enhancements), page(B102), shortname(Area Effect), gives(4 to owner::radius),| Advantage: Enhanced Move 0.5 (Ground), +100%, group(Affliction), page(B36, DF5:18),| Emanation, -20%, group(_Attack Limitations), page(B112),gives(="$solver(owner::charradius) yd" to owner::reach$,=nobase to owner::rangehalfdam$,=nobase to owner::rangemax$ ),| Extended Duration (Permanent while servitor is alive and summoned), +150%, group(_General), page(B105),| Malediction, +100%/+150%/+200%, upto(3), group(_Attack Enhancements), page(B106),levelnames(Receives -1/yd range, Uses Speed/Range Table, Uses Long-Distance Modifiers),gives(=nobase to owner::reach$,=nobase to owner::acc$,=nobasenocalc to owner::rangehalfdam$,=nobasenocalc to owner::rangemax$,=nobase to owner::rof$,=nobase to owner::shots$,=nobase to owner::rcl$,=" mal " to owner::damtype$,=$indexedvalue(me::level, "-1/yd", "Speed/Range", "Long-Distance") to owner::rangemax$),| Preparation Required (1 hour), -50%, group(_General), page(B114),| Selective Area, +20%, group(_Attack Enhancements), page(B108))`
// // originalEntry = `initmods(Area_Effect (4 hex), +100%, group(_Attack Enhancements), page(B102), shortname(Area Effect), gives(4 to owner::radius),| Advantage: Enhanced Move 0.5 (Ground), +100%, group(Affliction), page(B36, DF5:18),| Emanation, -20%, group(_Attack Limitations), page(B112),gives(="$solver(owner::charradius) yd" to owner::reach$,=nobase to owner::rangehalfdam$,=nobase to owner::rangemax$ ),| Extended Duration (Permanent while servitor is alive and summoned), +150%, group(_General), page(B105),| Malediction, +100%/+150%/+200%, upto(3), group(_Attack Enhancements), page(B106),levelnames(Receives -1/yd range, Uses Speed/Range Table, Uses Long-Distance Modifiers),gives(=nobase to owner::reach$,=nobase to owner::acc$,=nobasenocalc to owner::rangehalfdam$,=nobasenocalc to owner::rangemax$,=nobase to owner::rof$,=nobase to owner::shots$,=nobase to owner::rcl$,=" mal " to owner::damtype$,=$indexedvalue(me::level, "-1/yd", "Speed/Range", "Long-Distance") to owner::rangemax$),| Preparation Required (1 hour), -50%, group(_General), page(B114),| Selective Area, +20%, group(_Attack Enhancements), page(B108))`
originalEntry = `gives(="$solver(owner::charradius) yd" to owner::reach$,=nobase to owner::rangehalfdam$,=nobase to owner::rangemax$ )`
originalEntry = `skill("SK:Two-Handed Flail" -3)`
originalEntry = `"SK:Two-Handed Flail" - 3 + 5`
originalEntry = `ST:Basic Move - 3`
originalEntry = `SK:Meditation(Elemental Control) - 3`
originalEntry = `SK:Meditation (Elemental Control) - 3`
originalEntry = `SK:Meditation (Elemental Control, Air) - 3`
originalEntry = `SK:Meditation (Elemental Control, "X + 10") - 3`
originalEntry = `function(Elemental Control) - 3`

originalEntry = `"SK:Guns (Light Anti-Armor Weapon)" - 4`
originalEntry = `X + Y`
originalEntry = `X - 10 + 5` // this wount do math because it is not wrapped on parenthesis
originalEntry = `10 | 10 - 9`
originalEntry = `(10 | 10 - 9)`
originalEntry = `math("Variable Name")`
originalEntry = `X - floor(10) + 5`
originalEntry = `ceil(X) - floor(10) + 5`
originalEntry = `Y+`
originalEntry = `"[(X - 10) + Y]"`
originalEntry = `["(X - 10) + Y"]`
// // originalEntry = `,name("360° Vision, nameext1 (nameext2)"),cat(Exotic, Physical, Exotic Physical),cost(25),mods(360° Vision),page(B34),taboo(DI:Blindness, AD:Peripheral Vision)`
// // // originalEntry = `name(None)`
// // originalEntry = `,name(''Barnstormer'' Biplane),cat(Basic Set, Basic Set - Vehicles - Aircraft, _Vehicles),basecost(55000),techlvl(6),description(TL:6 Skill:Piloting/TL (Light Airplane) ST/HP:43 Hnd/SR:+2/3 HT:10f Move:2/37 Lwt:0.9 Load:0.2 SM:+3 Occ:1+1 DR:3 Range:85 Locations: O2WWi Stall:23),page(B465),mods(Equipment),isparent(yes)`
// // originalEntry = `,name(Apportation),cat(Movement),type(IQ/H),countasneed(Magical),ident(Magical),needs((AD:Magery 0 | ST:Magery 0 = 1), (AD:Magery = 1, ST:Magery = 1 | ST:Magery Movement = 1)),page(M142, B251),mods(Spells),shortcat(Mo),prereqcount(0),magery(1),class(Reg./R-Will),time(1 sec.),duration(1 min.),castingcost(Varies),description(Prereq Count: 0 Prerequisites: Magery 1)`
originalEntry = `(8|8|)`
originalEntry = `minst(|)`
originalEntry = `minst(||)`
originalEntry = `minst(|8||)` // TODO: FIX THIS PRINTING CASE
originalEntry = `(8||)`
originalEntry = `@if(A = 2 THEN B ELSE C)`
originalEntry = `@if(A = 2 THEN B ELSE C / 10)`
originalEntry = `A / @if(10 THEN 11)`
originalEntry = `A = 2 @if(10 THEN 11)`
originalEntry = `@notanif(A = 2 THEN @if(10 THEN 11) ELSE C)`
originalEntry = `init(@if(A = 2 THEN @if(B = 3 THEN D ELSE 150) ELSE C / 10))`
originalEntry = `init(@notanif(A = 2 THEN @if(B = 3 THEN D ELSE 150) ELSE C / 10))`
originalEntry = `init(@if(A = 2 THEN @notanif(B = 3 THEN D ELSE 150) ELSE C / 10))`
originalEntry = `initmods(20% of Starting Wealth, +0)`
// originalEntry = `name(Money),step(0),minscore(0),display(No),mainwin(15),initmods(20% of Starting Wealth, +0),mods(Money)`
originalEntry = `basevalue(ST:Money Base + (ST:Starting Wealth * @max(@if(@hasmod(5% of Starting Wealth) THEN 0.05),@if(@hasmod(10% of Starting Wealth) THEN 0.1),@if(@hasmod(15% of Starting Wealth) THEN 0.15),@if(@hasmod(20% of Starting Wealth) THEN 0.2),@if(@hasmod(30% of Starting Wealth) THEN 0.3),@if(@hasmod(40% of Starting Wealth) THEN 0.4),@if(@hasmod(50% of Starting Wealth) THEN 0.5),@if(@hasmod(60% of Starting Wealth) THEN 0.6),@if(@hasmod(70% of Starting Wealth) THEN 0.7),@if(@hasmod(80% of Starting Wealth) THEN 0.8),@if(@hasmod(90% of Starting Wealth) THEN 0.9),@if(@hasmod(100% of Starting Wealth) THEN 1) ) ) - char::equipmentcost + char::campaigntotalmoney)`
// originalEntry = `name(Money),step(0),minscore(0),display(No),mainwin(15),initmods(20% of Starting Wealth, +0),mods(Money),${originalEntry}`
originalEntry = `test1 # test2`
originalEntry = `test1 #test2()`
originalEntry = `test1 #buildlist(content)`
originalEntry = `test1(@if(A THEN B ELSE C))`
originalEntry = `directive(#buildlist(list(#list(LevelName Step 0.25)), template(+%listitem%)))`

// base resemblance trait treatment

const startsWithComma = originalEntry.startsWith(`,`)
if (!startsWithComma) originalEntry = `,${originalEntry}`
originalEntry = `⟨${originalEntry.trim()}⟩` // we pretend there is an enclosure around this, as seen when instantiating root node

console.log(`text: `, originalEntry)
console.log(` `)

const parser = new TraitParser(originalEntry)

parser.printText()
parser.parse(undefined, { syntax: [`percentages`] })
// parser.root.print()
parser.root.printer.print({ calculateLevels: [2, 3], lineSizeWithoutLevenPadding: 200, dontRepeatDigitsInHeader: true })
// parser.root.tree()

// console.log(`-------------------------------`)
// parser.root.printCompact()

// console.log(`-------------------------------`)

// const p3j = parser.get(`ρ3.j`)!

// p3j.parent?.printRelevant({ sections: [`context`] })
// p3j.wrapSeparatorColon()

// p3j.parent?.printRelevant({ sections: [`context`] })

// wrap math MUST be deliberate. It can be done automatically, but i'm offseting to be done manually when parsing tree into trait
// parser.root.printCompact()
console.log(`\nWRAPPING MATH\n`)

// const valueNode = parser.root.children[0].children[1].children[1]
// valueNode.wrapMath()
parser.root.resolveMath()

parser.root.printer.relevant()

// console.log(`\nNORMALIZING\n`)
// parser.root.normalize()
// parser.print()
