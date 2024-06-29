# Computed Value Pipeline

### 1. Initial Reaction or "_.raw"

Upon reactive object creation, assign a initial value (usually \_.raw). That initial value's path should be watched by a reaction, the very first reaction that will properly build the object (fetch data from "_.raw" -> modify such data -> compile inside the "data" property of compilable objects - inacessible to "manual" changes, always only a target for compilations).

### 2. Parity Hashes

Some data is too complex to be used as reaction targets. For that we can use **parity hashes**, which is a convention to say that - on defining those complex data - we should generate a hash and save it. I like the path "_.parity.<some identifing value>". Then we look at that parity path, instead of the original complex path, to detect any reactable changes (since, if the complex data changes in any way, a new hash would be updated on the parity path).


### 3. Computed Values

Inside the initial reaction - or any reactions for that matter - there could be values that depend on other reactive objects. That value will be referred as **computed value**. Usually a pre-treatment will determine that a value relies on external object's data, and therefore cannot be defined in this "compilation run". In this case the computed value will generate a **computed object**, a map with all relevant information to finish the computation of a final acceptable value. That object should be added as a regular property, by convention inside the path "_.computed.<some identifing key>". That pre-treatment will also yield a **parity hash**.

The computed object will also return all expected references missing to compute the final value. Those *(target, path)* tuples are **computed references**. The **target** is a *TargetPointer*, which means it could be directly the compilable object id or a reference defined after the initial reaction (like the "_.keys" path).

The reaction should then return the **listener reactions** to proxy any changes. Inside the reaction any change that should be persisted from computed values shoudl be added as a regular change instruction.

In other words, once the compilation manager detects any changes on the tuples from computed references a reaction (listener reaction) should be called (mimmicking the regular lifecycle of changing the reactive objects's data -> reacting to that change). That returning object is a **proxy instruction**, that groups listener reactions, computed references and a **context** object.


### 3. Proxying Reactions

The compilation manager will receive the **change instructions** for the object's data AND the **proxy instructions** for external data changes. Those proxy instructions are intrinsecally connected to some **parity hashes**. If the interal hash stored on the instruction does not match the hash inside the object, the instruction is no longer valid (and should be removed). That is a security feature to make sure no deprecated proxy will be executed.

Those proxy instructions will be registered as reactions to its internal references (but the instructions themselves should be stored to allow for a clean removal of attached reactions if necessary).


### 4. Calling a proxy reaction

Once a object is updated, we should check if the changed paths are 