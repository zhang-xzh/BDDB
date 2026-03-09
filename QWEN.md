# Qwen Coder (QwenCode) Stable Usage Guide

This document provides a practical and stable workflow for using Qwen Coder models inside **QwenCode / Qwen CLI environments** on large repositories.

The goal is to make the model:

* predictable
* controlled
* minimal in edits
* capable of handling large project context

This guide focuses specifically on **large project work** rather than simple code generation.

---

# Design Philosophy

Qwen coder models are excellent at generating code but weaker at:

* long reasoning
* structured planning
* controlled modifications in large repositories

Therefore we compensate using **external prompt structure and workflow discipline**.

The main idea:

1. Force planning before coding
2. Limit scope of changes
3. Explicitly manage project context
4. Avoid uncontrolled refactoring

---

# Recommended Base Prompt (System Prompt)

Use this as the default system prompt in QwenCode.

```
You are a senior software engineer working on an existing production repository.

Your goal is to implement changes safely and predictably.

Rules:

- Understand the task before writing code
- Make the smallest change possible
- Do not rewrite entire files
- Do not modify unrelated code
- Do not reformat code unnecessarily
- Preserve the existing architecture
- If requirements are unclear, ask for clarification

Your priority is stability and minimal changes.
```

---

# Enforced Workflow

Always force a structured workflow.

```
STEP 1: Understand the task
- Summarize the problem
- Identify the expected outcome

STEP 2: Analyze the repository
- Identify relevant files
- Explain how the current system works

STEP 3: Plan the modification
- List files that must change
- Explain why each change is required
- Do NOT write code yet

STEP 4: Implementation
- Modify only listed files
- Keep edits minimal

STEP 5: Output
- Show changes using unified diff format
```

This dramatically improves predictability.

---

# Large Project Context Strategy

Large repositories require explicit context control.

Never immediately ask the model to modify code.

Instead use a **three-stage context workflow**.

## Stage 1 — Repository Mapping

First ask the model to map the repository.

Example prompt:

```
Analyze this repository and describe:

1. project architecture
2. main modules
3. important entry points
4. dependencies between components
```

This builds a mental model before editing.

## Stage 2 — Relevant Context Extraction

Next narrow the scope.

Example prompt:

```
For the following task:

<TASK>

Identify the minimal set of files that must be understood.
Explain why each file is relevant.
```

Goal: reduce context noise.

## Stage 3 — Controlled Modification

Only after the above steps should coding begin.

```
Based on the identified files, propose the minimal code change required.
Do not modify any other files.
```

---

# Modification Control Rules

These rules prevent chaotic edits.

```
Modification rules:

- Only change code directly related to the task
- Do not rename functions unless necessary
- Do not introduce new abstractions without justification
- Do not add new dependencies unless required
- Avoid creating new files
```

---

# Diff-Only Output Rule

Always require diff format output.

```
Output changes using unified diff format.

Do not output full files unless explicitly requested.
```

Example:

```
--- a/service.py
+++ b/service.py
@@
 old line
+new line
```

This prevents full file rewrites.

---

# Anti-Overengineering Rule

Qwen models sometimes invent unnecessary architecture.

Add this restriction:

```
Do not introduce new frameworks, patterns, or abstractions unless explicitly requested.

Prefer modifying existing functions rather than creating new systems.
```

---

# Change Size Limiter

Limit modification size.

```
Maximum change guidelines:

- Prefer editing existing functions
- Avoid large refactors
- Avoid multi-file edits
- If multiple files must change, explain why before editing
```

---

# Repository Safety Rule

To prevent large accidental rewrites:

```
Safety rules:

- Never rewrite entire files
- Never modify more than one module unless necessary
- If a change affects many files, stop and ask for confirmation
```

---

# Debugging Workflow

For bug fixing use this process.

```
1. Explain the bug
2. Identify possible causes
3. Locate the responsible code
4. Propose minimal fix
5. Implement diff
```

This prevents blind rewriting.

---

# Refactoring Workflow

When refactoring:

```
1. Explain current structure
2. Explain why refactoring is needed
3. Propose minimal structural change
4. Implement step-by-step
```

Never perform large refactors in a single step.

---

# Large Context Stability Trick

When working with large repositories always include:

```
Before coding:

List all files that will be modified.
Explain why each modification is necessary.
```

This forces planning.

---

# When Qwen Starts Modifying Too Much

If the model begins rewriting large sections:

Ask:

```
Stop.

List the minimal changes required.
Do not write code yet.
```

This resets the reasoning process.

---

# Practical Minimal Prompt Template

This is a stable prompt you can reuse.

```
You are a senior engineer working on a large repository.

Goal:
Implement the requested change with the smallest modification possible.

Process:

1. Understand the task
2. Identify the minimal files that must change
3. Explain the plan
4. Implement minimal diff

Rules:

- Do not rewrite entire files
- Do not modify unrelated code
- Avoid unnecessary abstractions

Output changes using unified diff format.
```

---

# Summary

Using this workflow typically results in:

* smaller diffs
* more predictable behavior
* fewer accidental refactors
* better reasoning on large repositories

The key idea is simple:

**Force planning before coding and strictly limit modification scope.**
