# Documentation Guide

This directory contains instructions and conventions for working with the BDDB codebase using GitHub Copilot and other
AI assistants.

## Files Overview

### `.github/copilot-instructions.md`

**Primary instructions for GitHub Copilot**

This is the main file that GitHub Copilot reads when providing code suggestions and assistance. It includes:

- Project structure and tech stack overview
- Type system guidelines and single source of truth principle
- Database configuration and best practices
- API and component conventions
- Code examples and common patterns

**When to reference**: This is automatically loaded by GitHub Copilot in supported IDEs.

### `.github/development-rules.md`

**Comprehensive development rules and standards**

Detailed coding standards, conventions, and best practices for the project:

- Type consistency requirements
- API response formats
- Component patterns
- Database conventions with MongoDB patterns
- Performance targets and best practices
- Error handling guidelines

**When to reference**: Use as a checklist when implementing new features or reviewing code.

### `DATABASE_CONVENTIONS.md`

**Detailed database layer documentation**

In-depth technical documentation for database operations:

- MongoDB document and ObjectId conventions
- JSON serialization patterns
- Query optimization with JSON1 functions
- Performance benchmarks and optimization strategies
- Repository pattern implementation examples

**When to reference**: When working with database operations, queries, or optimization.

### `PROJECT_OVERVIEW.md`

**High-level project documentation**

Quick reference for project structure and setup:

- Technology stack summary
- Directory structure
- Build and run commands
- Environment configuration
- Main features overview

**When to reference**: For onboarding new developers or quick project overview.

## Usage with GitHub Copilot

### In JetBrains IDEs (WebStorm, IntelliJ, etc.)

1. GitHub Copilot automatically reads `.github/copilot-instructions.md`
2. You can reference specific conventions in comments:
   ```typescript
   // Following repository pattern from copilot-instructions
   function toDbTorrent(torrent: Partial<Torrent>) {
     // Copilot will suggest the correct serialization
   }
   ```

### In VS Code

1. Install GitHub Copilot extension
2. The `.github/copilot-instructions.md` file is automatically indexed
3. Use `@workspace` in Copilot Chat to ask questions about the project

### Quick Tips

- **Ask specific questions**: "How should I serialize a Volume document for MongoDB?"
- **Reference files**: "Follow the pattern in lib/mongodb/bddbRepository.ts"
- **Request examples**: "Show me an example of a batch transaction for torrents"

## File Organization

```
BDDB/
├── .github/
│   ├── copilot-instructions.md    # Main Copilot instructions
│   ├── development-rules.md       # Development standards
│   └── README.md                  # This file
├── DATABASE_CONVENTIONS.md        # Database documentation
├── PROJECT_OVERVIEW.md            # Project overview
└── .qwen/                         # Legacy (deprecated)
    └── rules.md                   # Old format (being replaced)
```

## Migration from Qwen Format

The following files have been converted from Qwen-specific format to GitHub Copilot format:

- `.qwen/rules.md` → `.github/development-rules.md` + `.github/copilot-instructions.md`
- `QWEN.md` → `PROJECT_OVERVIEW.md`
- `DATABASE_CONVENTIONS.md` → Updated with English content

The old `.qwen/` directory can be removed after verification.

## Maintaining These Files

### When to Update

- **copilot-instructions.md**: When adding new patterns, conventions, or major features
- **development-rules.md**: When establishing new coding standards or best practices
- **DATABASE_CONVENTIONS.md**: When changing database schema or optimization strategies
- **PROJECT_OVERVIEW.md**: When updating dependencies or project structure

### Best Practices

1. **Keep examples current**: Update code examples when patterns change
2. **Be specific**: Provide concrete examples rather than abstract rules
3. **Test with Copilot**: Verify that Copilot understands the instructions
4. **Sync with code**: Ensure documentation matches actual implementation

## Contributing

When adding new features or patterns:

1. Update relevant documentation files
2. Add code examples demonstrating the pattern
3. Test that GitHub Copilot can generate code following the new pattern
4. Update this README if adding new documentation files

## Questions?

If GitHub Copilot provides suggestions that don't match the conventions:

1. Check if the instructions are clear and specific enough
2. Add more detailed examples to the relevant file
3. Verify the pattern exists in the actual codebase
4. Consider if the convention needs to be updated
