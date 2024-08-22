/**
 * =================
 * COMPILER DESIGN
 * =================
 *
 * 1) LEXICAL ANALYSIS/SCANNING
 *    In this stage, the compiler reads the source code character by character and breaks it down into a series of tokens,
 *    such as keywords, identifiers, and operators. These tokens are then passed on to the next stage of the compilation process.
 *
 * - Tokens (Keywords, Identifiers, Operators, etc...)
 * - Expression -> Tokenized Expression
 *
 * 2) TODO: SYNTAX ANALYSIS/PARSING
 *    In this stage, the compiler checks the syntax of the source code to ensure that it conforms to the rules of the programming
 *    language. The compiler builds a parse tree, which is a hierarchical representation of the program’s structure, and uses it to
 *    check for syntax errors.
 *
 * - Validate syntax from tokenized expression
 * - Tokens -> Parse Tree
 *
 *    The Internet suggests the shunting-yard algorithm to convert an infix-form expression into a postfix form or AST, and it
 *    might be a good idea to use it. When I was working on this subject, I used this algorithm as a reference and created my own.
 *    The algorithm iterates over the expression’s tokens and inserts them into the tree in the correct position depending on the
 *    token’s priority.
 *
 * - Tokenized Expression -> Abstract Syntax Tree (AST)
 *
 * 3) TODO: SEMANTIC ANALYSIS
 *    In this stage, the compiler checks the meaning of the source code to ensure that it makes sense. The compiler performs type
 *    checking, which ensures that variables are used correctly and that operations are performed on compatible data types.
 *    The compiler also checks for other semantic errors, such as undeclared variables and incorrect function calls.
 *
 * - Validate types and relationships between nodes
 *
 *    Now, when we have an abstract syntax tree, we can check if the expression has any errors. We can iterate over all nodes
 *    and check if they are valid. E.g., we can check if the summing node (+) has exactly two child nodes.
 *    If we have a programming language with static types, we can verify that all child nodes return compatible types.
 * *
 * 4) TODO: SIMPLIFIER
 *    The simplifier is a tool that can simplify an expression.
 *    It is a TERM REWRITE SYSTEM (https://stackoverflow.com/questions/7540227/strategies-for-simplifying-math-expressions)
 *    There is a list of rules, that contains a pattern and a replacement (regex maybe?). Use special symbols as pattern variables,
 *      which need to get bound during pattern matching (scanning or parsing???) and replaced in the replacement expression.
 *
 *    TRY TO REWRITE EXPRESSION TO A NORMAL FORM
 *        (https://en.wikipedia.org/wiki/Conjunctive_normal_form)
 *        Conjunctive Normal Form (CNF) is a standard form of expression in logic, where each expression is a conjunction of clauses.
 *
 *      Don't forget, that this approach works to a certain point, but is likely to be non complete. This is due to the fact,
 *      that all of the following rules perform local term rewrites.
 *
 *      To make this local rewrite logic stronger, one should try to transform expressions into something I'd call a normal form.
 *      This is my approach:
 *
 *        - If a term contains literal values, try to move the term as far to the right as possible.
 *        - Eventually, this literal value may appear rightmost and can be evaluated as part of a fully literal expression.
 *
 * - RULES
 * - BINDING ENVIRONMENT — Something to bind variables to values. Maybe bind any node to a value (like, functions)
 *
 * - AST -> Simplified AST
 *
 *
 * 5) TODO: EXECUTOR
 *    The same execution approach I mentioned for prefix notation works for syntax trees as well. Trees are really good for recursion.
 *    To calculate an expression we need to do a recursive depth-first traversal (DFT) of its syntax tree and execute each node
 *
 * - BINDING ENVIRONMENT — Something to bind variables to values. Maybe bind any node to a value (like, functions
 *
 * - Execute AST recursively with DFT
 * - AST -> Result
 */

export * as Token from "./token"
import * as Parser from "./phases/parser"
import * as Semantic from "./phases/semantic"
import * as Simplifier from "./phases/simplify"

export * as Match from "./match"
